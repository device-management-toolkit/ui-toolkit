/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type IDataProcessor } from '../core'
import { DataProcessor } from '../core/ImageData/DataProcessor'
import { Desktop } from '../core/Desktop'
import { type IKvmDataCommunicator } from '../core/Interfaces/ICommunicator'
import { AMTKvmDataRedirector } from '../core/AMTKvmDataRedirector'
import { TypeConverter } from '../core/Converter'
import { isTruthy } from '../core/Utilities/UtilityMethods'

import FileReader from 'filereader'
import WebSocket from 'ws'
import ZLIB from '../core/zlib/zlib'
import { type RedirectorConfig } from '../core/AMTRedirector'

class AmtDesktop extends Desktop {
  rotation: number
  useZRLE: boolean
  oldMouseX: number
  oldMouseY: number
  lastMouseX: number
  lastMouseY: number
  bpp: number // Bytes per pixel
  kvmDataSupported: boolean
  onKvmDataAck: any
  urlvars: any
  onKvmDataPending: any[]
  sparew: number
  spareh: number
  sparew2: number
  spareh2: number
  spare: any
  sparecache: any
  frameRateDelay: number
  inflate: any
  holding: boolean
  canvasCtx: any
  tcanvas: any
  width: number
  height: number
  canvasId: string
  focusMode: number
  rwidth: number
  rheight: number
  ScreenWidth: number
  ScreenHeight: number
  lastKeepAlive: number
  buttonmask: number
  state: number
  canvasControl: any
  scrolldiv: any
  focusmode: number
  lastMouseX2: number
  noMouseRotate: boolean
  updateScreenDimensions: (width: number, height: number) => void
  onKvmData: (data: string) => void
  onScreenResize: (width: number, height: number, canvasId: string) => void
  onScreenSizeChange: (width: number, height: number) => void
  setDeskFocus: (el: string, focusmode: number) => void
  getDeskFocus: (el: string) => any

  protocol = 2

  constructor() {
    super()
    this.inflate = ZLIB.inflateInit(15)
    this.bpp = 1
    this.state = 0
    this.focusMode = 0
    this.useZRLE = true
    this.frameRateDelay = 2
    this.canvasCtx = {
      canvas: {
        width: 0,
        height: 0
      },
      createImageData: (width, height) => {
        console.log('spare width height', width, height)
        const spare: any = { data: [] }
        for (let index = 0; index < width * height; index++) {
          spare.data[index] = 0
        }
        return spare
      },
      putImageData: (spare, x, y) => {
        console.log('image x y', x, y)
      },
      fillRect: (x, y, width, height) => {
        console.log('fill rect', x, y, width, height)
      }
    }
    this.sparecache = {}
  }

  processData(data: string): void {
    this.onProcessData(data)
  }

  onStateChange(state: number): void {
    console.log('state change', state)
  }

  start(): void {
    console.log('Starting desktop here')
    this.state = 0
    this.inflate.inflateReset()
    console.log(this.inflate)
    this.onKvmDataPending = []
    this.onKvmDataAck = -1
    this.kvmDataSupported = false
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    for (const i in this.sparecache) {
      delete this.sparecache[i]
    }
  }

  onSendKvmData(data: string): any {
    if (this.onKvmDataAck !== true) {
      this.onKvmDataPending.push(data)
    } else {
      if (isTruthy(this.urlvars) && isTruthy(this.urlvars.kvmdatatrace)) {
        console.log(`KVM-Send(${data.length}): ${data}`)
      }
      data = '\0KvmDataChannel\0' + data
      this.onSend(String.fromCharCode(6, 0, 0, 0) + TypeConverter.IntToStr(data.length) + data)
      this.onKvmDataAck = false
    }
  }

  onSend: (data: string) => void
}

class UIToolKitKVM {
  module: Desktop
  dataProcessor: IDataProcessor
  redirector: IKvmDataCommunicator
  config: RedirectorConfig = {
    protocol: 2,
    fr: new FileReader(),
    host: '800626f0-aca4-4751-803d-d45ddf075ad1',
    port: 16994,
    user: '',
    pass: '',
    tls: 0,
    tls1only: 0,
    authToken: '104.42.171.35/mps'
  }

  constructor() {
    this.module = new AmtDesktop()
    this.redirector = new AMTKvmDataRedirector(this.config)
    this.dataProcessor = new DataProcessor(this.redirector, new AmtDesktop())

    this.redirector.onProcessData = this.module.processData.bind(this.module)
    this.redirector.onStart = this.module.start.bind(this.module)
    this.redirector.onNewState = this.module.onStateChange.bind(this.module)
    this.redirector.onSendKvmData = this.module.onSendKvmData.bind(this.module)

    this.module.onSend = this.redirector.send.bind(this.redirector)
    this.module.onProcessData = this.dataProcessor.processData.bind(this.dataProcessor)
  }

  sendKvmData(data: string): any {}

  onSend(data: string): any {}

  start(): void {
    this.redirector.start(WebSocket)
  }
}

const d = new UIToolKitKVM()
d.start()
