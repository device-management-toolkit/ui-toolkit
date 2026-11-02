/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { CanvasRenderer, type Canvas2DContext } from '../core/kvm/CanvasRenderer'
import { FrameBuffer } from '../core/kvm/FrameBuffer'
import { KvmPipeline } from '../core/kvm/KvmPipeline'
import { frameUpdate, rectHeader, rfbServerHandshake } from './helper/kvmTestHelpers'

class FakeImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number
  ) {}
}

const fakeContext = (): Canvas2DContext & { putImageData: ReturnType<typeof vi.fn> } =>
  ({
    canvas: { width: 0, height: 0 },
    putImageData: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: ''
  }) as any

describe('KVM completed-update presentation', () => {
  beforeEach(() => {
    vi.stubGlobal('ImageData', FakeImageData)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createPipeline = (ctx: Canvas2DContext): KvmPipeline =>
    new KvmPipeline(
      ctx,
      { bpp: 1, externalRequests: true },
      {
        send: () => {},
        onReady: () => {},
        onResize: () => {},
        onError: (message) => {
          throw new Error(message)
        }
      }
    )

  it('paints an update as soon as its last rectangle is decoded, never a partial update', () => {
    const ctx = fakeContext()
    const pipeline = createPipeline(ctx)
    pipeline.push(new Uint8Array(rfbServerHandshake(128, 128)))
    pipeline.decoder.frameBuffer.flushDirty(() => {})
    const update = frameUpdate([
      [...rectHeader(0, 0, 1, 1, 0), 7],
      [...rectHeader(64, 64, 1, 1, 0), 8]
    ])
    pipeline.push(new Uint8Array(update.slice(0, -1)))
    expect(ctx.putImageData).not.toHaveBeenCalled()
    pipeline.push(new Uint8Array(update.slice(-1)))
    expect(ctx.putImageData).toHaveBeenCalledTimes(2)
    pipeline.stop()
  })

  it('paints every update in a chunk before decoding the next one', () => {
    const ctx = fakeContext()
    const pipeline = createPipeline(ctx)
    pipeline.push(new Uint8Array(rfbServerHandshake(64, 64)))
    pipeline.decoder.frameBuffer.flushDirty(() => {})
    const samples: number[] = []
    ctx.putImageData.mockImplementation((image: FakeImageData) => {
      samples.push(image.data[0])
    })
    const burst = [
      0x20,
      0x40,
      0x80
    ].flatMap((value) => frameUpdate([[...rectHeader(0, 0, 1, 1, 0), value]]))
    pipeline.push(new Uint8Array(burst))
    expect(samples).toEqual([
      0x20,
      0x40,
      0x80
    ])
    pipeline.stop()
  })

  it('does not repaint an idle screen', () => {
    const ctx = fakeContext()
    const fb = new FrameBuffer()
    fb.resize(64, 64)
    const renderer = new CanvasRenderer(ctx, fb)
    renderer.resize()
    renderer.present()
    expect(ctx.putImageData).toHaveBeenCalledOnce()
    renderer.present()
    expect(ctx.putImageData).toHaveBeenCalledOnce()
  })

  it('wraps resized storage and stops painting after disposal', () => {
    const ctx = fakeContext()
    const fb = new FrameBuffer()
    fb.resize(64, 64)
    const renderer = new CanvasRenderer(ctx, fb)
    renderer.resize()
    fb.resize(128, 64)
    renderer.resize()
    renderer.present()
    const image = ctx.putImageData.mock.calls[0][0] as FakeImageData
    expect(image.width).toBe(128)
    expect(image.data).toBe(fb.data)
    expect(ctx.canvas.width).toBe(128)
    fb.markDirty(0, 0, 1, 1)
    renderer.dispose()
    renderer.present()
    expect(ctx.putImageData).toHaveBeenCalledOnce()
  })
})
