/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Canvas2DContext } from './CanvasRenderer'
import { KvmPipeline, type KvmPipelineConfig, type KvmPipelineOptions } from './KvmPipeline'
import { type ReceiverConfig, RedirectionReceiver, type WebSocketFactory } from './RedirectionReceiver'

export interface KvmSessionConfig extends ReceiverConfig, KvmPipelineConfig {}

export interface KvmSessionEvents {
  onConnectionStateChange: (state: number) => void
  onScreenSizeChange: (width: number, height: number) => void
  onError: (message: string) => void
}

export interface KvmSessionOptions extends KvmPipelineOptions {
  WebSocket?: WebSocketFactory
}

/**
 * One KVM connection with everything on a single thread: Receiver -> KvmPipeline.
 * Used when no KVM worker is available. Single use: create a new session for every connection.
 */
export class KvmSession {
  readonly receiver: RedirectionReceiver
  readonly pipeline: KvmPipeline

  constructor(
    ctx: Canvas2DContext,
    config: KvmSessionConfig,
    events: KvmSessionEvents,
    options: KvmSessionOptions = {}
  ) {
    this.receiver = new RedirectionReceiver(
      config,
      {
        onStateChange: (state) => {
          if (state === 0) this.pipeline.stop()
          events.onConnectionStateChange(state)
        },
        onStart: () => {
          this.pipeline.reset()
        },
        onData: (data) => {
          this.pipeline.push(data)
        }
      },
      options.WebSocket
    )

    this.pipeline = new KvmPipeline(
      ctx,
      config,
      {
        send: (data) => {
          this.receiver.send(data)
        },
        onResize: (width, height) => {
          events.onScreenSizeChange(width, height)
        },
        onReady: () => {},
        onError: (message) => {
          this.receiver.stop()
          events.onError(message)
        }
      },
      options
    )
  }

  start(): void {
    this.receiver.start()
  }

  stop(): void {
    this.receiver.stop()
  }

  /** True once the RFB handshake is done and input may be sent */
  get ready(): boolean {
    return this.pipeline.ready
  }

  /** Keyboard/mouse RFB messages. Dropped (returns false) until the RFB handshake is done. */
  sendInput(data: Uint8Array): boolean {
    if (!this.pipeline.ready) return false
    this.receiver.send(data)
    return true
  }

  setVisible(visible: boolean): void {
    this.pipeline.setVisible(visible)
  }
}
