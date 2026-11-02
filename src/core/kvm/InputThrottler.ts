/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

const RFB_POINTER_EVENT = 5

/** ~30 Hz, the rate at which the AMT capture engine produces frames; 100 ms made the remote cursor trail */
export const DEFAULT_MOVE_INTERVAL_MS = 33

/**
 * Rate limits pointer moves; every other keyboard/mouse RFB message is written immediately.
 *
 * A pointer event is a plain move when its button mask matches the previous pointer event.
 * The first move after a quiet period goes out at once; moves within the next `intervalMs` are
 * collapsed to the latest position, which is sent when the window ends. Key events, button
 * presses/releases and wheel steps are never delayed. A button event carries its own position,
 * so it discards a held move instead of letting an older position follow it.
 */
export class InputThrottler {
  private pendingMove: Uint8Array | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastMask = 0 // No buttons are held when a session starts

  constructor(
    private readonly send: (data: Uint8Array) => void,
    readonly intervalMs = DEFAULT_MOVE_INTERVAL_MS
  ) {}

  push(data: Uint8Array): void {
    const isPointer = data[0] === RFB_POINTER_EVENT
    const isMove = isPointer && data[1] === this.lastMask
    if (isPointer) this.lastMask = data[1]

    if (!isMove) {
      if (isPointer) this.pendingMove = null
      this.send(data)
      return
    }
    if (this.intervalMs <= 0) {
      this.send(data)
      return
    }
    if (this.timer == null) {
      this.send(data)
      this.startWindow()
      return
    }
    this.pendingMove = data
  }

  /** Drops a held move, e.g. when the session ends */
  clear(): void {
    this.pendingMove = null
    this.lastMask = 0
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private startWindow(): void {
    this.timer = setTimeout(() => {
      this.timer = null
      const move = this.pendingMove
      if (move == null) return
      this.pendingMove = null
      this.send(move)
      this.startWindow()
    }, this.intervalMs)
  }
}
