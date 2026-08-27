/*********************************************************************
 * Copyright (c) Intel Corporation 2020
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'

// jsdom has no 2D canvas implementation (that requires the native `canvas`
// package). The core rendering paths only ever touch a handful of context
// methods, so a stub keeps HTMLCanvasElement.getContext from throwing
// "not implemented". Mirrors ui-toolkit-react/vitest.setup.ts.
const createContext2D = (): Record<string, unknown> => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  canvas: {
    height: 768,
    width: 1366
  }
})

// Like the real API: one context per canvas (repeat calls return the same
// object), and non-"2d" context requests return null.
// Guarded so a spec opting into `@vitest-environment node` (where no DOM
// globals exist) doesn't crash in this setup file before its tests run.
if (typeof HTMLCanvasElement !== 'undefined') {
  const contexts = new WeakMap<HTMLCanvasElement, Record<string, unknown>>()
  HTMLCanvasElement.prototype.getContext = vi.fn(function (
    this: HTMLCanvasElement,
    contextId: string
  ) {
    if (contextId !== '2d') return null
    let ctx = contexts.get(this)
    if (ctx == null) {
      ctx = createContext2D()
      contexts.set(this, ctx)
    }
    return ctx
  }) as unknown as HTMLCanvasElement['getContext']
}
