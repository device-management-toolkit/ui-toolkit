/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import md5 from 'md5'
import { ByteQueue } from './ByteQueue'

export interface ReceiverConfig {
  /** Fully resolved relay base URL, e.g. wss://host/mps/ws/relay */
  server: string
  /** Device GUID */
  host: string
  port: number
  user: string
  pass: string
  tls: number
  tls1only: number
  authToken: string
}

export interface ReceiverEvents {
  /** Redirection connection state: 0 = closed, 1 = connecting, 2 = socket open */
  onStateChange: (state: number) => void
  /** The KVM redirection session is established, RFB traffic follows */
  onStart: () => void
  /** owned=true permits transferring the incoming buffer; false denotes reusable handshake storage. */
  onData: (data: Uint8Array, owned: boolean) => void
}

export type WebSocketFactory = new (url: string, protocols?: string | string[]) => WebSocket

const START_REDIRECTION_KVM = [
  0x10,
  0x01,
  0x00,
  0x00,
  0x4b,
  0x56,
  0x4d,
  0x52
]
const NONCE_CHARS = 'abcdef0123456789'

/**
 * Stage 1 of the KVM pipeline: owns the WebSocket and the Intel AMT redirection handshake,
 * then forwards the raw RFB stream untouched. It has no knowledge of frames; frame requests
 * and input are written through send().
 */
export class RedirectionReceiver {
  state = 0
  private socket: WebSocket | null = null
  private readonly queue = new ByteQueue(1024)
  private connected = false
  private readonly authUri = ''

  constructor(
    private readonly config: ReceiverConfig,
    private readonly events: ReceiverEvents,
    private readonly WebSocketImpl: WebSocketFactory = WebSocket
  ) {}

  get url(): string {
    const c = this.config
    return (
      `${c.server}/webrelay.ashx?p=2&host=${c.host}&port=${c.port}&tls=${c.tls}` +
      `${c.user === '*' ? '&serverauth=1' : ''}${typeof c.pass === 'undefined' ? '&serverauth=1&user=' + c.user : ''}` +
      `&tls1only=${c.tls1only}&mode=kvm`
    )
  }

  start(): void {
    this.connected = false
    this.queue.clear()
    const token = this.config.authToken
    const socket = token !== '' ? new this.WebSocketImpl(this.url, token) : new this.WebSocketImpl(this.url)
    socket.binaryType = 'arraybuffer'
    socket.onopen = () => {
      this.setState(2)
      this.socketSend(new Uint8Array(START_REDIRECTION_KVM))
    }
    socket.onmessage = (e: MessageEvent<ArrayBuffer | string>) => {
      this.onMessage(e.data)
    }
    socket.onclose = () => {
      console.warn('Redirection socket closed')
      this.stop()
    }
    this.socket = socket
    this.setState(1)
  }

  /**
   * Sends RFB bytes to the device. Dropped until the redirection session is established.
   */
  send(data: Uint8Array): void {
    if (this.connected) this.socketSend(data)
  }

  stop(): void {
    this.connected = false
    this.queue.clear()
    const socket = this.socket
    this.socket = null
    if (socket != null) {
      socket.onopen = null
      socket.onmessage = null
      socket.onclose = null
      socket.close()
    }
    this.setState(0)
  }

  private setState(state: number): void {
    if (this.state === state) return
    this.state = state
    this.events.onStateChange(state)
  }

  private socketSend(data: Uint8Array): void {
    if (this.socket?.readyState === 1) this.socket.send(data)
  }

  private onMessage(data: ArrayBuffer | string): void {
    const bytes = typeof data === 'string' ? fromLatin1(data) : new Uint8Array(data)
    if (this.connected) {
      this.events.onData(bytes, true)
      return
    }
    this.queue.push(bytes)
    const d = this.queue.bytes
    let pos = 0
    while (pos < d.length && !this.connected && this.socket != null) {
      const consumed = this.handshake(d, pos, d.length - pos)
      if (consumed === 0) break
      pos += consumed
    }
    if (this.connected && pos < d.length) {
      // RFB traffic that arrived together with the session start reply
      this.events.onData(d.subarray(pos), false)
      pos = d.length
    }
    this.queue.consume(pos)
  }

  /**
   * Handles one redirection message. Returns the bytes consumed, or 0 if more data is needed.
   */
  private handshake(d: Uint8Array, pos: number, avail: number): number {
    switch (d[pos]) {
      case 0x11: {
        // StartRedirectionSessionReply
        if (avail < 4) return 0
        if (d[pos + 1] !== 0) {
          console.error(`Redirection session refused, status ${d[pos + 1]}`)
          this.stop()
          return 0
        }
        if (avail < 13) return 0
        const size = 13 + d[pos + 12]
        if (avail < size) return 0
        this.socketSend(
          new Uint8Array([
            0x13,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ])
        ) // Query authentication support
        return size
      }
      case 0x14: {
        // AuthenticateSessionReply
        if (avail < 9) return 0
        const authDataLength = readU32LE(d, pos + 5)
        const size = 9 + authDataLength
        if (avail < size) return 0
        this.authenticate(d[pos + 1], d[pos + 4], d.subarray(pos + 9, pos + size))
        return size
      }
      case 0x2b: // Keep alive
        return avail < 8 ? 0 : 8
      case 0x41: // KVM session established
        if (avail < 8) return 0
        this.connected = true
        this.events.onStart()
        return 8
      default:
        console.error(`Unknown Intel AMT command: ${d[pos]}`)
        this.stop()
        return 0
    }
  }

  private authenticate(status: number, authType: number, authData: Uint8Array): void {
    const { user, pass } = this.config
    const uri = this.authUri
    if (authType === 0) {
      if (authData.includes(4) || authData.includes(3)) {
        // Digest auth query; the relay computes the actual response
        const type = authData.includes(4) ? 4 : 3
        const trailer = type === 4 ? [
                0,
                0,
                0,
                0
              ] : [
                0,
                0,
                0
              ]
        this.sendAuth(type, [
          ...lengthPrefixed(user),
          0,
          0,
          ...lengthPrefixed(uri),
          ...trailer
        ])
      } else if (authData.includes(1)) {
        this.sendAuth(1, [...lengthPrefixed(user), ...lengthPrefixed(pass)])
      } else {
        console.error('Auth type not recognized. Stopping.')
        this.stop()
      }
    } else if ((authType === 3 || authType === 4) && status === 1) {
      let p = 0
      const realm = toLatin1(authData.subarray(p + 1, p + 1 + authData[p]))
      p += authData[p] + 1
      const nonce = toLatin1(authData.subarray(p + 1, p + 1 + authData[p]))
      p += authData[p] + 1
      const qop = authType === 4 ? toLatin1(authData.subarray(p + 1, p + 1 + authData[p])) : ''
      const cnonce = randomNonce(32)
      const nc = '00000002'
      const extra = authType === 4 ? `${nc}:${cnonce}:${qop}:` : ''
      const digest = md5(`${md5(`${user}:${realm}:${pass}`)}:${nonce}:${extra}${md5(`POST:${uri}`)}`)
      const fields = [
        user,
        realm,
        nonce,
        uri,
        cnonce,
        nc,
        digest
      ]
      if (authType === 4) fields.push(qop)
      this.sendAuth(
        authType,
        fields.flatMap((f) => lengthPrefixed(f))
      )
    } else if (status === 0) {
      // Authenticated, start the KVM traffic
      this.socketSend(
        new Uint8Array([
          0x40,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ])
      )
    } else {
      console.error('Redirection authentication failed')
      this.stop()
    }
  }

  private sendAuth(authType: number, payload: number[]): void {
    const msg = new Uint8Array(9 + payload.length)
    msg.set([
      0x13,
      0,
      0,
      0,
      authType
    ])
    const len = payload.length
    msg.set(
      [
        len & 0xff,
        (len >> 8) & 0xff,
        (len >> 16) & 0xff,
        (len >>> 24) & 0xff
      ],
      5
    )
    msg.set(payload, 9)
    this.socketSend(msg)
  }
}

function readU32LE(d: Uint8Array, p: number): number {
  return (d[p] | (d[p + 1] << 8) | (d[p + 2] << 16)) + d[p + 3] * 0x1000000
}

function lengthPrefixed(s: string): number[] {
  return [s.length, ...fromLatin1(s)]
}

export function fromLatin1(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff
  return bytes
}

function toLatin1(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes)
}

function randomNonce(length: number): string {
  let r = ''
  for (let i = 0; i < length; i++) r += NONCE_CHARS.charAt(Math.floor(Math.random() * NONCE_CHARS.length))
  return r
}
