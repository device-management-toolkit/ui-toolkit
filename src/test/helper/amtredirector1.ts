/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { AMTRedirector } from '../../core'
import { type RedirectorConfig } from '../../core/AMTRedirector'
// import { FileReader } from '../../core/FileReader'
// import { TypeConverter } from "../../core/converter";

export enum Protocol {
  SOL = 1,
  KVM = 2,
  IDER = 3
}
/**
 * AMTRedirector provides all communication over WebSockets
 */
export class AMTRedirector1 extends AMTRedirector {
  state: number
  socket: any
  host: string
  port: number
  user: string
  pass: string
  tls: number
  authUri: string
  tlsv1only: number
  connectState: number
  protocol: Protocol
  amtAccumulator: string
  amtSequence: number
  amtKeepAliveTimer: any

  fileReader: FileReader
  fileReaderInUse: boolean
  fileReaderAcc: any[]
  randomNonceChars: string
  RedirectStartSol: string
  RedirectStartKvm: string
  RedirectStartIder: string
  urlvars: any
  inDataCount: number
  server: any
  startvariable: number
  stopvariable: number
  onProcessData: (data: string) => void
  onStart: () => void
  onNewState: (state: number) => void
  onStateChanged: (redirector: any, state: number) => void
  onError: () => void

  constructor(config: RedirectorConfig) {
    super(config)
    this.fileReader = config.fr
    this.randomNonceChars = 'abcdef0123456789'
    this.host = config.host
    this.port = config.port
    this.user = config.user
    this.pass = config.pass
    this.tls = config.tls
    this.tlsv1only = config.tls1only
    this.protocol = config.protocol
    this.RedirectStartSol = String.fromCharCode(0x10, 0x00, 0x00, 0x00, 0x53, 0x4f, 0x4c, 0x20)
    this.RedirectStartKvm = String.fromCharCode(0x10, 0x01, 0x00, 0x00, 0x4b, 0x56, 0x4d, 0x52)
    this.RedirectStartIder = String.fromCharCode(0x10, 0x00, 0x00, 0x00, 0x49, 0x44, 0x45, 0x52)
    this.urlvars = {}
    this.server = config.server
    this.amtAccumulator = ''
    this.authUri = ''
    this.startvariable = 0
    this.stopvariable = 0
  }

  /**
   * gets Ws Location and starts a websocket for listening
   * @param c is base type for WebSocket
   */
  start<T>(c: new (path: string, authToken: string) => T): void {
    // Using this generic signature allows us to pass the WebSocket type from unit tests or in producion from a web browser
    this.startvariable = 5
  }

  onSocketConnected(): void {}

  /**
   * Called when there is new data on the websocket
   * @param e data received over the websocket
   */
  onMessage(e: any): void {}

  hex_md5(str: string): string {
    return ''
  }

  socketSend(data: string): void {
    // xxSend
  }

  /**
   * Send sends data over the websocket to the server.
   * @param data data to send to server
   */
  send(data: string): void {
    // send
  }

  sendAmtKeepAlive(): void {}

  generateRandomNonce(length: number): any {
    const r = ''
    return r
  }

  onSocketClosed(e: Event): void {}

  onStateChange(newstate: number): void {}

  stop(): void {
    this.stopvariable = 7
  }
}
