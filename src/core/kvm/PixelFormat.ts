/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * Bytes per pixel negotiated with Intel AMT. 1 = RGB332, 2 = RGB565.
 */
export type BytesPerPixel = 1 | 2

const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1
const luts: Partial<Record<BytesPerPixel, Uint32Array>> = {}

function fixColor(c: number): number {
  return c > 127 ? c + 32 : c
}

/**
 * Packs an opaque RGB color into the 32 bit layout of ImageData pixels on this platform.
 */
export function packRGBA(r: number, g: number, b: number): number {
  return littleEndian
    ? ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0
    : ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0
}

/**
 * Returns a lookup table that maps every device pixel value straight to a 32 bit RGBA pixel.
 * The color math matches ImageHelper.setPixel so the output is identical to the legacy path.
 */
export function getPixelLut(bpp: BytesPerPixel): Uint32Array {
  const cached = luts[bpp]
  if (cached != null) return cached

  const size = bpp === 1 ? 0x100 : 0x10000
  const lut = new Uint32Array(size)
  for (let v = 0; v < size; v++) {
    lut[v] =
      bpp === 1
        ? packRGBA(v & 224, (v & 28) << 3, fixColor((v & 3) << 6))
        : packRGBA((v >> 8) & 248, (v >> 3) & 252, (v & 31) << 3)
  }
  luts[bpp] = lut
  return lut
}
