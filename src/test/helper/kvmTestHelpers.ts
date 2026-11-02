/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Deflate, Z_SYNC_FLUSH } from 'pako'

/**
 * Minimal WebSocket stand-in that records sent frames and lets tests push server data.
 */
export class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  readyState = 0
  binaryType = 'blob'
  sent: Uint8Array[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: ArrayBuffer | string }) => void) | null = null
  onclose: (() => void) | null = null
  closed = false

  constructor(
    readonly url: string,
    readonly protocols?: string | string[]
  ) {
    FakeWebSocket.instances.push(this)
  }

  static get last(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
  }

  send(data: Uint8Array): void {
    this.sent.push(new Uint8Array(data))
  }

  close(): void {
    this.closed = true
    this.readyState = 3
  }

  open(): void {
    this.readyState = 1
    this.onopen?.()
  }

  receive(...chunks: (number[] | Uint8Array)[]): void {
    for (const c of chunks) this.onmessage?.({ data: new Uint8Array(c).buffer })
  }
}

/** Redirection handshake replies that bring a receiver to the RFB stage (digest auth, relay does the math) */
export const redirectionHandshake = {
  startReply: [
    0x11,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  authQueryReply: [
    0x14,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    4
  ],
  authSuccess: [
    0x14,
    0,
    0,
    0,
    4,
    0,
    0,
    0,
    0
  ],
  kvmStarted: [
    0x41,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ]
}

export function u16(v: number): number[] {
  return [(v >> 8) & 0xff, v & 0xff]
}

export function u32(v: number): number[] {
  return [
    (v >>> 24) & 0xff,
    (v >> 16) & 0xff,
    (v >> 8) & 0xff,
    v & 0xff
  ]
}

/** RFB server side of the handshake up to and including ServerInit */
export function rfbServerHandshake(width: number, height: number): number[] {
  const name = [...'AMT'].map((c) => c.charCodeAt(0))
  return [
    ...[...'RFB 003.008\n'].map((c) => c.charCodeAt(0)),
    1,
    1, // one security type: None
    ...u32(0), // security result OK
    ...u16(width),
    ...u16(height),
    ...new Array(16).fill(0), // pixel format
    ...u32(name.length),
    ...name
  ]
}

export function rectHeader(x: number, y: number, w: number, h: number, encoding: number): number[] {
  return [
    ...u16(x),
    ...u16(y),
    ...u16(w),
    ...u16(h),
    ...u32(encoding)
  ]
}

export function frameUpdate(rects: number[][]): number[] {
  return [
    0,
    0,
    ...u16(rects.length),
    ...rects.flat()
  ]
}

/**
 * Produces the per rectangle zlib chunks of one continuous sync-flushed stream, like AMT's ZRLE.
 */
export function zrleStream(tiles: number[][]): Uint8Array[] {
  const deflate = new Deflate()
  let current: Uint8Array[] = []
  deflate.onData = (chunk: Uint8Array) => {
    current.push(chunk.slice())
  }
  return tiles.map((tile) => {
    current = []
    deflate.push(new Uint8Array(tile), Z_SYNC_FLUSH)
    const out = new Uint8Array(current.reduce((n, c) => n + c.length, 0))
    let o = 0
    for (const c of current) {
      out.set(c, o)
      o += c.length
    }
    return out
  })
}

export function zrleRect(x: number, y: number, w: number, h: number, data: Uint8Array): number[] {
  return [
    ...rectHeader(x, y, w, h, 16),
    ...u32(data.length),
    ...data
  ]
}

/** Reads the RGBA bytes of one frame buffer pixel */
export function rgbaAt(data: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const i = (y * width + x) * 4
  return [
    data[i],
    data[i + 1],
    data[i + 2],
    data[i + 3]
  ]
}

export function last<T>(items: T[]): T {
  return items[items.length - 1]
}
