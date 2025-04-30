/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { Desktop } from './Desktop'
import { TypeConverter } from '../core/Converter'
import { isTruthy } from './Utilities/UtilityMethods'
import ZLIB from '../core/zlib/zlib'
/**
 * AMTDesktop represents the Desktop on the browser. Constructed using the canvas context.
 */
export class AMTDesktop extends Desktop {
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
  lastMouseX2: number
  noMouseRotate: boolean
  updateScreenDimensions: (width: number, height: number) => void
  onKvmData: (data: string) => void
  onScreenResize: (width: number, height: number, canvasId: string) => void
  onScreenSizeChange: (width: number, height: number) => void
  setDeskFocus: (el: string, focusmode: number) => void
  getDeskFocus: (el: string) => any

  protocol = 2

  /**
   * Constructs the AMT Desktop
   * @param ctx Canvas Context to draw images
   */
  constructor(ctx: any) {
    super()
    this.inflate = ZLIB.inflateInit(15)
    this.bpp = 1
    this.state = 0
    this.focusMode = 0
    this.useZRLE = true
    this.frameRateDelay = 2
    this.canvasCtx = ctx
    this.sparecache = {}
    this.buttonmask = 0
    this.canvasControl = this.canvasCtx.canvas
    this.lastMouseMoveTime = new Date().getTime()
    this.setDeskFocus = (el, mode) => {}
    this.getDeskFocus = (el) => {}
  }

  /**
   * Called when
   * @param data data to forward to DataProcessor
   */
  processData(data: string): void {
    this.onProcessData(data)
  }

  onStateChange(state: number): void {
    console.log(`state change in AMTDesktop: ${state}`)
    if (state === 0) {
      // Clear Canvas
      this.canvasCtx.fillStyle = '#FFFFFF'
      this.canvasCtx.fillRect(0, 0, this.canvasCtx.canvas.width, this.canvasCtx.canvas.width)
    }
  }

  start(): void {
    console.log('Starting desktop here')
    this.state = 0
    this.inflate.inflateReset()
    // console.log(this.inflate)
    // this.ZRLEfirst = 1;
    // obj.inbytes = 0;
    // obj.outbytes = 0;
    this.onKvmDataPending = []
    this.onKvmDataAck = -1
    this.kvmDataSupported = false
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    for (const i in this.sparecache) {
      delete this.sparecache[i]
    }
  }

  onSendKvmData(data: string): void {
    if (this.onKvmDataAck !== true) {
      this.onKvmDataPending.push(data)
    } else {
      if (isTruthy(this.urlvars) && isTruthy(this.urlvars.kvmdatatrace)) {
        console.debug(`KVM-Send (${data.length}) data`)
      }
      data = '\0KvmDataChannel\0' + data
      this.onSend(String.fromCharCode(6, 0, 0, 0) + TypeConverter.IntToStr(data.length) + data)
      this.onKvmDataAck = false
    }
  }

  onSend: (data: string) => void
}
