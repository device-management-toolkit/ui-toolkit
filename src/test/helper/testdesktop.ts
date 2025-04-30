/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { Desktop } from '../../core'
import { ZLib } from '../helper/testzlib'

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
    this.inflate = new ZLib()
    this.bpp = 1
    this.state = 0
    this.focusMode = 0
    this.useZRLE = true
    this.frameRateDelay = 2
    this.canvasControl = {
      getBoundingClientRect: () => {
        return { top: 5, left: 5 }
      }
    }
    this.setDeskFocus = () => {}
    this.getDeskFocus = () => {
      return { left: 0, top: 0, width: 1, height: 1 }
    }
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

  processData(data: string): any {
    this.onProcessData(data)
  }

  onStateChange(state: number): void {
    console.log('state change', state)
  }

  start(): void {
    console.log('Starting desktop here')
  }

  onSendKvmData(data: string): void {}

  onSend: (data: string) => void
}

export { AmtDesktop }
