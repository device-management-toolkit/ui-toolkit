/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type Canvas2DContext } from './CanvasRenderer'
import { KvmPipeline, type KvmPipelineOptions } from './KvmPipeline'
import { type KvmWorkerEvent, type KvmWorkerRequest } from './KvmWorkerProtocol'

export interface WorkerScope {
  postMessage: (message: KvmWorkerEvent, transfer?: Transferable[]) => void
  onmessage: ((e: MessageEvent<KvmWorkerRequest>) => void) | null
}

export type KvmWorkerOptions = KvmPipelineOptions

/** Owns RFB parsing, pixel decoding and rendering; the socket and frame requests stay on main. */
export class KvmWorkerHost {
  private ctx: Canvas2DContext | null = null
  private pipeline: KvmPipeline | null = null
  private session = 0

  constructor(
    private readonly scope: WorkerScope,
    private readonly pipelineOptions: KvmWorkerOptions = {}
  ) {
    scope.onmessage = (e) => {
      this.handle(e.data)
    }
  }

  handle(msg: KvmWorkerRequest): void {
    switch (msg.type) {
      case 'init':
        this.ctx = msg.canvas.getContext('2d')
        break
      case 'start':
        this.start(msg)
        break
      case 'reset':
        if (msg.session === this.session) this.pipeline?.reset()
        break
      case 'data':
        if (msg.session === this.session) this.pipeline?.push(new Uint8Array(msg.buffer, msg.offset, msg.length))
        break
      case 'stop':
        if (msg.session === this.session) this.stop()
        break
    }
  }

  private start(msg: Extract<KvmWorkerRequest, { type: 'start' }>): void {
    const session = msg.session
    this.stop()
    this.session = session
    if (this.ctx == null) {
      this.scope.postMessage({ type: 'error', session, message: 'KVM worker has no canvas' })
      return
    }
    this.pipeline = new KvmPipeline(
      this.ctx,
      { ...msg.config, externalRequests: true },
      {
        send: (data) => this.scope.postMessage({ type: 'send', session, data }),
        onResize: (width, height) => this.scope.postMessage({ type: 'resize', session, width, height }),
        onReady: () => this.scope.postMessage({ type: 'ready', session }),
        onFrameComplete: () => this.scope.postMessage({ type: 'frame-complete', session }),
        onError: (message) => this.scope.postMessage({ type: 'error', session, message })
      },
      this.pipelineOptions
    )
  }

  private stop(): void {
    this.pipeline?.stop()
    this.pipeline = null
  }
}
