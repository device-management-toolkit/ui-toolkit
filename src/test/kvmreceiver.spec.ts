/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type ReceiverConfig, RedirectionReceiver, type WebSocketFactory } from '../core/kvm/RedirectionReceiver'
import { FakeWebSocket, redirectionHandshake, last } from './helper/kvmTestHelpers'

const config: ReceiverConfig = {
  server: 'wss://relay.test/mps/ws/relay',
  host: 'device-guid',
  port: 16994,
  user: '',
  pass: '',
  tls: 0,
  tls1only: 0,
  authToken: 'jwt-token'
}

const setup = (): { receiver: RedirectionReceiver; states: number[]; data: number[][]; starts: () => number } => {
  FakeWebSocket.instances = []
  const states: number[] = []
  const data: number[][] = []
  let starts = 0
  const receiver = new RedirectionReceiver(
    config,
    {
      onStateChange: (s) => states.push(s),
      onStart: () => starts++,
      onData: (d) => data.push([...d])
    },
    FakeWebSocket as unknown as WebSocketFactory
  )
  return { receiver, states, data, starts: () => starts }
}

describe('KVM RedirectionReceiver', () => {
  it('opens the relay socket with the token and starts a KVM redirection session', () => {
    const { receiver, states } = setup()
    receiver.start()
    const ws = FakeWebSocket.last
    expect(ws.url).toBe(
      'wss://relay.test/mps/ws/relay/webrelay.ashx?p=2&host=device-guid&port=16994&tls=0&tls1only=0&mode=kvm'
    )
    expect(ws.protocols).toBe('jwt-token')
    expect(ws.binaryType).toBe('arraybuffer')
    expect(states).toEqual([1])
    ws.open()
    expect(states).toEqual([1, 2])
    expect([...ws.sent[0]]).toEqual([
      0x10,
      0x01,
      0x00,
      0x00,
      0x4b,
      0x56,
      0x4d,
      0x52
    ])
  })

  it('walks the redirection handshake byte for byte like AMTRedirector', () => {
    const { receiver, data, starts } = setup()
    receiver.start()
    const ws = FakeWebSocket.last
    ws.open()

    ws.receive(redirectionHandshake.startReply)
    expect([...ws.sent[1]]).toEqual([
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

    ws.receive(redirectionHandshake.authQueryReply)
    // digest query: user '', uri '' -> length 8
    expect([...ws.sent[2]]).toEqual([
      0x13,
      0,
      0,
      0,
      4,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ])

    ws.receive(redirectionHandshake.authSuccess)
    expect([...ws.sent[3]]).toEqual([
      0x40,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ])

    // Session start and the first RFB bytes in the same message
    ws.receive([
      ...redirectionHandshake.kvmStarted,
      0x52,
      0x46
    ])
    expect(starts()).toBe(1)
    expect(data).toEqual([[0x52, 0x46]])

    ws.receive([
      1,
      2,
      3
    ])
    expect(data[1]).toEqual([
      1,
      2,
      3
    ])
  })

  it('reassembles handshake messages split across socket messages', () => {
    const { receiver, starts } = setup()
    receiver.start()
    const ws = FakeWebSocket.last
    ws.open()
    const all = [
      ...redirectionHandshake.startReply,
      ...redirectionHandshake.authQueryReply,
      ...redirectionHandshake.authSuccess,
      ...redirectionHandshake.kvmStarted
    ]
    for (const b of all) ws.receive([b])
    expect(ws.sent.length).toBe(4)
    expect(starts()).toBe(1)
  })

  it('answers a digest challenge with all fields length prefixed', () => {
    const { receiver } = setup()
    receiver.start()
    const ws = FakeWebSocket.last
    ws.open()
    const challenge = [
      1,
      0x52, // realm 'R'
      1,
      0x4e, // nonce 'N'
      4,
      ...[...'auth'].map((c) => c.charCodeAt(0))
    ]
    ws.receive([
      0x14,
      1,
      0,
      0,
      4,
      challenge.length,
      0,
      0,
      0,
      ...challenge
    ])
    const msg = ws.sent[1]
    expect([...msg.subarray(0, 5)]).toEqual([
      0x13,
      0,
      0,
      0,
      4
    ])
    const len = msg[5] | (msg[6] << 8)
    expect(len).toBe(msg.length - 9)
    // user, realm, nonce, uri, cnonce(32), nc(8), digest(32), qop
    expect(len).toBe(1 + 0 + 2 + 2 + 1 + 33 + 9 + 33 + 5)
  })

  it('only sends RFB data once the KVM session is up', () => {
    const { receiver } = setup()
    receiver.start()
    const ws = FakeWebSocket.last
    ws.open()
    receiver.send(new Uint8Array([9]))
    expect(ws.sent.length).toBe(1)
    ws.receive(redirectionHandshake.kvmStarted)
    receiver.send(new Uint8Array([9]))
    expect([...ws.sent[1]]).toEqual([9])
  })

  it('stops on unknown commands, refused sessions and socket close', () => {
    let s = setup()
    s.receiver.start()
    FakeWebSocket.last.open()
    FakeWebSocket.last.receive([0x99])
    expect(last(s.states)).toBe(0)
    expect(FakeWebSocket.last.closed).toBe(true)

    s = setup()
    s.receiver.start()
    FakeWebSocket.last.open()
    FakeWebSocket.last.receive([
      0x11,
      1,
      0,
      0
    ])
    expect(last(s.states)).toBe(0)

    s = setup()
    s.receiver.start()
    FakeWebSocket.last.open()
    FakeWebSocket.last.onclose?.()
    expect(s.states).toEqual([
      1,
      2,
      0
    ])
  })

  it('omits the subprotocol when there is no token', () => {
    FakeWebSocket.instances = []
    const receiver = new RedirectionReceiver(
      { ...config, authToken: '' },
      { onStateChange: () => {}, onStart: () => {}, onData: () => {} },
      FakeWebSocket as unknown as WebSocketFactory
    )
    receiver.start()
    expect(FakeWebSocket.last.protocols).toBeUndefined()
  })
})
