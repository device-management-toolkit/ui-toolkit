/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type BytesPerPixel } from './PixelFormat'

export const MAX_TILE_SIZE = 64

const palette = new Uint32Array(128)

/**
 * Converts `count` raw device pixels starting at `pos` into RGBA tile pixels.
 * Returns the position after the last pixel read.
 */
export function decodeRawPixels(
  src: Uint8Array,
  pos: number,
  count: number,
  bpp: BytesPerPixel,
  lut: Uint32Array,
  tile: Uint32Array,
  offset = 0,
  width = count,
  stride = width
): number {
  for (let row = 0; row < count; row += width) {
    const end = offset + Math.min(width, count - row)
    if (bpp === 1) {
      for (let target = offset; target < end; target++) tile[target] = lut[src[pos++]]
    } else {
      for (let target = offset; target < end; target++) {
        tile[target] = lut[src[pos] | (src[pos + 1] << 8)]
        pos += 2
      }
    }
    offset += stride
  }
  return pos
}

/**
 * Decodes one ZRLE tile (sub-encoding byte followed by its payload) from src[pos..end) into
 * `tile` as row-major RGBA pixels. Returns false for sub-encodings that draw nothing.
 *
 * Mirrors RLEDecoder.Decode, including treating packed palette data as one continuous bit
 * stream (no per row padding), which is what Intel AMT sends.
 */
export function decodeZrleTile(
  src: Uint8Array,
  pos: number,
  end: number,
  width: number,
  height: number,
  bpp: BytesPerPixel,
  lut: Uint32Array,
  tile: Uint32Array,
  offset = 0,
  stride = width
): boolean {
  const count = width * height
  const subencoding = src[pos++]
  let i = 0

  if (subencoding === 0) {
    decodeRawPixels(src, pos, count, bpp, lut, tile, offset, width, stride)
    return true
  }

  if (subencoding === 1) {
    const v = bpp === 1 ? src[pos] : src[pos] | (src[pos + 1] << 8)
    fillPixels(tile, lut[v], 0, count, offset, width, stride)
    return true
  }

  if (subencoding < 17) {
    // Packed palette
    pos = readPalette(src, pos, subencoding, bpp, lut)
    let bits = 4
    let mask = 15
    if (subencoding === 2) {
      bits = 1
      mask = 1
    } else if (subencoding <= 4) {
      bits = 2
      mask = 3
    }
    let target = offset
    let rowEnd = offset + width
    while (i < count && pos < end) {
      const v = src[pos++]
      for (let shift = 8 - bits; shift >= 0 && i < count; shift -= bits) {
        tile[target++] = palette[(v >> shift) & mask]
        i++
        if (target === rowEnd) {
          target += stride - width
          rowEnd = target + width
        }
      }
    }
    return true
  }

  if (subencoding === 128) {
    // Plain RLE
    while (i < count && pos < end) {
      const v = bpp === 1 ? src[pos++] : src[pos++] | (src[pos++] << 8)
      let run = 1
      let r: number
      do {
        r = src[pos++]
        run += r
      } while (r === 255 && pos < end)
      fillPixels(tile, lut[v], i, Math.min(i + run, count), offset, width, stride)
      i += run
    }
    return true
  }

  if (subencoding > 129) {
    // Palette RLE
    pos = readPalette(src, pos, subencoding - 128, bpp, lut)
    while (i < count && pos < end) {
      const index = src[pos++]
      let run = 1
      if (index > 127) {
        let r: number
        do {
          r = src[pos++]
          run += r
        } while (r === 255 && pos < end)
      }
      fillPixels(tile, palette[index & 127], i, Math.min(i + run, count), offset, width, stride)
      i += run
    }
    return true
  }

  return false
}

function fillPixels(
  pixels: Uint32Array,
  value: number,
  start: number,
  end: number,
  offset: number,
  width: number,
  stride: number
): void {
  if (stride === width) {
    pixels.fill(value, offset + start, offset + end)
    return
  }
  while (start < end) {
    const column = start % width
    const length = Math.min(width - column, end - start)
    const target = offset + Math.floor(start / width) * stride + column
    if (length === 1) pixels[target] = value
    else pixels.fill(value, target, target + length)
    start += length
  }
}

function readPalette(src: Uint8Array, pos: number, size: number, bpp: BytesPerPixel, lut: Uint32Array): number {
  palette.fill(lut[0]) // Out of range indexes render opaque black, like the legacy decoder
  for (let i = 0; i < size; i++) {
    if (bpp === 1) {
      palette[i] = lut[src[pos++]]
    } else {
      palette[i] = lut[src[pos] | (src[pos + 1] << 8)]
      pos += 2
    }
  }
  return pos
}
