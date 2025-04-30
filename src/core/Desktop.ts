/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type IModule } from './Interfaces'
import { type Protocol } from './AMTRedirector'

/**
 * Desktop is the base class for handling Remote Desktop functionality
 */
class Desktop implements IModule {
  rotation: number
  useZRLE: boolean
  oldMouseX: number
  oldMouseY: number
  lastMouseX: number
  lastMouseY: number
  bpp: number
  kvmDataSupported: boolean
  onKvmDataAck: any
  urlvars: any
  onKvmDataPending: string[]
  sparew: number
  spareh: number
  sparew2: number
  spareh2: number
  spare: ImageData
  sparecache: any
  frameRateDelay: number
  inflate: any
  holding: boolean
  canvasCtx: CanvasRenderingContext2D
  tcanvas: HTMLCanvasElement
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
  canvasControl: HTMLCanvasElement
  scrolldiv: HTMLElement
  lastMouseX2: number
  noMouseRotate: boolean
  protocol: Protocol
  ZLIB: any
  lastMouseMoveTime: number

  processData(data: string): any {}
  updateScreenDimensions: (width: number, height: number) => void
  onStateChange(state: number): any {}
  onKvmData: (data: string) => void
  onScreenResize: (width: number, height: number, canvasId: string) => void
  onScreenSizeChange: (width: number, height: number) => void
  setDeskFocus: (el: string, focusmode: number) => void
  getDeskFocus: (el: string) => CSSStyleDeclaration
  start(): any {}
  onSendKvmData(data: string): any {}

  onSend: (data: string) => void
  onProcessData: (data: string) => void
}

export { Desktop }
