/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AMTRedirector, type RedirectorConfig } from '../core/AMTRedirector'

describe('Test AMT redirector class', () => {
  let config: RedirectorConfig
  let redirector: AMTRedirector

  beforeEach(() => {
    config = {
      mode: 'kvm',
      protocol: 1,
      fr: new FileReader(),
      host: '',
      port: 16994,
      user: '',
      pass: '',
      tls: 1,
      tls1only: 1,
      authToken: '',
      server: ''
    }
    redirector = new AMTRedirector(config)
  })

  it('', () => {
    redirector.hex_md5('string')
    redirector.socket = new WebSocket('wss://localhost:3000')
    redirector.sendAmtKeepAlive()
    redirector.generateRandomNonce(10)
  })

  it('test the socket connected function', () => {
    redirector.onNewState = jest.fn()
    redirector.urlvars = {
      redirtrace: 'redirector'
    }
    redirector.onSocketConnected()

    expect(redirector.state).toEqual(2)
  })

  it('should send the data over websocket to the server', () => {
    const data = '0x28'
    redirector.send(data)
    expect(redirector.protocol).toEqual(1)
  })

  it('should process the socket data received ', () => {
    const event = {
      data: {
        data: 'stringdata'
      }
    }
    redirector.onMessage(event as any)

    expect(redirector.fileReaderInUse).toEqual(true)
  })

  it('should send the received settings data to the data processor', () => {
    const event = { data: '!+\t\t\t\t\t)\t\t\t\t\t\v\v\v\v\v\v\t\t\t\t\v\v\v' } as any
    redirector.onError = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)
    expect(redirector.connectState).toBe(-1)
  })

  it('should send the received redirection data to the data processor', () => {
    const dataStream = `${String.fromCharCode(17)}${String.fromCharCode(0)}\v\v\v\v\v\v\v\v\v\v\v\v`
    const event = { data: dataStream } as any
    redirector.onError = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)
    expect(redirector.amtAccumulator.length).toEqual(14)
  })

  it('should send the received authentication data to the data processor', () => {
    const dataStream = `${String.fromCharCode(20)}123456789`
    const event = { data: dataStream } as any
    redirector.onError = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)

    expect(redirector.port).toEqual(16994)
  })

  it('should send the received serial setting data to the data processor', () => {
    const event = { data: ')\t\t\t\t\t\t\t\t\t\t\t' } as any
    redirector.onError = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)
    expect(redirector.connectState).toBe(-1)
  })

  it('should send the received display data to the data processor', () => {
    const event = { data: '*!@123qwerty' } as any
    redirector.onError = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)
    expect(redirector.port).toEqual(16994)
  })

  it('should send the received KVM data to the data processor', () => {
    const event = { data: 'A\t\t\t\t\t\t\t\t\t\t\t' } as any
    redirector.onError = jest.fn()
    redirector.onStart = jest.fn()
    redirector.onProcessData = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)
    expect(redirector.protocol).toEqual(1)
  })

  it('should send the received keepalive message data to the data processor', () => {
    const event = { data: '+\t\t\t\t\t\t\t\t\t\t\t' } as any
    redirector.onError = jest.fn()
    redirector.onNewState = jest.fn()
    redirector.onMessage(event)
    expect(redirector.connectState).toBe(-1)
  })

  it('should send the data to the server over websocket', () => {
    redirector.socket = new WebSocket('wss://localhost:3000')
    redirector.socket.onopen = jest.fn()
    redirector.urlvars = {
      redirtrace: 'redirector'
    }
    redirector.socketSend('')
    expect(redirector.port).toEqual(16994)
  })

  it('should disconnect the socket connection when socket is closed', () => {
    const event: any = {}
    redirector.onNewState = jest.fn()
    redirector.urlvars = {
      redirtrace: 'redirector'
    }
    redirector.onSocketClosed(event)

    expect(redirector.connectState).toEqual(-1)
  })
})
