/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ByteQueue } from '../core/kvm/ByteQueue'
import { getPixelLut } from '../core/kvm/PixelFormat'
import { RfbDecoder, type RfbDecoderEvents } from '../core/kvm/RfbDecoder'
import {
  frameUpdate,
  rectHeader,
  rfbServerHandshake,
  rgbaAt,
  u16,
  u32,
  zrleRect,
  zrleStream
} from './helper/kvmTestHelpers'

interface Recorder {
  events: RfbDecoderEvents
  sent: number[][]
  resizes: number[][]
  ready: number[][]
  frames: number
}

const recorder = (): Recorder => {
  const r: Recorder = {
    sent: [],
    resizes: [],
    ready: [],
    frames: 0,
    events: {
      send: (d) => r.sent.push([...d]),
      onResize: (w, h) => r.resizes.push([w, h]),
      onReady: (w, h) => r.ready.push([w, h]),
      onFrameComplete: () => r.frames++
    }
  }
  return r
}

const pixel = (lut: Uint32Array, v: number): number[] => [...new Uint8Array(new Uint32Array([lut[v]]).buffer)]

const readyDecoder = (bpp: 1 | 2 = 1, width = 128, height = 128): { decoder: RfbDecoder; rec: Recorder } => {
  const rec = recorder()
  const decoder = new RfbDecoder(rec.events, bpp)
  decoder.push(new Uint8Array(rfbServerHandshake(width, height)))
  rec.sent = []
  return { decoder, rec }
}

describe('KVM RfbDecoder handshake', () => {
  it('answers the RFB handshake and configures encodings and pixel format', () => {
    const rec = recorder()
    const decoder = new RfbDecoder(rec.events, 1)
    expect(decoder.ready).toBe(false)
    decoder.push(new Uint8Array(rfbServerHandshake(1024, 768)))

    expect(String.fromCharCode(...rec.sent[0])).toBe('RFB 003.008\n')
    expect(rec.sent[1]).toEqual([1]) // None security
    expect(rec.sent[2]).toEqual([1]) // shared desktop
    expect(rec.sent[3]).toEqual([
      2,
      0,
      ...u16(4),
      ...u32(16),
      ...u32(0),
      ...u32(1092),
      ...u32(0xffffff21)
    ])
    expect(rec.sent[4]).toEqual([
      0,
      0,
      0,
      0,
      8,
      8,
      0,
      1,
      0,
      7,
      0,
      7,
      0,
      3,
      5,
      2,
      0,
      0,
      0,
      0
    ])
    expect(rec.resizes).toEqual([[1024, 768]])
    expect(rec.ready).toEqual([[1024, 768]])
    expect(decoder.ready).toBe(true)
    expect(decoder.frameBuffer.width).toBe(1024)
  })

  it('does not change the pixel format for 16 bit color', () => {
    const rec = recorder()
    new RfbDecoder(rec.events, 2).push(new Uint8Array(rfbServerHandshake(10, 10)))
    expect(rec.sent.length).toBe(4)
  })

  it('rejects a failed security result', () => {
    const rec = recorder()
    const decoder = new RfbDecoder(rec.events, 1)
    const bytes = rfbServerHandshake(10, 10)
    bytes[15] = 1
    expect(() => {
      decoder.push(new Uint8Array(bytes))
    }).toThrow('Security response not None')
  })
})

describe('KVM RfbDecoder framebuffer updates', () => {
  it('queues only the unfinished rectangle, not the complete update following it', () => {
    const { decoder, rec } = readyDecoder()
    const small = frameUpdate([[
        ...rectHeader(0, 0, 2, 2, 0),
        1,
        2,
        3,
        4
      ]])
    const large = frameUpdate([[...rectHeader(64, 64, 64, 64, 0), ...new Array(4096).fill(7)]])
    const push = vi.spyOn(ByteQueue.prototype, 'push')
    decoder.push(new Uint8Array(small.slice(0, 17)))
    decoder.push(new Uint8Array([...small.slice(17), ...large]))
    const lengths = push.mock.calls.map(([bytes]) => bytes.length)
    push.mockRestore()
    expect(lengths).toEqual([13, 3])
    expect(rec.frames).toBe(2)
    expect(rgbaAt(decoder.frameBuffer.data, 128, 1, 1)).toEqual(pixel(getPixelLut(1), 4))
    expect(rgbaAt(decoder.frameBuffer.data, 128, 127, 127)).toEqual(pixel(getPixelLut(1), 7))
  })

  it('decodes RAW rectangles into the frame buffer', () => {
    const { decoder, rec } = readyDecoder()
    const blit = vi.spyOn(decoder.frameBuffer, 'blit')
    decoder.push(
      new Uint8Array(
        frameUpdate([[
            ...rectHeader(2, 3, 2, 1, 0),
            0xe0,
            0x1c
          ]])
      )
    )
    const fb = decoder.frameBuffer
    const lut = getPixelLut(1)
    expect(rgbaAt(fb.data, fb.width, 2, 3)).toEqual(pixel(lut, 0xe0))
    expect(rgbaAt(fb.data, fb.width, 3, 3)).toEqual(pixel(lut, 0x1c))
    expect(rec.frames).toBe(1)
    expect(blit).not.toHaveBeenCalled()
  })

  it('keeps the clipped-tile copy path at framebuffer edges', () => {
    const { decoder } = readyDecoder(1, 3, 3)
    const blit = vi.spyOn(decoder.frameBuffer, 'blit')
    decoder.push(
      new Uint8Array(
        frameUpdate([[
            ...rectHeader(2, 2, 2, 2, 0),
            1,
            2,
            3,
            4
          ]])
      )
    )
    expect(blit).toHaveBeenCalledOnce()
    expect(rgbaAt(decoder.frameBuffer.data, 3, 2, 2)).toEqual(pixel(getPixelLut(1), 1))
  })

  it('inflates ZRLE rectangles from one continuous zlib stream', () => {
    const { decoder, rec } = readyDecoder(2)
    const blit = vi.spyOn(decoder.frameBuffer, 'blit')
    const [a, b] = zrleStream([
      [
        1,
        0x00,
        0xf8
      ], // solid red
      [
        1,
        0x1f,
        0x00
      ] // solid blue
    ])
    decoder.push(new Uint8Array(frameUpdate([zrleRect(0, 0, 64, 64, a)])))
    decoder.push(new Uint8Array(frameUpdate([zrleRect(64, 64, 64, 64, b)])))
    const fb = decoder.frameBuffer
    const lut = getPixelLut(2)
    expect(rgbaAt(fb.data, fb.width, 63, 63)).toEqual(pixel(lut, 0xf800))
    expect(rgbaAt(fb.data, fb.width, 64, 64)).toEqual(pixel(lut, 0x001f))
    expect(rec.frames).toBe(2)
    expect(blit).not.toHaveBeenCalled()
  })

  it('decodes stored (uncompressed) ZRLE blocks in place', () => {
    const { decoder } = readyDecoder()
    const tile = [1, 0xe0] // solid
    const data = new Uint8Array([
      0,
      ...[tile.length & 0xff, tile.length >> 8],
      0xff,
      0xff,
      ...tile
    ])
    decoder.push(new Uint8Array(frameUpdate([zrleRect(0, 0, 4, 4, data)])))
    const fb = decoder.frameBuffer
    expect(rgbaAt(fb.data, fb.width, 3, 3)).toEqual(pixel(getPixelLut(1), 0xe0))
  })

  it('produces the same frame when data arrives one byte at a time', () => {
    const [z] = zrleStream([[
        128,
        7,
        100,
        9,
        255,
        200
      ]])
    const stream = [
      ...rfbServerHandshake(128, 128),
      ...frameUpdate([
        zrleRect(0, 0, 64, 64, z),
        [
          ...rectHeader(64, 0, 2, 2, 0),
          1,
          2,
          3,
          4
        ]
      ])
    ]
    const bulk = new RfbDecoder(recorder().events, 1)
    bulk.push(new Uint8Array(stream))
    const rec = recorder()
    const trickle = new RfbDecoder(rec.events, 1)
    for (const byte of stream) trickle.push(new Uint8Array([byte]))
    expect(rec.frames).toBe(1)
    expect(trickle.frameBuffer.data).toEqual(bulk.frameBuffer.data)
  })

  it('handles several frames and messages in one chunk', () => {
    const { decoder, rec } = readyDecoder()
    decoder.push(
      new Uint8Array([
        ...frameUpdate([[...rectHeader(0, 0, 1, 1, 0), 1]]),
        2, // bell
        3,
        0,
        0,
        0,
        ...u32(2),
        65,
        66, // server cut text
        ...frameUpdate([[...rectHeader(1, 0, 1, 1, 0), 2]])
      ])
    )
    expect(rec.frames).toBe(2)
  })

  it('completes empty updates immediately', () => {
    const { decoder, rec } = readyDecoder()
    decoder.push(new Uint8Array(frameUpdate([])))
    expect(rec.frames).toBe(1)
  })

  it('resizes on the desktop size pseudo-encoding', () => {
    const { decoder, rec } = readyDecoder()
    decoder.push(new Uint8Array(frameUpdate([rectHeader(0, 0, 800, 600, 0xffffff21)])))
    expect(rec.resizes).toEqual([
      [128, 128],
      [800, 600]
    ])
    expect(decoder.frameBuffer.width).toBe(800)
    expect(rec.frames).toBe(1)
  })

  it('rejects invalid tiles and unknown encodings or messages', () => {
    expect(() => {
      readyDecoder().decoder.push(new Uint8Array(frameUpdate([rectHeader(0, 0, 65, 1, 0)])))
    }).toThrow('Invalid tile size')
    expect(() => {
      readyDecoder().decoder.push(new Uint8Array(frameUpdate([rectHeader(0, 0, 1, 1, 5)])))
    }).toThrow('Unknown encoding')
    expect(() => {
      readyDecoder().decoder.push(new Uint8Array([9]))
    }).toThrow('Unknown RFB message type')
  })

  it('restarts the RFB handshake after reset', () => {
    const { decoder, rec } = readyDecoder()
    decoder.reset()
    expect(decoder.ready).toBe(false)
    decoder.push(new Uint8Array(rfbServerHandshake(64, 64)))
    expect(decoder.ready).toBe(true)
    expect(String.fromCharCode(...rec.sent[0])).toBe('RFB 003.008\n')
  })
})
