/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ByteQueue } from '../core/kvm/ByteQueue'
import { FrameBuffer } from '../core/kvm/FrameBuffer'

const flush = (fb: FrameBuffer): number[][] => {
  const rects: number[][] = []
  fb.flushDirty((x, y, w, h) =>
    rects.push([
      x,
      y,
      w,
      h
    ])
  )
  return rects
}

describe('KVM FrameBuffer', () => {
  it('starts fully dirty and opaque after resize', () => {
    const fb = new FrameBuffer()
    fb.resize(100, 70)
    expect(fb.data.length).toBe(100 * 70 * 4)
    expect(fb.data[3]).toBe(255)
    expect(flush(fb)).toEqual([[
        0,
        0,
        100,
        70
      ]])
    expect(fb.hasDirty).toBe(false)
    expect(flush(fb)).toEqual([])
  })

  it('blits tiles row by row and clips them to the screen', () => {
    const fb = new FrameBuffer()
    fb.resize(10, 10)
    flush(fb)
    const tile = new Uint32Array(64 * 64)
    tile.fill(7)
    fb.blit(tile, 8, 8, 4, 4)
    expect(fb.pixels[8 * 10 + 8]).toBe(7)
    expect(fb.pixels[9 * 10 + 9]).toBe(7)
    expect(fb.pixels[7 * 10 + 8]).not.toBe(7)
    expect(flush(fb)).toEqual([[
        8,
        8,
        2,
        2
      ]])
  })

  it('keeps distant tiles in the same band separate', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    fb.markDirty(0, 0, 64, 64)
    fb.markDirty(640, 0, 64, 64)
    expect(flush(fb)).toEqual([
      [
        0,
        0,
        64,
        64
      ],
      [
        640,
        0,
        64,
        64
      ]
    ])
  })

  it('merges nearby changes to avoid excessive canvas calls', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    fb.markDirty(0, 0, 64, 64)
    fb.markDirty(68, 0, 64, 64)
    expect(flush(fb)).toEqual([[
        0,
        0,
        132,
        64
      ]])
  })

  it('merges sparse columns vertically without joining the gaps', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    for (const y of [0, 64]) {
      for (const x of [
        0,
        640,
        1280,
        1856
      ]) fb.markDirty(x, y, 64, 64)
    }
    expect(flush(fb)).toEqual([
      [
        0,
        0,
        64,
        128
      ],
      [
        640,
        0,
        64,
        128
      ],
      [
        1280,
        0,
        64,
        128
      ],
      [
        1856,
        0,
        64,
        128
      ]
    ])
  })

  it('collapses overly fragmented bands and resets the fallback after flushing', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    for (const x of [
      0,
      320,
      640,
      960,
      1280,
      1800
    ]) fb.markDirty(x, 0, 64, 64)
    expect(flush(fb)).toEqual([[
        0,
        0,
        1864,
        64
      ]])
    fb.markDirty(0, 0, 64, 64)
    fb.markDirty(640, 0, 64, 64)
    expect(flush(fb)).toEqual([
      [
        0,
        0,
        64,
        64
      ],
      [
        640,
        0,
        64,
        64
      ]
    ])
  })

  it('keeps dense tiled redraws to a single clipped full-screen upload', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    for (let y = 0; y < fb.height; y += 64) {
      for (let x = 0; x < fb.width; x += 64) fb.markDirty(x, y, 64, 64)
    }
    expect(flush(fb)).toEqual([[
        0,
        0,
        1920,
        1080
      ]])
  })

  it('covers all clipped dirty pixels with a bounded number of uploads', () => {
    const fb = new FrameBuffer()
    fb.resize(257, 193)
    flush(fb)
    const dirty = new Uint8Array(fb.width * fb.height)
    let seed = 12345
    const random = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed
    }
    for (let index = 0; index < 120; index++) {
      const x = (random() % 330) - 40
      const y = (random() % 250) - 30
      const w = (random() % 64) + 1
      const h = (random() % 90) + 1
      fb.markDirty(x, y, w, h)
      for (let row = Math.max(y, 0); row < Math.min(y + h, fb.height); row++) {
        for (let column = Math.max(x, 0); column < Math.min(x + w, fb.width); column++)
          dirty[row * fb.width + column] = 1
      }
    }
    const rects = flush(fb)
    expect(rects.length).toBeLessThanOrEqual(4 * Math.ceil(fb.height / 64))
    for (const [
      x,
      y,
      w,
      h
    ] of rects) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(w).toBeGreaterThan(0)
      expect(h).toBeGreaterThan(0)
      expect(x + w).toBeLessThanOrEqual(fb.width)
      expect(y + h).toBeLessThanOrEqual(fb.height)
      for (let row = y; row < y + h; row++) dirty.fill(0, row * fb.width + x, row * fb.width + x + w)
    }
    expect(dirty.some((value) => value !== 0)).toBe(false)
    expect(flush(fb)).toEqual([])
  })

  it('merges adjacent bands with similar extents', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    fb.markDirty(0, 0, 640, 64)
    fb.markDirty(0, 64, 640, 64)
    expect(flush(fb)).toEqual([[
        0,
        0,
        640,
        128
      ]])
  })

  it('keeps distant or dissimilar areas apart', () => {
    const fb = new FrameBuffer()
    fb.resize(1920, 1080)
    flush(fb)
    fb.markDirty(0, 0, 64, 64)
    fb.markDirty(1800, 64, 64, 64) // adjacent band but far apart horizontally
    fb.markDirty(0, 640, 64, 64) // non adjacent band
    expect(flush(fb)).toEqual([
      [
        0,
        0,
        64,
        64
      ],
      [
        1800,
        64,
        64,
        64
      ],
      [
        0,
        640,
        64,
        64
      ]
    ])
  })

  it('rejoins a rectangle that spans two bands', () => {
    const fb = new FrameBuffer()
    fb.resize(200, 200)
    flush(fb)
    fb.markDirty(10, 60, 8, 8)
    expect(flush(fb)).toEqual([[
        10,
        60,
        8,
        8
      ]])
  })
})

describe('KVM ByteQueue', () => {
  it('copies incoming bytes by default', () => {
    const queue = new ByteQueue(4)
    const data = new Uint8Array([1, 2])
    queue.push(data)
    data[0] = 9
    expect([...queue.bytes]).toEqual([1, 2])
  })

  it('borrows a tail and joins only its unread bytes into reusable storage', () => {
    const queue = new ByteQueue(8, true)
    const data = new Uint8Array([
      0,
      1,
      2,
      3,
      4
    ]).subarray(1)
    queue.push(data)
    expect(queue.bytes.buffer).toBe(data.buffer)
    expect(queue.bytes.byteOffset).toBe(data.byteOffset)
    queue.consume(2)
    queue.push(new Uint8Array([5, 6]))
    expect([...queue.bytes]).toEqual([
      3,
      4,
      5,
      6
    ])
    expect(queue.bytes.buffer).not.toBe(data.buffer)
    const storage = queue.bytes.buffer
    queue.consume(4)
    queue.push(new Uint8Array([7]))
    queue.push(new Uint8Array([8]))
    expect([...queue.bytes]).toEqual([7, 8])
    expect(queue.bytes.buffer).toBe(storage)
    queue.clear()
    expect(queue.length).toBe(0)
    expect(queue.bytes.length).toBe(0)
  })

  it('preserves fragmented bytes while growing and compacting borrowed queues', () => {
    const queue = new ByteQueue(4, true)
    queue.push(
      new Uint8Array([
        1,
        2,
        3
      ])
    )
    queue.consume(1)
    queue.push(new Uint8Array([4, 5]))
    const storage = queue.bytes.buffer
    queue.consume(3)
    queue.push(new Uint8Array([6, 7]))
    expect([...queue.bytes]).toEqual([
      5,
      6,
      7
    ])
    expect(queue.bytes.buffer).toBe(storage)
    queue.push(
      new Uint8Array([
        8,
        9,
        10
      ])
    )
    expect([...queue.bytes]).toEqual([
      5,
      6,
      7,
      8,
      9,
      10
    ])
    queue.consume(queue.length)
    queue.push(new Uint8Array())
    expect(queue.length).toBe(0)
  })

  it('appends, consumes and compacts', () => {
    const q = new ByteQueue(4)
    q.push(
      new Uint8Array([
        1,
        2,
        3
      ])
    )
    q.consume(2)
    q.push(
      new Uint8Array([
        4,
        5,
        6
      ])
    )
    expect([...q.bytes]).toEqual([
      3,
      4,
      5,
      6
    ])
    q.push(
      new Uint8Array([
        7,
        8,
        9,
        10
      ])
    )
    expect([...q.bytes]).toEqual([
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ])
    q.consume(8)
    expect(q.length).toBe(0)
  })
})
