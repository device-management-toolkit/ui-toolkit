/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * Decides when to ask the device for the next frame (RFB FramebufferUpdateRequest).
 *
 * Pull mode keeps up to `depth` requests outstanding and frees a slot each time an update has been
 * fully decoded (including empty updates), without waiting for presentation. Headers alone never
 * free a slot. While the view is hidden the depth drops to one and requests slow down to
 * `hiddenIntervalMs` instead of stopping: the relay drops connections that see no device data for
 * 30 seconds.
 */
export class FrameRequester {
  private width = 0
  private height = 0
  private active = false
  private hidden = false
  private outstanding = 0
  private fullUpdate = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly send: (data: Uint8Array) => void,
    private readonly frameDelayMs = 0,
    private readonly hiddenIntervalMs = 1000,
    private readonly depth = 1
  ) {
    if (!Number.isInteger(depth) || depth < 1) throw new Error('KVM request depth must be a positive integer')
  }

  start(width: number, height: number): void {
    if (this.active) return
    this.setSize(width, height)
    this.active = true
    this.fill()
  }

  setSize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  /** Request the full resized screen at the next available request boundary. */
  onDesktopResize(width: number, height: number): void {
    this.setSize(width, height)
    if (!this.active) return
    this.fullUpdate = true
    if (this.outstanding === 0) {
      this.clearTimer()
      this.request(false)
    }
  }

  /** An update has been fully decoded; frees its request slot */
  onUpdateComplete(): void {
    if (!this.active || this.outstanding === 0) return
    this.outstanding--
    this.clearTimer()
    const delay = this.hidden ? Math.max(this.frameDelayMs, this.hiddenIntervalMs) : this.frameDelayMs
    if (delay > 0) {
      this.timer = setTimeout(() => {
        this.timer = null
        if (this.active) this.fill()
      }, delay)
    } else {
      this.fill()
    }
  }

  setHidden(hidden: boolean): void {
    const wasHidden = this.hidden
    this.hidden = hidden
    if (wasHidden && !hidden) {
      this.clearTimer()
      if (this.active) this.fill()
    }
  }

  stop(): void {
    this.active = false
    this.outstanding = 0
    this.fullUpdate = false
    this.clearTimer()
  }

  private request(incremental: boolean): void {
    if (this.outstanding >= this.limit) return
    incremental = incremental && !this.fullUpdate
    this.fullUpdate = false
    this.outstanding++
    const w = this.width
    const h = this.height
    this.send(
      new Uint8Array([
        3,
        incremental ? 1 : 0,
        0,
        0,
        0,
        0,
        (w >> 8) & 0xff,
        w & 0xff,
        (h >> 8) & 0xff,
        h & 0xff
      ])
    )
  }

  private get limit(): number {
    return this.hidden ? 1 : this.depth
  }

  private fill(): void {
    while (this.active && this.outstanding < this.limit) this.request(true)
  }

  private clearTimer(): void {
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
