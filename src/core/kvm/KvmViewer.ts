/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import workerSource from '@kvm-worker-source'
import { type ICommunicator } from '../Interfaces'
import { type Desktop } from '../Desktop'
import { KeyBoardHelper } from '../Utilities/KeyboardHelper'
import { KvmSession, type KvmSessionConfig } from './KvmSession'
import { type KvmWorkerEvent, type KvmWorkerRequest } from './KvmWorkerProtocol'
import { type BytesPerPixel } from './PixelFormat'
import { DEFAULT_MOVE_INTERVAL_MS, InputThrottler } from './InputThrottler'
import { FrameRequester } from './FrameRequester'
import { fromLatin1, RedirectionReceiver, type WebSocketFactory } from './RedirectionReceiver'

// One wheel notch is ~100 px in Chrome/Edge and 3 lines in Firefox
const WHEEL_STEP_PX = 100
const WHEEL_LINE_PX = WHEEL_STEP_PX / 3
const WHEEL_PAGE_PX = 800
const WHEEL_MAX_STEPS = 5
const WHEEL_UP_MASK = 1 << 3
const WHEEL_DOWN_MASK = 1 << 4
// Outstanding framebuffer update requests: one update can be decoded while the next is in flight
const REQUEST_DEPTH = 2

export interface KvmConnectConfig {
  /** Relay base URL, e.g. wss://host/mps/ws/relay. Derived from the page location if empty. */
  server?: string
  deviceId: string
  authToken: string
  /** 1 = RGB332 (RLE 8), 2 = RGB565 (RLE 16) */
  bpp: BytesPerPixel
  port?: number
  /** Delay before requesting the next update once one has been decoded. Default 0. */
  frameDelayMs?: number
}

export interface KvmViewerOptions {
  /** false forces the main thread pipeline. Default: use a worker when OffscreenCanvas is supported. */
  useWorker?: boolean
  /** Supply the KVM worker yourself, e.g. when a CSP disallows blob: workers */
  createWorker?: () => Worker
  /** Listen to mouse events on the canvas directly (default true). Set false to call mousedown/up/move yourself. */
  captureMouse?: boolean
  /**
   * Minimum time between pointer moves (default 33 ms, ~30 Hz). The first move after a quiet period is
   * sent at once and the latest position always follows; 0 sends every move immediately.
   * Clicks, wheel steps and keyboard events are never delayed.
   */
  inputThrottleMs?: number
  WebSocket?: WebSocketFactory
}

/**
 * Main thread facade of the KVM pipeline.
 *
 * Input latency comes first: the socket (Receiver) lives here on the main thread, so keyboard and
 * mouse events are written to it the moment they happen and never queue behind frame decoding.
 * With worker support the canvas is transferred once. Incoming RFB chunks transfer directly to
 * the worker for parsing, decoding and painting; protocol replies return to the main-thread socket
 * and framebuffer update requests are scheduled here. Without worker support the whole pipeline
 * runs here.
 */
export class KvmViewer {
  onConnectionStateChange: ((state: number) => void) | null = null
  onScreenSizeChange: ((width: number, height: number) => void) | null = null
  onError: ((message: string) => void) | null = null

  /** Minimal communicator so the existing KeyBoardHelper can send key events through the viewer */
  readonly communicator = {
    send: (data: string) => {
      this.sendInput(fromLatin1(data))
    }
  } as unknown as ICommunicator

  private worker: Worker | null = null
  private workerUrl: string | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private session: KvmSession | null = null
  private receiver: RedirectionReceiver | null = null
  private requester: FrameRequester | null = null
  private sessionId = 0
  private rfbReady = false
  private remoteWidth = 0
  private remoteHeight = 0
  private buttonMask = 0
  private lastPointer = ''
  private wheelDelta = 0
  private disposed = false
  private readonly captureMouse: boolean
  private readonly WebSocketImpl: WebSocketFactory | undefined
  private readonly input: InputThrottler

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: KvmViewerOptions = {}
  ) {
    this.captureMouse = options.captureMouse !== false
    this.WebSocketImpl = options.WebSocket
    this.input = new InputThrottler((data) => {
      this.deliver(data)
    }, options.inputThrottleMs ?? DEFAULT_MOVE_INTERVAL_MS)
    if (options.useWorker !== false) this.worker = this.createWorker(options)
    if (this.worker != null) {
      const offscreen = canvas.transferControlToOffscreen()
      this.post({ type: 'init', canvas: offscreen }, [offscreen])
      this.worker.onmessage = (e: MessageEvent<KvmWorkerEvent>) => {
        this.onWorkerEvent(e.data)
      }
      this.worker.onerror = (e: ErrorEvent) => {
        console.error(`KVM worker error: ${e.message}`)
        this.onError?.(e.message)
      }
    } else {
      this.ctx = canvas.getContext('2d')
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    if (this.captureMouse) {
      canvas.addEventListener('mousedown', this.onMouseDown)
      canvas.addEventListener('mouseup', this.onMouseUp)
      canvas.addEventListener('mousemove', this.onMouseMove)
      canvas.addEventListener('wheel', this.onWheel, { passive: false })
    }
  }

  get usingWorker(): boolean {
    return this.worker != null
  }

  start(config: KvmConnectConfig): void {
    if (this.disposed) return
    this.stop()
    this.connect(config)
  }

  private connect(config: KvmConnectConfig): void {
    const sessionConfig: KvmSessionConfig = {
      server: resolveServer(config.server),
      host: config.deviceId,
      port: config.port ?? 16994,
      user: '',
      pass: '',
      tls: 0,
      tls1only: 0,
      authToken: config.authToken,
      bpp: config.bpp,
      frameDelayMs: config.frameDelayMs,
      requestDepth: REQUEST_DEPTH
    }
    if (this.worker != null) {
      this.startWithWorker(sessionConfig)
    } else if (this.ctx != null) {
      this.session = new KvmSession(
        this.ctx,
        sessionConfig,
        {
          onConnectionStateChange: (state) => {
            this.onState(state)
          },
          onScreenSizeChange: (width, height) => {
            this.onResize(width, height)
          },
          onError: (message) => {
            this.onError?.(message)
          }
        },
        { WebSocket: this.WebSocketImpl }
      )
      this.session.setVisible(!document.hidden)
      this.session.start()
    }
  }

  stop(): void {
    this.requester?.stop()
    this.requester = null
    this.buttonMask = 0
    this.lastPointer = ''
    this.input.clear()
    const session = this.session
    this.session = null
    session?.stop()
    this.receiver?.stop()
  }

  dispose(): void {
    if (this.disposed) return
    this.stop()
    this.disposed = true
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    if (this.captureMouse) {
      this.canvas.removeEventListener('mousedown', this.onMouseDown)
      this.canvas.removeEventListener('mouseup', this.onMouseUp)
      this.canvas.removeEventListener('mousemove', this.onMouseMove)
      this.canvas.removeEventListener('wheel', this.onWheel)
    }
    this.worker?.terminate()
    this.worker = null
    if (this.workerUrl != null) URL.revokeObjectURL(this.workerUrl)
    this.workerUrl = null
  }

  createKeyboardHelper(): KeyBoardHelper {
    // KeyBoardHelper only uses its communicator; it never touches the Desktop it is given
    return new KeyBoardHelper(null as unknown as Desktop, this.communicator)
  }

  mousedown(e: MouseEvent): boolean {
    this.buttonMask |= 1 << e.button
    return this.pointer(e)
  }

  mouseup(e: MouseEvent): boolean {
    this.buttonMask &= 0xffff - (1 << e.button)
    return this.pointer(e)
  }

  mousemove(e: MouseEvent): boolean {
    return this.pointer(e)
  }

  /**
   * Scrolls the remote screen. RFB has no wheel message: each step is a press and release of
   * button 4 (up) or 5 (down). Small trackpad deltas add up until they reach one step.
   */
  wheel(e: WheelEvent): boolean {
    e.preventDefault?.()
    e.stopPropagation?.()
    const pos = this.toRemote(e)
    if (pos == null) return false
    const px = e.deltaY * (e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? WHEEL_PAGE_PX : 1)
    this.wheelDelta += px
    const steps = Math.trunc(this.wheelDelta / WHEEL_STEP_PX)
    if (steps === 0) return false
    this.wheelDelta -= steps * WHEEL_STEP_PX
    const button = steps < 0 ? WHEEL_UP_MASK : WHEEL_DOWN_MASK
    for (let i = 0; i < Math.min(Math.abs(steps), WHEEL_MAX_STEPS); i++) {
      if (!this.sendPointer(pos[0], pos[1], this.buttonMask | button)) break
      this.sendPointer(pos[0], pos[1])
    }
    this.lastPointer = `${pos[0]},${pos[1]},${this.buttonMask}`
    return false
  }

  /**
   * Sends raw RFB client messages (keyboard, pointer) to the socket; only pointer moves are throttled.
   * False if dropped because the RFB handshake is not done.
   */
  sendInput(data: Uint8Array): boolean {
    if (!this.inputReady) return false
    this.input.push(data)
    return true
  }

  private get inputReady(): boolean {
    return this.session != null ? this.session.ready : this.rfbReady && this.receiver != null
  }

  /** Writes (possibly batched) input to the socket; dropped if the session ended meanwhile */
  private deliver(data: Uint8Array): void {
    if (this.session != null) this.session.sendInput(data)
    else if (this.rfbReady) this.receiver?.send(data)
  }

  private startWithWorker(config: KvmSessionConfig): void {
    const session = ++this.sessionId
    this.rfbReady = false
    this.requester = new FrameRequester(
      (data) => {
        this.receiver?.send(data)
      },
      config.frameDelayMs ?? 0,
      undefined,
      REQUEST_DEPTH
    )
    this.requester.setHidden(document.hidden)
    this.post({ type: 'start', session, config: { bpp: config.bpp } })
    const receiver = new RedirectionReceiver(
      config,
      {
        onStateChange: (state) => {
          if (session !== this.sessionId) return
          if (state === 0) {
            this.requester?.stop()
            this.requester = null
            this.rfbReady = false
            this.receiver = null
            this.post({ type: 'stop', session })
          }
          this.onState(state)
        },
        onStart: () => this.post({ type: 'reset', session }),
        onData: (data, owned) => {
          // Only the handshake tail borrows receiver storage and needs an ownership copy.
          const bytes = owned ? data : data.slice()
          const buffer = bytes.buffer as ArrayBuffer
          this.post({ type: 'data', session, buffer, offset: bytes.byteOffset, length: bytes.byteLength }, [buffer])
        }
      },
      this.WebSocketImpl
    )
    this.receiver = receiver
    receiver.start()
  }

  private onWorkerEvent(msg: KvmWorkerEvent): void {
    if (msg.session !== this.sessionId) return
    switch (msg.type) {
      case 'send':
        this.receiver?.send(msg.data)
        break
      case 'ready':
        if (this.receiver != null) {
          this.rfbReady = true
          this.requester?.start(this.remoteWidth, this.remoteHeight)
        }
        break
      case 'resize':
        if (this.receiver != null) {
          this.requester?.onDesktopResize(msg.width, msg.height)
          this.onResize(msg.width, msg.height)
        }
        break
      case 'frame-complete':
        this.requester?.onUpdateComplete()
        break
      case 'error':
        this.receiver?.stop()
        this.onError?.(msg.message)
        break
    }
  }

  private onState(state: number): void {
    if (state === 0) {
      this.buttonMask = 0
      this.lastPointer = ''
      this.input.clear()
    }
    this.onConnectionStateChange?.(state)
  }

  private onResize(width: number, height: number): void {
    this.remoteWidth = width
    this.remoteHeight = height
    this.onScreenSizeChange?.(width, height)
  }

  private readonly onMouseDown = (e: MouseEvent): void => {
    this.mousedown(e)
  }

  private readonly onMouseUp = (e: MouseEvent): void => {
    this.mouseup(e)
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    this.mousemove(e)
  }

  private readonly onWheel = (e: WheelEvent): void => {
    this.wheel(e)
  }

  /** Pointer events go out immediately; only exact repeats of the last event are skipped */
  private pointer(e: MouseEvent): boolean {
    e.preventDefault?.()
    e.stopPropagation?.()
    const pos = this.toRemote(e)
    if (pos == null) return false
    const key = `${pos[0]},${pos[1]},${this.buttonMask}`
    if (key === this.lastPointer) return false
    if (this.sendPointer(pos[0], pos[1])) this.lastPointer = key
    return false
  }

  /**
   * Maps a mouse event into the remote screen. A fullscreen canvas is letterboxed (object-fit:
   * contain), so only the area the screen is drawn in is mapped; borders are excluded.
   */
  private toRemote(e: MouseEvent): [number, number] | null {
    if (this.remoteWidth === 0 || this.remoteHeight === 0) return null
    const canvas = this.canvas
    const rect = canvas.getBoundingClientRect()
    const borderX = canvas.clientLeft ?? 0
    const borderY = canvas.clientTop ?? 0
    let left = rect.left + borderX
    let top = rect.top + borderY
    let width = rect.width - 2 * borderX
    let height = rect.height - 2 * borderY
    if (width <= 0 || height <= 0) return null
    if (typeof getComputedStyle === 'function' && getComputedStyle(canvas).objectFit === 'contain') {
      const scale = Math.min(width / this.remoteWidth, height / this.remoteHeight)
      left += (width - this.remoteWidth * scale) / 2
      top += (height - this.remoteHeight * scale) / 2
      width = this.remoteWidth * scale
      height = this.remoteHeight * scale
    }
    const x = Math.floor(((e.clientX - left) * this.remoteWidth) / width)
    const y = Math.floor(((e.clientY - top) * this.remoteHeight) / height)
    return [Math.min(Math.max(x, 0), this.remoteWidth - 1), Math.min(Math.max(y, 0), this.remoteHeight - 1)]
  }

  private sendPointer(x: number, y: number, mask = this.buttonMask): boolean {
    return this.sendInput(
      new Uint8Array([
        5,
        mask,
        (x >> 8) & 0xff,
        x & 0xff,
        (y >> 8) & 0xff,
        y & 0xff
      ])
    )
  }

  private readonly onVisibilityChange = (): void => {
    const visible = !document.hidden
    this.requester?.setHidden(!visible)
    this.session?.setVisible(visible)
  }

  private post(msg: KvmWorkerRequest, transfer: Transferable[] = []): void {
    this.worker?.postMessage(msg, transfer)
  }

  private createWorker(options: KvmViewerOptions): Worker | null {
    try {
      if (options.createWorker != null) return options.createWorker()
      if (
        typeof Worker !== 'function' ||
        typeof OffscreenCanvas !== 'function' ||
        typeof this.canvas.transferControlToOffscreen !== 'function' ||
        workerSource === ''
      ) {
        return null
      }
      this.workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))
      return new Worker(this.workerUrl)
    } catch (e) {
      console.warn(`KVM worker unavailable, rendering on the main thread: ${String(e)}`)
      if (this.workerUrl != null) URL.revokeObjectURL(this.workerUrl)
      this.workerUrl = null
      return null
    }
  }
}

function resolveServer(server: string | undefined): string {
  if (server != null && server !== '') return server
  const { protocol, host, pathname } = window.location
  return `${protocol.replace('http', 'ws')}//${host}${pathname.substring(0, pathname.lastIndexOf('/'))}`
}
