/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { CanvasRenderer, type Canvas2DContext } from '../core/kvm/CanvasRenderer'
import { FrameBuffer } from '../core/kvm/FrameBuffer'
import { FrameRequester } from '../core/kvm/FrameRequester'
import { KvmSession, type KvmSessionConfig } from '../core/kvm/KvmSession'
import { KvmWorkerHost, type WorkerScope } from '../core/kvm/KvmWorkerHost'
import { KvmPipeline } from '../core/kvm/KvmPipeline'
import { type KvmWorkerEvent } from '../core/kvm/KvmWorkerProtocol'
import { type WebSocketFactory } from '../core/kvm/RedirectionReceiver'
import {
  FakeWebSocket,
  frameUpdate,
  rectHeader,
  redirectionHandshake,
  rfbServerHandshake,
  u16,
  last,
  zrleStream
} from './helper/kvmTestHelpers'

class FakeImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number
  ) {}
}

const fakeContext = (): Canvas2DContext & {
  putImageData: ReturnType<typeof vi.fn>
  fillRect: ReturnType<typeof vi.fn>
} =>
  ({
    canvas: { width: 0, height: 0 },
    putImageData: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: ''
  }) as any

const updateRequest = (incremental: number, w: number, h: number): number[] => [
  3,
  incremental,
  0,
  0,
  0,
  0,
  ...u16(w),
  ...u16(h)
]

beforeEach(() => {
  vi.stubGlobal('ImageData', FakeImageData)
  FakeWebSocket.instances = []
})

describe('KVM FrameRequester', () => {
  it('maintains depth two only at completion boundaries and refreshes resized dimensions', () => {
    const sent: number[][] = []
    const requester = new FrameRequester((data) => sent.push([...data]), 0, 1000, 2)
    requester.start(640, 480)
    requester.start(640, 480)
    expect(sent).toHaveLength(2)
    requester.onDesktopResize(800, 600)
    expect(sent).toHaveLength(2)
    requester.onUpdateComplete()
    expect(sent).toHaveLength(3)
    expect(sent[2]).toEqual(updateRequest(0, 800, 600))
    for (let frame = 0; frame < 100; frame++) {
      expect(sent).toHaveLength(3 + frame)
      requester.onUpdateComplete()
      expect(sent).toHaveLength(4 + frame)
      expect(last(sent)).toEqual(updateRequest(1, 800, 600))
    }
    requester.stop()
    requester.onUpdateComplete()
    expect(sent).toHaveLength(103)
    requester.start(800, 600)
    expect(sent).toHaveLength(105)
    requester.stop()
  })

  it('bounds delayed and hidden requests to the configured depth', () => {
    vi.useFakeTimers()
    const sent: number[][] = []
    const requester = new FrameRequester((data) => sent.push([...data]), 5, 1000, 2)
    try {
      requester.start(64, 64)
      requester.onUpdateComplete()
      requester.onUpdateComplete()
      expect(sent).toHaveLength(2)
      vi.advanceTimersByTime(4)
      expect(sent).toHaveLength(2)
      vi.advanceTimersByTime(1)
      expect(sent).toHaveLength(4)
      requester.setHidden(true)
      requester.onUpdateComplete()
      requester.onUpdateComplete()
      vi.advanceTimersByTime(1000)
      expect(sent).toHaveLength(5)
      requester.setHidden(false)
      expect(sent).toHaveLength(6)
      requester.onUpdateComplete()
      requester.stop()
      vi.advanceTimersByTime(1000)
      expect(sent).toHaveLength(6)
    } finally {
      requester.stop()
      vi.useRealTimers()
    }
  })

  it.each([1, 2] as const)('waits for the last payload byte in the fallback pipeline (bpp=%s)', (bpp) => {
    const sent: Uint8Array[] = []
    const pipeline = new KvmPipeline(
      fakeContext(),
      { bpp },
      {
        send: (data) => sent.push(data),
        onReady: () => {},
        onResize: () => {},
        onError: (message) => {
          throw new Error(message)
        }
      }
    )
    const requests = (): number => sent.filter((data) => data[0] === 3 && data.length === 10).length
    try {
      pipeline.push(new Uint8Array(rfbServerHandshake(128, 128)))
      const update = frameUpdate([
        [...rectHeader(0, 0, 1, 1, 0), ...new Array<number>(bpp).fill(7)],
        [...rectHeader(1, 0, 1, 1, 0), ...new Array<number>(bpp).fill(8)]
      ])
      for (const byte of update.slice(0, -1)) {
        pipeline.push(new Uint8Array([byte]))
        expect(requests()).toBe(1)
      }
      pipeline.push(new Uint8Array(update.slice(-1)))
      expect(requests()).toBe(2)
      pipeline.push(new Uint8Array(frameUpdate([])))
      expect(requests()).toBe(3)
    } finally {
      pipeline.stop()
    }
  })

  it('requests incrementally on start and after every frame', () => {
    const sent: number[][] = []
    const requester = new FrameRequester((d) => sent.push([...d]))
    requester.onUpdateComplete() // not started yet
    expect(sent).toEqual([])
    requester.start(1024, 768)
    requester.onUpdateComplete()
    expect(sent).toEqual([updateRequest(1, 1024, 768), updateRequest(1, 1024, 768)])
  })

  it('asks for a full update when the desktop is resized', () => {
    const sent: number[][] = []
    const requester = new FrameRequester((d) => sent.push([...d]))
    requester.onDesktopResize(640, 480) // inactive: only remembers the size
    requester.start(640, 480)
    requester.onDesktopResize(800, 600)
    expect(sent).toHaveLength(1)
    expect(sent).toHaveLength(1)
    requester.onUpdateComplete()
    expect(sent).toEqual([updateRequest(1, 640, 480), updateRequest(0, 800, 600)])
  })

  it('slows down while hidden and catches up when visible again', () => {
    vi.useFakeTimers()
    const sent: number[][] = []
    const requester = new FrameRequester((d) => sent.push([...d]))
    requester.setHidden(true)
    requester.start(10, 10) // the first request always goes out
    expect(sent.length).toBe(1)
    requester.onUpdateComplete()
    expect(sent.length).toBe(1)
    vi.advanceTimersByTime(1000) // keeps the relay from timing out the session
    expect(sent.length).toBe(2)
    requester.onUpdateComplete()
    requester.setHidden(false)
    expect(sent.length).toBe(3)
    vi.advanceTimersByTime(1000)
    expect(sent.length).toBe(3)
    requester.onUpdateComplete()
    expect(sent.length).toBe(4)
    vi.useRealTimers()
  })

  it('honours the frame delay and cancels it on stop', () => {
    vi.useFakeTimers()
    const sent: number[][] = []
    const requester = new FrameRequester((d) => sent.push([...d]), 5)
    requester.start(10, 10)
    requester.onUpdateComplete()
    expect(sent.length).toBe(1)
    vi.advanceTimersByTime(5)
    expect(sent.length).toBe(2)
    requester.onUpdateComplete()
    requester.stop()
    vi.advanceTimersByTime(10)
    expect(sent.length).toBe(2)
    vi.useRealTimers()
  })
})

describe('KVM CanvasRenderer', () => {
  it('sizes the canvas and uploads only the changed areas', () => {
    const ctx = fakeContext()
    const fb = new FrameBuffer()
    fb.resize(256, 256)
    const renderer = new CanvasRenderer(ctx, fb)
    renderer.resize()
    expect(ctx.canvas.width).toBe(256)
    renderer.present()
    expect(ctx.putImageData).toHaveBeenCalledTimes(1)
    expect(ctx.putImageData.mock.calls[0].slice(1)).toEqual([
      0,
      0,
      0,
      0,
      256,
      256
    ])

    fb.markDirty(64, 128, 64, 64)
    renderer.present()
    expect(ctx.putImageData.mock.calls[1].slice(1)).toEqual([
      0,
      0,
      64,
      128,
      64,
      64
    ])
    const image = ctx.putImageData.mock.calls[1][0] as FakeImageData
    expect(image.data).toBe(fb.data) // no copy
  })
})

const sessionConfig: KvmSessionConfig = {
  server: 'wss://relay.test',
  host: 'guid',
  port: 16994,
  user: '',
  pass: '',
  tls: 0,
  tls1only: 0,
  authToken: 'token',
  bpp: 1
}

const connect = (ws: FakeWebSocket): void => {
  ws.open()
  ws.receive(
    redirectionHandshake.startReply,
    redirectionHandshake.authQueryReply,
    redirectionHandshake.authSuccess,
    redirectionHandshake.kvmStarted
  )
}

describe('KVM KvmSession', () => {
  const createSession = (): {
    session: KvmSession
    ctx: ReturnType<typeof fakeContext>
    states: number[]
    sizes: number[][]
    errors: string[]
  } => {
    const ctx = fakeContext()
    const states: number[] = []
    const sizes: number[][] = []
    const errors: string[] = []
    const session = new KvmSession(
      ctx,
      sessionConfig,
      {
        onConnectionStateChange: (s) => states.push(s),
        onScreenSizeChange: (w, h) => sizes.push([w, h]),
        onError: (m) => errors.push(m)
      },
      { WebSocket: FakeWebSocket as unknown as WebSocketFactory }
    )
    return { session, ctx, states, sizes, errors }
  }

  it('runs receiver, decoder, requester and renderer end to end', () => {
    const { session, ctx, states, sizes } = createSession()
    session.start()
    const ws = FakeWebSocket.last
    connect(ws)
    ws.receive(rfbServerHandshake(128, 64))
    expect(sizes).toEqual([[128, 64]])
    expect(ctx.canvas.width).toBe(128)
    expect([...last(ws.sent)]).toEqual(updateRequest(1, 128, 64))

    const before = ws.sent.length
    ws.receive(frameUpdate([[...rectHeader(0, 0, 1, 1, 0), 0xe0]]))
    // next frame requested, then the frame presented
    expect(ws.sent.length).toBe(before + 1)
    expect(ctx.putImageData).toHaveBeenCalled()
    expect(states).toEqual([1, 2])
  })

  it('requests the next frame only after the current payload completes', () => {
    const { session, ctx } = createSession()
    session.start()
    const ws = FakeWebSocket.last
    connect(ws)
    ws.receive(rfbServerHandshake(128, 128))
    const count = ws.sent.length
    ws.receive([
      0,
      0,
      0,
      1
    ])
    expect(ws.sent.length).toBe(count)
    expect(ctx.putImageData).not.toHaveBeenCalled()
    ws.receive([...rectHeader(0, 0, 1, 1, 0), 7])
    expect(ws.sent.length).toBe(count + 1)
    expect(ctx.putImageData).toHaveBeenCalled()
    session.stop()
  })

  it('only forwards input after the RFB handshake', () => {
    const { session } = createSession()
    session.start()
    const ws = FakeWebSocket.last
    connect(ws)
    const count = ws.sent.length
    session.sendInput(
      new Uint8Array([
        4,
        1,
        0,
        0,
        0,
        0,
        0,
        65
      ])
    )
    expect(ws.sent.length).toBe(count)
    ws.receive(rfbServerHandshake(64, 64))
    session.sendInput(
      new Uint8Array([
        4,
        1,
        0,
        0,
        0,
        0,
        0,
        65
      ])
    )
    expect([...last(ws.sent)]).toEqual([
      4,
      1,
      0,
      0,
      0,
      0,
      0,
      65
    ])
  })

  it('stops, clears the canvas and reports decode errors', () => {
    const { session, ctx, states, errors } = createSession()
    session.start()
    const ws = FakeWebSocket.last
    connect(ws)
    ws.receive(rfbServerHandshake(64, 64))
    ws.receive(frameUpdate([rectHeader(0, 0, 99, 1, 0)]))
    expect(last(states)).toBe(0)
    expect(errors[0]).toContain('Invalid tile size')
    expect(ws.closed).toBe(true)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('slows frame requests while hidden', () => {
    vi.useFakeTimers()
    const { session } = createSession()
    session.setVisible(false)
    session.start()
    const ws = FakeWebSocket.last
    connect(ws)
    ws.receive(rfbServerHandshake(64, 64))
    const count = ws.sent.length
    ws.receive(frameUpdate([]))
    expect(ws.sent.length).toBe(count)
    session.setVisible(true)
    expect([...last(ws.sent)]).toEqual(updateRequest(1, 64, 64))
    expect(ws.sent.length).toBe(count + 1)
    vi.useRealTimers()
  })
})

describe('KVM KvmWorkerHost', () => {
  const pipelineConfig = { bpp: 1 as const }
  const push = (host: KvmWorkerHost, session: number, bytes: number[] | Uint8Array): void => {
    const data = new Uint8Array(bytes)
    host.handle({ type: 'data', session, buffer: data.buffer, offset: 0, length: data.length })
  }
  const update = (): number[] => frameUpdate([[...rectHeader(0, 0, 1, 1, 0), 7]])

  const createHost = (): { host: KvmWorkerHost; posted: KvmWorkerEvent[] } => {
    const posted: KvmWorkerEvent[] = []
    const scope: WorkerScope = { postMessage: (m) => posted.push(m), onmessage: null }
    const host = new KvmWorkerHost(scope)
    expect(scope.onmessage).not.toBeNull()
    return { host, posted }
  }

  it('parses raw RFB, sends protocol replies and presents only complete frames', () => {
    const { host, posted } = createHost()
    host.handle({ type: 'start', session: 1, config: pipelineConfig })
    expect(posted).toEqual([{ type: 'error', session: 1, message: 'KVM worker has no canvas' }])
    posted.length = 0

    const ctx = fakeContext()
    host.handle({ type: 'init', canvas: { getContext: () => ctx } as unknown as OffscreenCanvas })
    host.handle({ type: 'start', session: 2, config: pipelineConfig })
    push(host, 2, rfbServerHandshake(32, 16))
    expect(ctx.canvas.width).toBe(32)
    const frame = update()
    push(host, 2, frame.slice(0, -1))
    expect(ctx.putImageData).not.toHaveBeenCalled()
    push(host, 2, frame.slice(-1))
    expect(ctx.putImageData).toHaveBeenCalledOnce()
    expect(posted).toContainEqual({ type: 'ready', session: 2 })
    expect(posted).toContainEqual({ type: 'resize', session: 2, width: 32, height: 16 })
    expect(posted.some((event) => event.type === 'send')).toBe(true)
    host.handle({ type: 'stop', session: 2 })
  })

  it('only signals decoded completions, leaving request construction and timers to main', () => {
    vi.useFakeTimers()
    const { host, posted } = createHost()
    host.handle({ type: 'init', canvas: { getContext: () => fakeContext() } as unknown as OffscreenCanvas })
    host.handle({ type: 'start', session: 1, config: { ...pipelineConfig, requestDepth: 2, frameDelayMs: 5 } })
    push(host, 1, rfbServerHandshake(32, 16))
    expect(posted.filter((event) => event.type === 'send').every((event) => event.data[0] !== 3)).toBe(true)
    posted.length = 0
    const frame = update()
    push(host, 1, frame.slice(0, -1))
    expect(posted).toEqual([])
    push(host, 1, frame.slice(-1))
    expect(posted).toEqual([{ type: 'frame-complete', session: 1 }])
    push(host, 1, frameUpdate([]))
    expect(posted).toEqual([
      { type: 'frame-complete', session: 1 },
      { type: 'frame-complete', session: 1 }
    ])
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(posted).toHaveLength(2)
    host.handle({ type: 'stop', session: 1 })
    vi.advanceTimersByTime(2000)
    push(host, 1, frameUpdate([]))
    expect(posted).toHaveLength(2)
    vi.useRealTimers()
  })

  it('ignores data and stops for other sessions', () => {
    const { host, posted } = createHost()
    const ctx = fakeContext()
    host.handle({ type: 'init', canvas: { getContext: () => ctx } as unknown as OffscreenCanvas })
    host.handle({ type: 'start', session: 3, config: pipelineConfig })
    host.handle({ type: 'stop', session: 2 })
    push(host, 2, rfbServerHandshake(32, 16))
    expect(posted).toEqual([])
    expect(ctx.putImageData).not.toHaveBeenCalled()
    push(host, 3, [...rfbServerHandshake(32, 16), ...update()])
    expect(ctx.putImageData).toHaveBeenCalledOnce()
    host.handle({ type: 'stop', session: 3 })
    const count = posted.length
    push(host, 3, update())
    expect(ctx.putImageData).toHaveBeenCalledOnce()
    expect(posted).toHaveLength(count)
  })

  it('keeps the compressed ZRLE dictionary across raw RLE-16 stream chunks', () => {
    const { host, posted } = createHost()
    const ctx = fakeContext()
    host.handle({ type: 'init', canvas: { getContext: () => ctx } as unknown as OffscreenCanvas })
    host.handle({ type: 'start', session: 1, config: { bpp: 2 } })
    push(host, 1, rfbServerHandshake(128, 64))
    const chunks = zrleStream([
      [
        1,
        0,
        248
      ],
      [
        1,
        31,
        0
      ]
    ])
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]
      const size = chunk.length
      push(
        host,
        1,
        frameUpdate([
          [
            ...rectHeader(index * 64, 0, 64, 64, 16),
            (size >>> 24) & 255,
            (size >>> 16) & 255,
            (size >>> 8) & 255,
            size & 255,
            ...chunk
          ]
        ])
      )
    }
    const image = last(ctx.putImageData.mock.calls)[0] as FakeImageData
    expect([...image.data.slice(0, 4)]).toEqual([
      248,
      0,
      0,
      255
    ])
    expect([...image.data.slice(64 * 4, 64 * 4 + 4)]).toEqual([
      0,
      0,
      248,
      255
    ])
    expect(posted.some((event) => event.type === 'error')).toBe(false)
    host.handle({ type: 'stop', session: 1 })
  })

  it('reports decode errors for the session', () => {
    const { host, posted } = createHost()
    host.handle({ type: 'init', canvas: { getContext: () => fakeContext() } as unknown as OffscreenCanvas })
    host.handle({ type: 'start', session: 1, config: pipelineConfig })
    push(host, 1, [...rfbServerHandshake(128, 128), ...frameUpdate([[...rectHeader(0, 0, 99, 1, 0), 7]])])
    expect(last(posted)).toEqual({ type: 'error', session: 1, message: 'Invalid tile size (99,1)' })
  })
})
