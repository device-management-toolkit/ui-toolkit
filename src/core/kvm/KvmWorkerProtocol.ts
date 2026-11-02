/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type KvmPipelineConfig } from './KvmPipeline'

/**
 * The socket stays on the main thread so input reaches it without queuing behind frame decoding.
 * Incoming RFB chunks transfer directly to the worker, which owns parsing and decoding.
 * The worker signals completed updates; main owns framebuffer request scheduling and construction.
 * Protocol replies return to the main-thread socket; decoded pixels never leave the worker.
 *
 * `session` tags every message so late events from a stopped pipeline are ignored.
 */

/** Main thread -> KVM worker */
export type KvmWorkerRequest =
  | { type: 'init'; canvas: OffscreenCanvas }
  | { type: 'start'; session: number; config: KvmPipelineConfig }
  | { type: 'reset'; session: number }
  | { type: 'data'; session: number; buffer: ArrayBuffer; offset: number; length: number }
  | { type: 'stop'; session: number }

/** KVM worker -> main thread */
export type KvmWorkerEvent =
  | { type: 'send'; session: number; data: Uint8Array }
  | { type: 'ready'; session: number }
  | { type: 'frame-complete'; session: number }
  | { type: 'resize'; session: number; width: number; height: number }
  | { type: 'error'; session: number; message: string }
