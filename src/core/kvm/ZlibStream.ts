/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import {
  ZStream,
  zlibInflate,
  zlibInflateInit,
  zlibInflateReset,
  Z_BUF_ERROR,
  Z_OK,
  Z_STREAM_END,
  Z_SYNC_FLUSH
} from 'pako'

const EMPTY = new Uint8Array(0)

/**
 * ZRLE carries one zlib stream for the whole session, sync-flushed after every rectangle.
 * This wraps pako's low level API so every rectangle inflates into one reused output buffer.
 */
export class ZlibStream {
  private readonly strm = new ZStream()
  private output = new Uint8Array(64 * 1024)

  constructor() {
    zlibInflateInit(this.strm)
  }

  reset(): void {
    zlibInflateReset(this.strm)
  }

  /**
   * Inflates the next part of the stream. The returned view is only valid until the next call.
   */
  inflate(input: Uint8Array): Uint8Array {
    const strm = this.strm
    strm.input = input
    strm.next_in = 0
    strm.avail_in = input.length
    let produced = 0
    for (;;) {
      strm.output = this.output
      strm.next_out = produced
      strm.avail_out = this.output.length - produced
      const status = zlibInflate(strm, Z_SYNC_FLUSH)
      produced = strm.next_out
      if (status !== Z_OK && status !== Z_STREAM_END && status !== Z_BUF_ERROR) {
        throw new Error(`Invalid deflate data: ${strm.msg !== '' ? strm.msg : status}`)
      }
      if (strm.avail_out > 0 || status === Z_STREAM_END) break
      const grown = new Uint8Array(this.output.length * 2)
      grown.set(this.output.subarray(0, produced))
      this.output = grown
    }
    strm.input = EMPTY // Don't hold on to the caller's buffer (shared, so no allocation per rectangle)
    return this.output.subarray(0, produced)
  }
}
