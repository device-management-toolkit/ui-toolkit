/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type ICommunicator } from '../Interfaces/ICommunicator'
import { type Desktop } from '../Desktop'
import { TypeConverter } from '../Converter'
import { ImageHelper } from './ImageHelper'
import { isTruthy } from './UtilityMethods'

/**
 * Mousehelper provides helper functions for handling mouse events. mouseup, mousedown, mousemove
 */
export class MouseHelper {
  parent: Desktop
  comm: ICommunicator
  MouseInputGrab: boolean
  lastEvent: any
  debounceTime: number
  mouseClickCompleted: boolean
  topposition = 0
  leftposition = 0
  constructor(parent: Desktop, comm: ICommunicator, debounceTime: number) {
    this.parent = parent
    this.comm = comm
    this.debounceTime = debounceTime
    this.mouseClickCompleted = true
    this.lastEvent = null
  }

  GrabMouseInput(): any {
    if (this.MouseInputGrab) return
    this.MouseInputGrab = true
  }

  UnGrabMouseInput(): any {
    if (!this.MouseInputGrab) return
    const c = this.parent.canvasCtx.canvas
    c.onmousemove = null
    c.onmouseup = null
    c.onmousedown = null
    // if (navigator.userAgent.match(/mozilla/i)) c.DOMMouseScroll = null; else c.onmousewheel = null;
    this.MouseInputGrab = false
  }

  mousedown(e: MouseEvent): any {
    this.parent.buttonmask |= 1 << e.button
    return this.mousemove(e)
  }

  mouseup(e: MouseEvent): any {
    this.parent.buttonmask &= 0xffff - (1 << e.button)
    return this.mousemove(e)
  }

  mousemove(e: MouseEvent): boolean {
    if (this.parent.state !== 4) return true
    const pos = this.getPositionOfControl(this.parent.canvasControl)
    const bcr = this.parent.canvasControl.getBoundingClientRect()
    if (this.topposition === 0 || bcr.top > this.topposition) {
      this.topposition = bcr.top
    }
    if (this.leftposition === 0 || bcr.left > this.leftposition) {
      this.leftposition = bcr.left
    }
    const topOffset = this.topposition - bcr.top
    const leftOffset = this.leftposition - bcr.left
    this.parent.lastMouseX =
      (e.pageX - pos[0] + leftOffset) * (this.parent.canvasControl.height / this.parent.canvasControl.offsetHeight)
    this.parent.lastMouseY =
      (e.pageY - pos[1] + topOffset) * (this.parent.canvasControl.width / this.parent.canvasControl.offsetWidth)

    if (!isTruthy(this.parent.noMouseRotate)) {
      this.parent.lastMouseX2 = ImageHelper.crotX(this.parent, this.parent.lastMouseX, this.parent.lastMouseY)
      this.parent.lastMouseY = ImageHelper.crotY(this.parent, this.parent.lastMouseX, this.parent.lastMouseY)
      this.parent.lastMouseX = this.parent.lastMouseX2
    }

    this.comm.send(
      String.fromCharCode(5, this.parent.buttonmask) +
        TypeConverter.ShortToStr(this.parent.lastMouseX) +
        TypeConverter.ShortToStr(this.parent.lastMouseY)
    )

    // Update focus area if we are in focus mode
    this.parent.setDeskFocus('DeskFocus', this.parent.focusMode)
    if (this.parent.focusMode !== 0) {
      const x = Math.min(this.parent.lastMouseX, this.parent.canvasControl.width - this.parent.focusMode)
      const y = Math.min(this.parent.lastMouseY, this.parent.canvasControl.height - this.parent.focusMode)
      const df = this.parent.focusMode * 2
      const c = this.parent.canvasControl
      const qx = c.offsetHeight / this.parent.canvasControl.height
      const qy = c.offsetWidth / this.parent.canvasControl.width
      const q = this.parent.getDeskFocus('DeskFocus')
      const ppos = this.getPositionOfControl(this.parent.canvasControl.parentElement)
      q.left = `${Math.max((x - this.parent.focusMode) * qx, 0) + (pos[0] - ppos[0])}px`
      q.top = `${Math.max((y - this.parent.focusMode) * qy, 0) + (pos[1] - ppos[1])}px`
      q.width = `${df * qx - 6}px`
      q.height = `${df * qx - 6}px`
    }

    return this.haltEvent(e)
  }

  haltEvent(e: any): boolean {
    if (isTruthy(e.preventDefault)) {
      e.preventDefault()
    }
    if (isTruthy(e.stopPropagation)) {
      e.stopPropagation()
    }
    return false
  }

  getPositionOfControl(c: HTMLElement | null): number[] {
    const Position = [0, 0]

    let control: HTMLElement | null = c
    while (control != null) {
      Position[0] = Number(Position[0]) + Number(control.offsetLeft)
      Position[1] = Number(Position[1]) + Number(control.offsetTop)
      control = control.offsetParent as HTMLElement
    }
    return Position
  }

  resetOffsets(): void {
    this.topposition = 0
    this.leftposition = 0
  }
}
