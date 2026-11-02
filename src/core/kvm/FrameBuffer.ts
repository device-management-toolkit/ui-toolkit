/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { packRGBA } from './PixelFormat'

const BAND_SHIFT = 6 // 64 pixel rows per band, the maximum AMT tile height
const BAND_HEIGHT = 1 << BAND_SHIFT
const MERGE_WASTE_RATIO = 1.25
const REGIONS_PER_BAND = 4
const MERGE_CALL_ALLOWANCE = 1024
const REGION_FIELDS = 4
const PRESENT_FIELDS = 5

/**
 * Screen sized RGBA pixel store shared by the decoder (writer) and the renderer (reader).
 *
 * Each 64-row band keeps a bounded set of sparse regions, collapsing fragmented bands to a
 * bounding box. Adjacent regions are merged before presentation to limit canvas uploads.
 */
export class FrameBuffer {
  width = 0
  height = 0
  data = new Uint8ClampedArray(0)
  pixels = new Uint32Array(0)

  private regions = new Int32Array(0)
  private counts = new Uint8Array(0)
  private collapsed = new Uint8Array(0)
  private presents = new Float64Array(0)
  private dirty = false

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.data = new Uint8ClampedArray(width * height * 4)
    this.pixels = new Uint32Array(this.data.buffer)
    this.pixels.fill(packRGBA(0, 0, 0))

    const bands = (height + BAND_HEIGHT - 1) >> BAND_SHIFT
    this.regions = new Int32Array(bands * REGIONS_PER_BAND * REGION_FIELDS)
    this.counts = new Uint8Array(bands)
    this.collapsed = new Uint8Array(bands)
    this.presents = new Float64Array(bands * REGIONS_PER_BAND * PRESENT_FIELDS)
    this.resetDirty()
    this.markDirty(0, 0, width, height)
  }

  get hasDirty(): boolean {
    return this.dirty
  }

  /**
   * Copies a decoded tile (row-major, tileWidth wide) into the frame, clipped to the screen.
   */
  blit(tile: Uint32Array, x: number, y: number, tileWidth: number, tileHeight: number): void {
    const w = Math.min(tileWidth, this.width - x)
    const h = Math.min(tileHeight, this.height - y)
    if (w <= 0 || h <= 0 || x < 0 || y < 0) return
    for (let row = 0; row < h; row++) {
      const src = row * tileWidth
      this.pixels.set(tile.subarray(src, src + w), (y + row) * this.width + x)
    }
    this.markDirty(x, y, w, h)
  }

  markDirty(x: number, y: number, w: number, h: number): void {
    const x2 = Math.min(x + w, this.width)
    const y2 = Math.min(y + h, this.height)
    x = Math.max(x, 0)
    y = Math.max(y, 0)
    if (x2 <= x || y2 <= y) return
    for (let band = y >> BAND_SHIFT; band <= (y2 - 1) >> BAND_SHIFT; band++) {
      const top = band << BAND_SHIFT
      this.addRegion(band, x, Math.max(y, top), x2, Math.min(y2, top + BAND_HEIGHT))
    }
    this.dirty = true
  }

  private addRegion(band: number, x: number, y: number, x2: number, y2: number): void {
    const regions = this.regions
    const base = band * REGIONS_PER_BAND * REGION_FIELDS
    let count = this.counts[band]
    if (
      count === 1 &&
      (this.collapsed[band] ||
        (y === regions[base + 1] && y2 === regions[base + 3] && x <= regions[base + 2] && x2 >= regions[base]))
    ) {
      regions[base] = Math.min(x, regions[base])
      regions[base + 1] = Math.min(y, regions[base + 1])
      regions[base + 2] = Math.max(x2, regions[base + 2])
      regions[base + 3] = Math.max(y2, regions[base + 3])
      return
    }
    for (let index = 0; index < count; ) {
      const offset = base + index * REGION_FIELDS
      const left = Math.min(x, regions[offset])
      const top = Math.min(y, regions[offset + 1])
      const right = Math.max(x2, regions[offset + 2])
      const bottom = Math.max(y2, regions[offset + 3])
      const area =
        (x2 - x) * (y2 - y) + (regions[offset + 2] - regions[offset]) * (regions[offset + 3] - regions[offset + 1])
      if (this.collapsed[band] || (right - left) * (bottom - top) <= area * MERGE_WASTE_RATIO + MERGE_CALL_ALLOWANCE) {
        x = left
        y = top
        x2 = right
        y2 = bottom
        count--
        regions.copyWithin(offset, base + count * REGION_FIELDS, base + (count + 1) * REGION_FIELDS)
        index = 0
      } else {
        index++
      }
    }
    if (count === REGIONS_PER_BAND) {
      for (let index = 0; index < count; index++) {
        const offset = base + index * REGION_FIELDS
        x = Math.min(x, regions[offset])
        y = Math.min(y, regions[offset + 1])
        x2 = Math.max(x2, regions[offset + 2])
        y2 = Math.max(y2, regions[offset + 3])
      }
      count = 0
      this.collapsed[band] = 1
    }
    const offset = base + count * REGION_FIELDS
    regions[offset] = x
    regions[offset + 1] = y
    regions[offset + 2] = x2
    regions[offset + 3] = y2
    this.counts[band] = count + 1
  }

  flushDirty(callback: (x: number, y: number, w: number, h: number) => void): void {
    if (!this.dirty) return
    const regions = this.regions
    const presents = this.presents
    let count = 0
    for (let band = 0; band < this.counts.length; band++) {
      for (let region = 0; region < this.counts[band]; region++) {
        const offset = (band * REGIONS_PER_BAND + region) * REGION_FIELDS
        const x = regions[offset]
        const y = regions[offset + 1]
        const x2 = regions[offset + 2]
        const y2 = regions[offset + 3]
        const area = (x2 - x) * (y2 - y)
        let target = count * PRESENT_FIELDS
        for (let candidate = 0; candidate < count * PRESENT_FIELDS; candidate += PRESENT_FIELDS) {
          if (presents[candidate + 3] !== y) continue
          const left = Math.min(x, presents[candidate])
          const right = Math.max(x2, presents[candidate + 2])
          if ((right - left) * (y2 - presents[candidate + 1]) <= (area + presents[candidate + 4]) * MERGE_WASTE_RATIO) {
            target = candidate
            break
          }
        }
        if (target === count * PRESENT_FIELDS) {
          presents[target] = x
          presents[target + 1] = y
          presents[target + 2] = x2
          presents[target + 3] = y2
          presents[target + 4] = area
          count++
        } else {
          presents[target] = Math.min(x, presents[target])
          presents[target + 2] = Math.max(x2, presents[target + 2])
          presents[target + 3] = y2
          presents[target + 4] += area
        }
      }
    }
    for (let offset = 0; offset < count * PRESENT_FIELDS; offset += PRESENT_FIELDS) {
      callback(
        presents[offset],
        presents[offset + 1],
        presents[offset + 2] - presents[offset],
        presents[offset + 3] - presents[offset + 1]
      )
    }
    this.resetDirty()
  }

  private resetDirty(): void {
    this.counts.fill(0)
    this.collapsed.fill(0)
    this.dirty = false
  }
}
