/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ByteQueue } from './ByteQueue'
import { FrameBuffer } from './FrameBuffer'
import { type BytesPerPixel, getPixelLut } from './PixelFormat'
import { decodeRawPixels, decodeZrleTile, MAX_TILE_SIZE } from './TileDecoder'
import { ZlibStream } from './ZlibStream'

export interface RfbRectangle {
  x: number
  y: number
  width: number
  height: number
  encoding: number
  data: Uint8Array
}

export interface RfbDecoderEvents {
  /** Client protocol replies (version, security, encodings, pixel format) */
  send: (data: Uint8Array) => void
  /** Screen size known or changed. The frame buffer is already resized. */
  onResize: (width: number, height: number) => void
  /** Server init done, frame updates can be requested */
  onReady: (width: number, height: number) => void
  /** Every rectangle of the current FramebufferUpdate is in the frame buffer */
  onFrameComplete: () => void
  onServerCutText?: (data: Uint8Array) => void
}

enum RfbState {
  ProtocolVersion,
  SecurityTypes,
  SecurityResult,
  ServerInit,
  Messages,
  Rectangles
}

const ENCODING_RAW = 0
const ENCODING_ZRLE = 16
const ENCODING_KVM_DATA = 1092
const ENCODING_DESKTOP_SIZE = 0xffffff21

const CLIENT_VERSION = new Uint8Array([...'RFB 003.008\n'].map((c) => c.charCodeAt(0)))

/**
 * Stage 2 of the KVM pipeline: parses the RFB byte stream coming from the receiver and turns
 * framebuffer updates into RGBA pixels inside `frameBuffer`. It owns no socket and no canvas.
 */
export class RfbDecoder {
  private readonly pixels: RfbPixelDecoder
  private readonly queue = new ByteQueue(64 * 1024, true)
  private state = RfbState.ProtocolVersion
  private rectsRemaining = 0
  private missingBytes = 0

  constructor(
    private readonly events: RfbDecoderEvents,
    readonly bpp: BytesPerPixel
  ) {
    this.pixels = new RfbPixelDecoder(bpp)
  }

  get frameBuffer(): FrameBuffer {
    return this.pixels.frameBuffer
  }

  /** True once the RFB handshake is done and input events may be sent. */
  get ready(): boolean {
    return this.state >= RfbState.Messages
  }

  reset(): void {
    this.queue.clear()
    this.pixels.reset()
    this.state = RfbState.ProtocolVersion
    this.rectsRemaining = 0
  }

  push(data: Uint8Array): void {
    let offset = 0
    while (this.queue.length > 0) {
      this.queue.consume(this.parse(this.queue.bytes))
      if (this.queue.length === 0) break
      if (offset === data.length) return
      const count = Math.min(this.missingBytes, data.length - offset)
      this.queue.push(data.subarray(offset, offset + count))
      offset += count
    }
    const remaining = data.subarray(offset)
    const pos = this.parse(remaining)
    if (pos < remaining.length) this.queue.push(remaining.subarray(pos))
  }

  private needs(avail: number, size: number): boolean {
    this.missingBytes = Math.max(0, size - avail)
    return this.missingBytes > 0
  }

  private parse(bytes: Uint8Array): number {
    let pos = 0
    while (pos < bytes.length) {
      const consumed = this.step(bytes, pos, bytes.length - pos)
      if (consumed === 0) break
      pos += consumed
    }
    return pos
  }

  /**
   * Handles one protocol unit at `pos`. Returns the bytes consumed, or 0 if more data is needed.
   */
  private step(d: Uint8Array, pos: number, avail: number): number {
    switch (this.state) {
      case RfbState.ProtocolVersion:
        if (this.needs(avail, 12)) return 0
        this.state = RfbState.SecurityTypes
        this.events.send(CLIENT_VERSION)
        return 12

      case RfbState.SecurityTypes: {
        const size = d[pos] + 1
        if (this.needs(avail, size)) return 0
        this.state = RfbState.SecurityResult
        // "None" security, the redirection session is already authenticated
        this.events.send(new Uint8Array([1]))
        return size
      }

      case RfbState.SecurityResult:
        if (this.needs(avail, 4)) return 0
        if (readU32(d, pos) !== 0) throw new Error('Security response not None')
        this.state = RfbState.ServerInit
        this.events.send(new Uint8Array([1])) // Shared desktop flag
        return 4

      case RfbState.ServerInit:
        return this.serverInit(d, pos, avail)

      case RfbState.Messages:
        return this.serverMessage(d, pos, avail)

      case RfbState.Rectangles:
        return this.rectangle(d, pos, avail)
    }
  }

  private serverInit(d: Uint8Array, pos: number, avail: number): number {
    if (this.needs(avail, 24)) return 0
    const size = 24 + readU32(d, pos + 20)
    if (this.needs(avail, size)) return 0
    const width = readU16(d, pos)
    const height = readU16(d, pos + 2)
    this.pixels.frameBuffer.resize(width, height)
    this.events.onResize(width, height)

    // SetEncodings. AMT requires RAW to be listed. The desktop size pseudo-encoding goes last.
    const encodings = [
      ENCODING_ZRLE,
      ENCODING_RAW,
      ENCODING_KVM_DATA,
      ENCODING_DESKTOP_SIZE
    ]
    const msg = new Uint8Array(4 + encodings.length * 4)
    msg[0] = 2
    writeU16(msg, 2, encodings.length)
    encodings.forEach((e, i) => writeU32(msg, 4 + i * 4, e))
    this.events.send(msg)

    if (this.bpp === 1) {
      // SetPixelFormat: 8 bit true color RGB332
      this.events.send(
        new Uint8Array([
          0,
          0,
          0,
          0,
          8,
          8,
          0,
          1,
          0,
          7,
          0,
          7,
          0,
          3,
          5,
          2,
          0,
          0,
          0,
          0
        ])
      )
    }

    this.state = RfbState.Messages
    this.events.onReady(width, height)
    return size
  }

  private serverMessage(d: Uint8Array, pos: number, avail: number): number {
    switch (d[pos]) {
      case 0: {
        // FramebufferUpdate
        if (this.needs(avail, 4)) return 0
        const rects = readU16(d, pos + 2)
        if (rects === 0) {
          this.events.onFrameComplete()
        } else {
          this.rectsRemaining = rects
          this.state = RfbState.Rectangles
        }
        return 4
      }
      case 2: // Bell
        return 1
      case 3: {
        // ServerCutText, also carries the AMT KVM data channel
        if (this.needs(avail, 8)) return 0
        const size = readU32(d, pos + 4) + 8
        if (this.needs(avail, size)) return 0
        this.events.onServerCutText?.(d.subarray(pos + 8, pos + size))
        return size
      }
      default:
        throw new Error(`Unknown RFB message type: ${d[pos]}`)
    }
  }

  private rectangle(d: Uint8Array, pos: number, avail: number): number {
    if (this.needs(avail, 12)) return 0
    const x = readU16(d, pos)
    const y = readU16(d, pos + 2)
    const width = readU16(d, pos + 4)
    const height = readU16(d, pos + 6)
    const encoding = readU32(d, pos + 8)
    let size: number

    if (encoding === ENCODING_DESKTOP_SIZE) {
      size = 12
      this.pixels.frameBuffer.resize(width, height)
      this.events.onResize(width, height)
    } else if (encoding === ENCODING_RAW || encoding === ENCODING_ZRLE) {
      if (width < 1 || width > MAX_TILE_SIZE || height < 1 || height > MAX_TILE_SIZE) {
        throw new Error(`Invalid tile size (${width},${height})`)
      }
      if (encoding === ENCODING_RAW) {
        size = 12 + width * height * this.bpp
        if (this.needs(avail, size)) return 0
      } else {
        if (this.needs(avail, 16)) return 0
        const dataLength = readU32(d, pos + 12)
        size = 16 + dataLength
        if (this.needs(avail, size)) return 0
      }
      const payload = pos + (encoding === ENCODING_RAW ? 12 : 16)
      this.pixels.decode({ x, y, width, height, encoding, data: d.subarray(payload, pos + size) })
    } else {
      throw new Error(`Unknown encoding: ${encoding}`)
    }

    if (--this.rectsRemaining === 0) {
      this.state = RfbState.Messages
      this.events.onFrameComplete()
    }
    return size
  }
}

export class RfbPixelDecoder {
  readonly frameBuffer = new FrameBuffer()
  private readonly zlib = new ZlibStream()
  private readonly tile = new Uint32Array(MAX_TILE_SIZE * MAX_TILE_SIZE)
  private readonly lut: Uint32Array

  constructor(private readonly bpp: BytesPerPixel) {
    this.lut = getPixelLut(bpp)
  }

  reset(): void {
    this.zlib.reset()
  }

  decode({ x, y, width, height, encoding, data }: RfbRectangle): void {
    if (width < 1 || width > MAX_TILE_SIZE || height < 1 || height > MAX_TILE_SIZE) {
      throw new Error(`Invalid tile size (${width},${height})`)
    }
    const fb = this.frameBuffer
    const direct = x + width <= fb.width && y + height <= fb.height
    const pixels = direct ? fb.pixels : this.tile
    const offset = direct ? y * fb.width + x : 0
    const stride = direct ? fb.width : width
    let drawn = true
    if (encoding === ENCODING_RAW) {
      if (data.length !== width * height * this.bpp) throw new Error('Invalid RAW payload size')
      decodeRawPixels(data, 0, width * height, this.bpp, this.lut, pixels, offset, width, stride)
    } else if (encoding !== ENCODING_ZRLE) {
      throw new Error(`Unknown encoding: ${encoding}`)
    } else if (data.length > 5 && data[0] === 0 && (data[1] | (data[2] << 8)) === data.length - 5) {
      // Stored (uncompressed) deflate block, decoded in place like the legacy Encoding processor
      drawn = decodeZrleTile(data, 5, data.length, width, height, this.bpp, this.lut, pixels, offset, stride)
    } else {
      const raw = this.zlib.inflate(data)
      if (raw.length === 0) throw new Error('Invalid deflate data')
      drawn = decodeZrleTile(raw, 0, raw.length, width, height, this.bpp, this.lut, pixels, offset, stride)
    }
    if (drawn) {
      if (direct) fb.markDirty(x, y, width, height)
      else fb.blit(this.tile, x, y, width, height)
    }
  }
}

function readU16(d: Uint8Array, p: number): number {
  return (d[p] << 8) | d[p + 1]
}

function readU32(d: Uint8Array, p: number): number {
  return d[p] * 0x1000000 + ((d[p + 1] << 16) | (d[p + 2] << 8) | d[p + 3])
}

function writeU16(d: Uint8Array, p: number, v: number): void {
  d[p] = (v >> 8) & 0xff
  d[p + 1] = v & 0xff
}

function writeU32(d: Uint8Array, p: number, v: number): void {
  d[p] = (v >>> 24) & 0xff
  d[p + 1] = (v >> 16) & 0xff
  d[p + 2] = (v >> 8) & 0xff
  d[p + 3] = v & 0xff
}
