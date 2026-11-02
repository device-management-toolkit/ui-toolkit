/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type FrameBuffer } from './FrameBuffer'

export type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Stage 3 of the KVM pipeline, as an interface so other renderers (e.g. WebGL) can plug in.
 */
export interface IFrameRenderer {
  /** The frame buffer was reallocated with a new size */
  resize: () => void
  /** A frame update is complete; draw the changed areas */
  present: () => void
  clear: () => void
  dispose: () => void
}

/**
 * Draws the frame buffer to a 2D canvas (regular or OffscreenCanvas). The ImageData wraps the
 * frame buffer's pixel storage directly, so only dirty regions are uploaded.
 *
 * A frame is drawn as soon as its update is fully decoded, before any tile of the next update is
 * decoded, so input feedback shows up without waiting for an animation frame and the canvas
 * never shows a partially decoded update.
 */
export class CanvasRenderer implements IFrameRenderer {
  private image: ImageData | null = null

  constructor(
    private readonly ctx: Canvas2DContext,
    private readonly frameBuffer: FrameBuffer
  ) {}

  resize(): void {
    const fb = this.frameBuffer
    this.ctx.canvas.width = fb.width
    this.ctx.canvas.height = fb.height
    this.image = fb.width > 0 && fb.height > 0 ? new ImageData(fb.data, fb.width, fb.height) : null
  }

  present(): void {
    const image = this.image
    if (image == null) return
    this.frameBuffer.flushDirty((x, y, w, h) => {
      this.ctx.putImageData(image, 0, 0, x, y, w, h)
    })
  }

  clear(): void {
    const canvas = this.ctx.canvas
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  dispose(): void {
    this.image = null
  }
}
