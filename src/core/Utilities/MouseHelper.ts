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
    const [fbX, fbY] = this.getFramebufferPosition(e)
    this.parent.lastMouseX = fbX
    this.parent.lastMouseY = fbY

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

  /**
   * Maps a mouse event to remote framebuffer pixel coordinates.
   * 
   * Works from the canvas's on-screen box (getBoundingClientRect + clientX/Y),
   * so page scrolling, CSS scaling and transforms need no special handling, and
   * scales each axis by its own ratio. It also honours object-fit: browsers
   * give a fullscreen element `object-fit: contain`, which letterboxes the
   * picture inside the element whenever the remote aspect ratio differs from
   * the screen's.
   */
  getFramebufferPosition(e: MouseEvent): [number, number] {
    const c = this.parent.canvasControl
    const fbW: number = c.width
    const fbH: number = c.height
    if (fbW <= 0 || fbH <= 0) return [0, 0]
    const r = c.getBoundingClientRect()
    if (r.width <=0 || r.height <= 0) return [0, 0]

    let scaleX = r.width / fbW
    let scaleY = r.height / fbH
    let offsetX = 0
    let offsetY = 0
    const fit = this.getObjectFit(c)
    if (fit === 'contain' || fit === 'scale-down') {
      let s = Math.min(scaleX, scaleY)
      if (fit === 'scale-down') s = Math.min(s, 1)
        offsetX = (r.width - fbW * s) / 2 // default object-position: 50% 50%
        offsetY = (r.height - fbH * s) / 2
        scaleX = scaleY = s
    }

    const x = Math.floor((e.clientX - r.left - offsetX) / scaleX)
    const y = Math.floor((e.clientY - r.top - offsetY) / scaleY)
    return [Math.min(Math.max(x, 0), fbW - 1), Math.min(Math.max(y, 0), fbH - 1)]
  }

  private getObjectFit(c: HTMLElement): string {
    try {
      if (typeof getComputedStyle === 'function') return getComputedStyle(c).objectFit ?? ''
    } catch {
      // not a real element (tests) - treat as CSS default
    }
    return ''
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

  /** @deprecated Offsets are no longer cached; kept for API compatibility */
  resetOffsets(): void {
    this.topposition = 0
    this.leftposition = 0
  }
}
