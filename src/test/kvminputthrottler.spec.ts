/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { DEFAULT_MOVE_INTERVAL_MS, InputThrottler } from '../core/kvm/InputThrottler'

const move = (mask: number, x: number): number[] => [
  5,
  mask,
  0,
  x,
  0,
  0
]
const key = (down: number, k: number): number[] => [
  4,
  down,
  0,
  0,
  0,
  0,
  0,
  k
]

describe('KVM InputThrottler', () => {
  let sent: number[][]
  let throttler: InputThrottler

  beforeEach(() => {
    vi.useFakeTimers()
    sent = []
    throttler = new InputThrottler((d) => sent.push([...d]), 100)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const push = (...msgs: number[][]): void => {
    for (const m of msgs) throttler.push(new Uint8Array(m))
  }

  it('throttles moves at ~30 Hz by default', () => {
    expect(DEFAULT_MOVE_INTERVAL_MS).toBe(33)
    expect(new InputThrottler(() => {}).intervalMs).toBe(33)
  })

  it('sends key events immediately, never batched', () => {
    push(key(1, 65), key(0, 65), key(1, 66))
    expect(sent).toEqual([
      key(1, 65),
      key(0, 65),
      key(1, 66)
    ])
  })

  it('sends the first move after a quiet period immediately', () => {
    push(move(0, 1))
    expect(sent).toEqual([move(0, 1)])
  })

  it('collapses moves within the window to the latest position', () => {
    push(move(0, 1), move(0, 2), move(0, 3), move(0, 4))
    expect(sent).toEqual([move(0, 1)])
    vi.advanceTimersByTime(99)
    expect(sent).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sent).toEqual([move(0, 1), move(0, 4)])
  })

  it('sends button presses and releases immediately and drops the held move', () => {
    push(move(0, 1), move(0, 2), move(1, 3))
    expect(sent).toEqual([move(0, 1), move(1, 3)])
    push(move(1, 4), move(0, 5))
    expect(sent).toEqual([
      move(0, 1),
      move(1, 3),
      move(0, 5)
    ])
    vi.advanceTimersByTime(100)
    expect(sent).toEqual([
      move(0, 1),
      move(1, 3),
      move(0, 5)
    ])
  })

  it('sends wheel press/release pairs immediately', () => {
    push(move(0, 1), move(0, 2), move(8, 2), move(0, 2), move(16, 2), move(0, 2))
    expect(sent).toEqual([
      move(0, 1),
      move(8, 2),
      move(0, 2),
      move(16, 2),
      move(0, 2)
    ])
  })

  it('sends key events immediately while a move is held, then the move on schedule', () => {
    push(move(0, 1), move(0, 2), key(1, 65))
    expect(sent).toEqual([move(0, 1), key(1, 65)])
    vi.advanceTimersByTime(100)
    expect(sent).toEqual([
      move(0, 1),
      key(1, 65),
      move(0, 2)
    ])
  })

  it('limits moves to one per window under continuous movement', () => {
    for (let t = 0; t < 1000; t += 5) {
      push(move(0, t % 200))
      vi.advanceTimersByTime(5)
    }
    vi.advanceTimersByTime(100)
    expect(sent.length).toBeGreaterThanOrEqual(10)
    expect(sent.length).toBeLessThanOrEqual(11)
  })

  it('goes quiet after an empty window and leads again', () => {
    push(move(0, 1))
    vi.advanceTimersByTime(200)
    push(move(0, 2))
    expect(sent).toEqual([move(0, 1), move(0, 2)])
  })

  it('drops the held move on clear', () => {
    push(move(0, 1), move(0, 2))
    throttler.clear()
    vi.advanceTimersByTime(200)
    expect(sent).toEqual([move(0, 1)])
  })

  it('passes moves straight through with a 0 interval', () => {
    const direct: number[][] = []
    const t = new InputThrottler((d) => direct.push([...d]), 0)
    t.push(new Uint8Array(move(0, 1)))
    t.push(new Uint8Array(move(0, 2)))
    expect(direct).toEqual([move(0, 1), move(0, 2)])
  })
})
