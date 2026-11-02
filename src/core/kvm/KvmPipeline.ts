/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { CanvasRenderer, type Canvas2DContext, type IFrameRenderer } from './CanvasRenderer'
import { FrameRequester } from './FrameRequester'
import { type BytesPerPixel } from './PixelFormat'
import { RfbDecoder } from './RfbDecoder'

export interface KvmPipelineConfig {
  bpp: BytesPerPixel
  /** Delay before refilling request slots after an update completes decoding. Default 0. */
  frameDelayMs?: number
  /** Maximum outstanding framebuffer update requests. Default 1; the viewer uses 2. */
  requestDepth?: number
  /** The owner schedules framebuffer update requests itself, driven by onFrameComplete */
  externalRequests?: boolean
}

export interface KvmPipelineEvents {
  /** RFB bytes for the device: protocol replies and frame requests */
  send: (data: Uint8Array) => void
  onResize: (width: number, height: number) => void
  /** The RFB handshake is done; input may be sent from now on */
  onReady: () => void
  /** Every rectangle of a framebuffer update has been decoded */
  onFrameComplete?: () => void
  onError: (message: string) => void
}

export interface KvmPipelineOptions {
  createRenderer?: (decoder: RfbDecoder) => IFrameRenderer
}

/**
 * The frame side of the KVM pipeline: Decoder -> Renderer, with the FrameRequester driving updates.
 * Transport agnostic, so it can run in the KVM worker while the socket and input stay on the main
 * thread. Single use: create a new pipeline for every connection.
 */
export class KvmPipeline {
  readonly decoder: RfbDecoder
  readonly renderer: IFrameRenderer
  readonly requester: FrameRequester | null
  private stopped = false

  constructor(
    ctx: Canvas2DContext,
    config: KvmPipelineConfig,
    private readonly events: KvmPipelineEvents,
    options: KvmPipelineOptions = {}
  ) {
    this.requester =
      config.externalRequests === true
        ? null
        : new FrameRequester(
            (data) => {
              events.send(data)
            },
            config.frameDelayMs ?? 0,
            undefined,
            config.requestDepth ?? 1
          )

    this.decoder = new RfbDecoder(
      {
        send: (data) => {
          events.send(data)
        },
        onResize: (width, height) => {
          this.renderer.resize()
          this.requester?.onDesktopResize(width, height)
          events.onResize(width, height)
        },
        onReady: (width, height) => {
          this.requester?.start(width, height)
          events.onReady()
        },
        onFrameComplete: () => {
          this.requester?.onUpdateComplete()
          events.onFrameComplete?.()
          this.renderer.present()
        }
      },
      config.bpp
    )

    this.renderer = options.createRenderer?.(this.decoder) ?? new CanvasRenderer(ctx, this.decoder.frameBuffer)
  }

  get ready(): boolean {
    return !this.stopped && this.decoder.ready
  }

  /** Feeds RFB bytes from the device. A decode error stops the pipeline and is reported. */
  push(data: Uint8Array): void {
    if (this.stopped) return
    try {
      this.decoder.push(data)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`KVM decode error: ${message}`)
      this.stop()
      this.events.onError(message)
    }
  }

  /** A new redirection session starts the RFB protocol over */
  reset(): void {
    this.decoder.reset()
  }

  setVisible(visible: boolean): void {
    this.requester?.setHidden(!visible)
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    this.requester?.stop()
    this.renderer.clear()
    this.renderer.dispose()
  }
}
