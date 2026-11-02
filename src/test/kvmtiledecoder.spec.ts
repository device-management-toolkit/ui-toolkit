/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { getPixelLut, packRGBA } from '../core/kvm/PixelFormat'
import { decodeRawPixels, decodeZrleTile } from '../core/kvm/TileDecoder'

const rgba = (px: number): number[] => [...new Uint8Array(new Uint32Array([px]).buffer)]

describe('KVM pixel lookup tables', () => {
  it('maps RGB332 like ImageHelper.setPixel', () => {
    const lut = getPixelLut(1)
    expect(rgba(lut[0])).toEqual([
      0,
      0,
      0,
      255
    ])
    expect(rgba(lut[0xff])).toEqual([
      224,
      224,
      224,
      255
    ]) // blue 192 gets the +32 fix
    expect(rgba(lut[0b11100000])).toEqual([
      224,
      0,
      0,
      255
    ])
    expect(rgba(lut[0b00011100])).toEqual([
      0,
      224,
      0,
      255
    ])
    expect(rgba(lut[0b00000001])).toEqual([
      0,
      0,
      64,
      255
    ])
  })

  it('maps RGB565 like ImageHelper.setPixel', () => {
    const lut = getPixelLut(2)
    expect(rgba(lut[0xffff])).toEqual([
      248,
      252,
      248,
      255
    ])
    expect(rgba(lut[0xf800])).toEqual([
      248,
      0,
      0,
      255
    ])
    expect(rgba(lut[0x07e0])).toEqual([
      0,
      252,
      0,
      255
    ])
    expect(rgba(lut[0x001f])).toEqual([
      0,
      0,
      248,
      255
    ])
  })

  it('caches tables per pixel format', () => {
    expect(getPixelLut(1)).toBe(getPixelLut(1))
    expect(rgba(packRGBA(1, 2, 3))).toEqual([
      1,
      2,
      3,
      255
    ])
  })
})

describe('ZRLE tile decoding', () => {
  const lut1 = getPixelLut(1)
  const lut2 = getPixelLut(2)
  let tile: Uint32Array

  beforeEach(() => {
    tile = new Uint32Array(64 * 64)
  })

  it.each([1, 2] as const)('writes RAW and ZRLE into a strided framebuffer for bpp %s', (bpp) => {
    const lut = bpp === 1 ? lut1 : lut2
    const pixel = (value: number): number[] => (bpp === 1 ? [value] : [value, 0x12])
    const raw = [
      1,
      2,
      3,
      4,
      5,
      6
    ].flatMap(pixel)
    const cases = [
      [0, ...raw],
      [1, ...pixel(7)],
      [
        2,
        ...pixel(1),
        ...pixel(2),
        0b10101000
      ],
      [
        3,
        ...pixel(1),
        ...pixel(2),
        ...pixel(3),
        0b00011000,
        0b01000000
      ],
      [
        128,
        ...pixel(7),
        3,
        ...pixel(9),
        1
      ],
      [
        130,
        ...pixel(5),
        ...pixel(6),
        0,
        0x81,
        4
      ],
      [
        128,
        ...pixel(7),
        255,
        4
      ]
    ]
    const check = (pixels: Uint32Array, expected: Uint32Array): void => {
      for (let index = 0; index < pixels.length; index++) {
        const row = Math.floor(index / 8) - 1
        const column = (index % 8) - 2
        const inside = row >= 0 && row < 2 && column >= 0 && column < 3
        expect(pixels[index]).toBe(inside ? expected[row * 3 + column] : 0xabcdef)
      }
    }
    for (const payload of cases) {
      const src = new Uint8Array(payload)
      const expected = new Uint32Array(6)
      decodeZrleTile(src, 0, src.length, 3, 2, bpp, lut, expected)
      const pixels = new Uint32Array(32).fill(0xabcdef)
      decodeZrleTile(src, 0, src.length, 3, 2, bpp, lut, pixels, 10, 8)
      check(pixels, expected)
    }
    const pixels = new Uint32Array(32).fill(0xabcdef)
    const expected = new Uint32Array(6)
    decodeRawPixels(new Uint8Array(raw), 0, 6, bpp, lut, expected)
    expect(decodeRawPixels(new Uint8Array(raw), 0, 6, bpp, lut, pixels, 10, 3, 8)).toBe(raw.length)
    check(pixels, expected)
  })

  it('decodes raw pixels for both pixel formats', () => {
    decodeRawPixels(new Uint8Array([0xe0, 0x1c]), 0, 2, 1, lut1, tile)
    expect([tile[0], tile[1]]).toEqual([lut1[0xe0], lut1[0x1c]])
    const end = decodeRawPixels(
      new Uint8Array([
        0x00,
        0xf8,
        0x1f,
        0x00
      ]),
      0,
      2,
      2,
      lut2,
      tile
    )
    expect([tile[0], tile[1]]).toEqual([lut2[0xf800], lut2[0x001f]])
    expect(end).toBe(4)
  })

  it('decodes raw sub-encoding', () => {
    const src = new Uint8Array([
      0,
      1,
      2,
      3,
      4
    ])
    expect(decodeZrleTile(src, 0, src.length, 2, 2, 1, lut1, tile)).toBe(true)
    expect([...tile.subarray(0, 4)]).toEqual([
      lut1[1],
      lut1[2],
      lut1[3],
      lut1[4]
    ])
  })

  it('decodes solid tiles', () => {
    const src = new Uint8Array([
      1,
      0x34,
      0x12
    ])
    expect(decodeZrleTile(src, 0, src.length, 3, 2, 2, lut2, tile)).toBe(true)
    expect([...tile.subarray(0, 6)]).toEqual(new Array(6).fill(lut2[0x1234]))
  })

  it('decodes a 2 color packed palette, one bit per pixel', () => {
    const src = new Uint8Array([
      2,
      0x00,
      0xff,
      0b10100000
    ])
    decodeZrleTile(src, 0, src.length, 4, 1, 1, lut1, tile)
    expect([...tile.subarray(0, 4)]).toEqual([
      lut1[0xff],
      lut1[0],
      lut1[0xff],
      lut1[0]
    ])
  })

  it('decodes a 4 color packed palette, two bits per pixel', () => {
    const src = new Uint8Array([
      3,
      10,
      20,
      30,
      0b00011000
    ])
    decodeZrleTile(src, 0, src.length, 4, 1, 1, lut1, tile)
    expect([...tile.subarray(0, 4)]).toEqual([
      lut1[10],
      lut1[20],
      lut1[30],
      lut1[10]
    ])
  })

  it('decodes plain RLE runs including 255 continuation bytes', () => {
    // color 7: run 1 + 255 + 4 = 260; color 9: run 1 + 3 = 4
    const src = new Uint8Array([
      128,
      7,
      255,
      4,
      9,
      3
    ])
    decodeZrleTile(src, 0, src.length, 64, 64, 1, lut1, tile)
    expect(tile[0]).toBe(lut1[7])
    expect(tile[259]).toBe(lut1[7])
    expect(tile[260]).toBe(lut1[9])
    expect(tile[263]).toBe(lut1[9])
    expect(tile[264]).toBe(0)
  })

  it('decodes palette RLE with single pixels and runs', () => {
    // palette [5, 6]; index 0 single pixel; index 1 as a run of 1 + 2 = 3
    const src = new Uint8Array([
      130,
      5,
      6,
      0,
      0x81,
      2
    ])
    decodeZrleTile(src, 0, src.length, 4, 1, 1, lut1, tile)
    expect([...tile.subarray(0, 4)]).toEqual([
      lut1[5],
      lut1[6],
      lut1[6],
      lut1[6]
    ])
  })

  it('never writes past the tile for oversized runs', () => {
    const src = new Uint8Array([
      128,
      7,
      200
    ])
    decodeZrleTile(src, 0, src.length, 2, 2, 1, lut1, tile)
    expect(tile[3]).toBe(lut1[7])
    expect(tile[4]).toBe(0)
  })

  it('draws nothing for unused sub-encodings', () => {
    expect(decodeZrleTile(new Uint8Array([129]), 0, 1, 2, 2, 1, lut1, tile)).toBe(false)
    expect(decodeZrleTile(new Uint8Array([20]), 0, 1, 2, 2, 1, lut1, tile)).toBe(false)
  })
})
