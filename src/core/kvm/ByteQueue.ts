/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * Growable FIFO of bytes received from the network. Incoming chunks are appended and
 * parsers read the unread region as one contiguous view, consuming what they handled.
 * With borrowChunks enabled, callers must not mutate incoming bytes until consumed or cleared.
 */
export class ByteQueue {
  private buffer: Uint8Array
  private borrowed: Uint8Array | null = null
  private start = 0
  private end = 0

  constructor(
    private readonly initialSize = 64 * 1024,
    private readonly borrowChunks = false
  ) {
    this.buffer = new Uint8Array(borrowChunks ? 0 : initialSize)
  }

  get length(): number {
    return this.end - this.start
  }

  /**
   * Contiguous view of the unread bytes. Only valid until the next push().
   */
  get bytes(): Uint8Array {
    return (this.borrowed ?? this.buffer).subarray(this.start, this.end)
  }

  push(data: Uint8Array): void {
    if (data.length === 0) return
    if (this.borrowChunks && this.length === 0) {
      this.borrowed = data
      this.start = 0
      this.end = data.length
      return
    }
    if (this.borrowed != null) {
      const unread = this.length
      const needed = unread + data.length
      if (needed > this.buffer.length) {
        this.buffer = new Uint8Array(Math.max(needed, this.initialSize, this.buffer.length * 2))
      }
      this.buffer.set(this.borrowed.subarray(this.start, this.end))
      this.borrowed = null
      this.start = 0
      this.end = unread
    }
    if (this.end + data.length > this.buffer.length) {
      const unread = this.length
      const needed = unread + data.length
      if (needed <= this.buffer.length) {
        this.buffer.copyWithin(0, this.start, this.end)
      } else {
        const grown = new Uint8Array(Math.max(needed, this.buffer.length * 2))
        grown.set(this.buffer.subarray(this.start, this.end))
        this.buffer = grown
      }
      this.start = 0
      this.end = unread
    }
    this.buffer.set(data, this.end)
    this.end += data.length
  }

  consume(count: number): void {
    this.start += count
    if (this.start >= this.end) {
      this.clear()
    }
  }

  clear(): void {
    this.borrowed = null
    this.start = 0
    this.end = 0
  }
}
