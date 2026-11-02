/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { vi } from 'vitest'
import { KvmViewer } from '../core/kvm/KvmViewer'
import { KvmWorkerHost } from '../core/kvm/KvmWorkerHost'
import { type KvmWorkerEvent, type KvmWorkerRequest } from '../core/kvm/KvmWorkerProtocol'
import { type WebSocketFactory } from '../core/kvm/RedirectionReceiver'
import { getPixelLut } from '../core/kvm/PixelFormat'
import {
  FakeWebSocket,
  redirectionHandshake,
  rfbServerHandshake,
  frameUpdate,
  rectHeader,
  last
} from './helper/kvmTestHelpers'

const config = { server: 'wss://relay.test/relay', deviceId: 'guid', authToken: 'token', bpp: 1 as const }

describe.each([false, true])('KVM direct stream (worker=%s)', (useWorker) => {
  let viewer: KvmViewer
  let canvas: HTMLCanvasElement
  let ctx: {
    canvas: { width: number; height: number }
    putImageData: ReturnType<typeof vi.fn>
    fillRect: ReturnType<typeof vi.fn>
    fillStyle: string
  }
  let posted: KvmWorkerRequest[]
  let transferred: ArrayBuffer[]
  let receive: (event: KvmWorkerEvent) => void
  let host: KvmWorkerHost
  let workerEvents: KvmWorkerEvent[]

  beforeEach(() => {
    vi.useFakeTimers()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('requestAnimationFrame', undefined)
    vi.stubGlobal(
      'ImageData',
      class {
        constructor(
          readonly data: Uint8ClampedArray,
          readonly width: number,
          readonly height: number
        ) {}
      }
    )
    ctx = { canvas: { width: 0, height: 0 }, putImageData: vi.fn(), fillRect: vi.fn(), fillStyle: '' }
    posted = []
    transferred = []
    workerEvents = []
    host = new KvmWorkerHost({
      onmessage: null,
      postMessage: (event) => receive(event)
    })
    const worker = {
      onmessage: null as ((event: MessageEvent<KvmWorkerEvent>) => void) | null,
      postMessage: (message: KvmWorkerRequest, transfer: Transferable[] = []) => {
        posted.push(message)
        if (message.type === 'data') {
          expect(transfer).toEqual([message.buffer])
          transferred.push(message.buffer)
          host.handle(structuredClone(message, { transfer }))
        } else {
          host.handle(message)
        }
      },
      terminate: vi.fn()
    }
    receive = (event) => {
      workerEvents.push(event)
      worker.onmessage?.({ data: event } as MessageEvent<KvmWorkerEvent>)
    }
    canvas = document.createElement('canvas')
    canvas.getContext = vi.fn().mockReturnValue(ctx)
    canvas.transferControlToOffscreen = () => ({ getContext: () => ctx }) as unknown as OffscreenCanvas
    canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 500, height: 250 }) as DOMRect
    viewer = new KvmViewer(canvas, {
      useWorker,
      createWorker: () => worker as unknown as Worker,
      WebSocket: FakeWebSocket as unknown as WebSocketFactory,
      inputThrottleMs: 0
    })
  })

  afterEach(() => {
    viewer.dispose()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const connect = async (bpp: 1 | 2 = 1): Promise<FakeWebSocket> => {
    viewer.start({ ...config, bpp })
    await vi.advanceTimersByTimeAsync(0)
    const ws = FakeWebSocket.last
    ws.open()
    ws.receive(
      redirectionHandshake.startReply,
      redirectionHandshake.authQueryReply,
      redirectionHandshake.authSuccess,
      redirectionHandshake.kvmStarted
    )
    return ws
  }
  const requests = (ws: FakeWebSocket): number => ws.sent.filter((data) => data[0] === 3 && data.length === 10).length
  const pointer = (clientX: number, clientY: number, button = 0): MouseEvent =>
    ({ clientX, clientY, button, preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as MouseEvent

  it('opens the main-thread socket immediately', () => {
    viewer.start(config)
    expect(viewer.usingWorker).toBe(useWorker)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('restarts and stops immediately without leaving timers behind', () => {
    viewer.start(config)
    const first = FakeWebSocket.last
    viewer.start(config)
    expect(first.closed).toBe(true)
    expect(FakeWebSocket.instances).toHaveLength(2)
    const second = FakeWebSocket.last
    viewer.stop()
    vi.advanceTimersByTime(10000)
    expect(second.closed).toBe(true)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it.each([1, 2] as const)('handles fragmented RFB and depth-two requests, bpp=%s', async (bpp) => {
    const ws = await connect(bpp)
    for (const byte of rfbServerHandshake(128, 128)) ws.receive([byte])
    expect(requests(ws)).toBe(2)
    const firstRequest = ws.sent.findIndex((data) => data[0] === 3 && data.length === 10)
    const encodings = ws.sent.findIndex((data) => data[0] === 2)
    expect(encodings).toBeGreaterThanOrEqual(0)
    expect(firstRequest).toBeGreaterThan(encodings)
    const payload = bpp === 1 ? [0xe0] : [0x00, 0xf8]
    const update = frameUpdate([
      [...rectHeader(0, 0, 1, 1, 0), ...payload],
      [...rectHeader(64, 64, 1, 1, 0), ...payload]
    ])
    for (const byte of update.slice(0, -1)) {
      ws.receive([byte])
      expect(requests(ws)).toBe(2)
    }
    ws.receive(update.slice(-1))
    expect(requests(ws)).toBe(3)
    // Painted once, as soon as the last byte of the update is decoded (never part way through)
    expect(ctx.putImageData).toHaveBeenCalledOnce()
    const image = ctx.putImageData.mock.calls[0][0] as ImageData
    expect(new Uint32Array(image.data.buffer)[64 * 128 + 64]).toBe(getPixelLut(bpp)[bpp === 1 ? 0xe0 : 0xf800])
    ws.receive(frameUpdate([]))
    expect(requests(ws)).toBe(4)
    if (useWorker) expect(transferred.every((buffer) => buffer.byteLength === 0)).toBe(true)
    viewer.stop()
    vi.advanceTimersByTime(2000)
    expect(requests(ws)).toBe(4)
  })

  it('handles the redirection-handshake tail without detaching reusable storage', async () => {
    const ws = await connect()
    // A reconnect exercises the tail in the receiver-owned handshake queue.
    viewer.stop()
    viewer.start(config)
    await vi.advanceTimersByTimeAsync(0)
    const next = FakeWebSocket.last
    next.open()
    next.receive(
      redirectionHandshake.startReply,
      redirectionHandshake.authQueryReply,
      redirectionHandshake.authSuccess,
      [
        ...redirectionHandshake.kvmStarted,
        ...rfbServerHandshake(64, 64),
        ...frameUpdate([])
      ]
    )
    expect(requests(next)).toBe(3)
    expect(ws.closed).toBe(true)
    next.receive(frameUpdate([[...rectHeader(0, 0, 1, 1, 0), 7]]))
    expect(requests(next)).toBe(4)
  })

  it('transfers one raw chunk per socket message rather than per rectangle', async () => {
    const ws = await connect()
    ws.receive(rfbServerHandshake(128, 128))
    posted.length = 0
    const update = frameUpdate(Array.from({ length: 8 }, (_, x) => [...rectHeader(x, 0, 1, 1, 0), 7]))
    ws.receive(update)
    if (useWorker) {
      expect(posted.filter((message) => message.type === 'data')).toHaveLength(1)
      expect(workerEvents.filter((event) => event.type === 'send').every((event) => event.data[0] !== 3)).toBe(true)
      expect(last(transferred).byteLength).toBe(0)
    }
    expect(requests(ws)).toBe(3)
  })

  it('lets main own delayed request refills and cancels them on close', async () => {
    viewer.start({ ...config, frameDelayMs: 5 })
    const ws = FakeWebSocket.last
    ws.open()
    ws.receive(
      redirectionHandshake.startReply,
      redirectionHandshake.authQueryReply,
      redirectionHandshake.authSuccess,
      redirectionHandshake.kvmStarted
    )
    ws.receive(rfbServerHandshake(64, 64))
    expect(requests(ws)).toBe(2)
    ws.receive(frameUpdate([]))
    expect(requests(ws)).toBe(2)
    vi.advanceTimersByTime(5)
    expect(requests(ws)).toBe(3)
    ws.receive(frameUpdate([]))
    viewer.stop()
    if (useWorker) receive({ type: 'frame-complete', session: 1 })
    vi.advanceTimersByTime(10)
    expect(requests(ws)).toBe(3)
  })

  it('keeps keyboard and pointer input on the socket after worker readiness', async () => {
    const ws = await connect()
    const count = ws.sent.length
    viewer.mousemove(pointer(260, 145))
    expect(ws.sent).toHaveLength(count)
    ws.receive(rfbServerHandshake(1000, 500))
    const postedCount = posted.length
    viewer.mousemove(pointer(260, 145))
    expect([...last(ws.sent)]).toEqual([
      5,
      0,
      1,
      244,
      0,
      250
    ])
    const sent = ws.sent.length
    viewer.mousemove(pointer(260, 145))
    expect(ws.sent).toHaveLength(sent)
    viewer.mousedown(pointer(10, 20, 2))
    expect([...last(ws.sent)]).toEqual([
      5,
      4,
      0,
      0,
      0,
      0
    ])
    viewer.mouseup(pointer(9999, 9999, 2))
    expect([...last(ws.sent)]).toEqual([
      5,
      0,
      3,
      231,
      1,
      243
    ])
    viewer.createKeyboardHelper().handleKeyEvent(1, {
      keyCode: 65,
      shiftKey: true,
      preventDefault: vi.fn()
    } as unknown as KeyboardEvent)
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
    expect(posted).toHaveLength(postedCount)
  })

  it('maps only the drawn area of a letterboxed (fullscreen) canvas', async () => {
    const ws = await connect()
    ws.receive(rfbServerHandshake(1000, 500))
    // A fullscreen canvas is object-fit: contain. A 500x500 box shows the 1000x500 screen as 500x250,
    // with 125px bars above and below
    canvas.style.objectFit = 'contain'
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 500 }) as DOMRect
    viewer.mousedown(pointer(250, 250))
    expect([...last(ws.sent)]).toEqual([
      5,
      1,
      1,
      244,
      0,
      250
    ]) // Centre: 500, 250
    viewer.mouseup(pointer(0, 125))
    expect([...last(ws.sent)]).toEqual([
      5,
      0,
      0,
      0,
      0,
      0
    ]) // Top left of the drawn screen
    canvas.style.objectFit = ''
  })

  it('accumulates wheel deltas and sends press/release pairs', async () => {
    const ws = await connect()
    ws.receive(rfbServerHandshake(1000, 500))
    const wheel = (deltaY: number, deltaMode = 0): WheelEvent =>
      ({ ...pointer(260, 145), deltaY, deltaMode }) as unknown as WheelEvent
    const count = ws.sent.length
    viewer.wheel(wheel(-100))
    viewer.wheel(wheel(60))
    expect(ws.sent.slice(count).map((data) => data[1])).toEqual([8, 0])
    viewer.wheel(wheel(40))
    viewer.wheel(wheel(3, 1))
    expect(ws.sent.slice(count).map((data) => data[1])).toEqual([
      8,
      0,
      16,
      0,
      16,
      0
    ])
  })

  it('captures canvas events and removes listeners on dispose', async () => {
    const ws = await connect()
    ws.receive(rfbServerHandshake(1000, 500))
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 60, clientY: 20, button: 0 }))
    expect([...last(ws.sent)]).toEqual([
      5,
      1,
      0,
      100,
      0,
      0
    ])
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 60, clientY: 20, button: 0 }))
    expect([...last(ws.sent)]).toEqual([
      5,
      0,
      0,
      100,
      0,
      0
    ])
    viewer.dispose()
    const count = ws.sent.length
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 20 }))
    expect(ws.sent).toHaveLength(count)
  })

  it('throttles hidden requests and refills to two when visible', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    const ws = await connect()
    ws.receive(rfbServerHandshake(64, 64))
    expect(requests(ws)).toBe(1)
    ws.receive(frameUpdate([]))
    vi.advanceTimersByTime(999)
    expect(requests(ws)).toBe(1)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(requests(ws)).toBe(3)
    viewer.stop()
    vi.advanceTimersByTime(2000)
    expect(requests(ws)).toBe(3)
  })

  it('reports malformed RFB and closes the socket', async () => {
    const error = vi.fn()
    viewer.onError = error
    const ws = await connect()
    ws.receive([...rfbServerHandshake(64, 64), 9])
    expect(ws.closed).toBe(true)
    expect(error).toHaveBeenCalledWith('Unknown RFB message type: 9')
  })

  it('ignores stale sends, readiness, resize and errors after reconnect', async () => {
    await connect()
    const ws = await connect()
    const error = vi.fn()
    viewer.onError = error
    const count = ws.sent.length
    if (useWorker) {
      receive({ type: 'ready', session: 1 })
      receive({ type: 'frame-complete', session: 1 })
      receive({ type: 'resize', session: 1, width: 100, height: 100 })
      receive({ type: 'send', session: 1, data: new Uint8Array([3]) })
      receive({ type: 'error', session: 1, message: 'stale' })
      expect(ws.sent).toHaveLength(count)
      expect(error).not.toHaveBeenCalled()
      expect(ws.closed).toBe(false)
    }
  })
})
