/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TestEvent } from "./testEvent"

class TestMouseEvent extends TestEvent implements MouseEvent {
  altKey = false
  button = 0
  buttons = 0
  clientX = 0
  clientY = 0
  ctrlKey = false
  detail = 0
  metaKey = false
  movementX = 0
  movementY = 0
  offsetX = 0
  offsetY = 0
  pageX = 0
  pageY = 0
  relatedTarget: EventTarget | null = null
  screenX = 0
  screenY = 0
  shiftKey = false
  view: Window | null = null
  which = 0
  x = 0
  y = 0
  
  // Add the missing properties
  layerX = 0
  layerY = 0

  // ADDED: Test properties that your tests expect
  preventDefaultVar = false
  stopPropagationVar = false

  constructor(type: string, eventInitDict?: MouseEventInit) {
    super(type, eventInitDict)
    if (eventInitDict) {
      this.altKey = eventInitDict.altKey || false
      this.button = eventInitDict.button || 0
      this.buttons = eventInitDict.buttons || 0
      this.clientX = eventInitDict.clientX || 0
      this.clientY = eventInitDict.clientY || 0
      this.ctrlKey = eventInitDict.ctrlKey || false
      this.metaKey = eventInitDict.metaKey || false
      this.movementX = eventInitDict.movementX || 0
      this.movementY = eventInitDict.movementY || 0
      this.relatedTarget = eventInitDict.relatedTarget || null
      this.screenX = eventInitDict.screenX || 0
      this.screenY = eventInitDict.screenY || 0
      this.shiftKey = eventInitDict.shiftKey || false
      this.view = eventInitDict.view || null
    }
  }
  
  initUIEvent(typeArg: string, bubblesArg?: boolean, cancelableArg?: boolean, viewArg?: Window | null, detailArg?: number): void {
    throw new Error("Method not implemented.")
  }

  getModifierState(key: string): boolean {
    return false
  }

  preventDefault(): void {
    super.preventDefault()
    this.preventDefaultVar = true
  }

  stopPropagation(): void {
    super.stopPropagation()
    this.stopPropagationVar = true
  }

  initMouseEvent(
    typeArg: string,
    canBubbleArg: boolean,
    cancelableArg: boolean,
    viewArg: Window | null,
    detailArg: number,
    screenXArg: number,
    screenYArg: number,
    clientXArg: number,
    clientYArg: number,
    ctrlKeyArg: boolean,
    altKeyArg: boolean,
    shiftKeyArg: boolean,
    metaKeyArg: boolean,
    buttonArg: number,
    relatedTargetArg: EventTarget | null
  ): void {
    this.initEvent(typeArg, canBubbleArg, cancelableArg)
    this.view = viewArg
    this.detail = detailArg
    this.screenX = screenXArg
    this.screenY = screenYArg
    this.clientX = clientXArg
    this.clientY = clientYArg
    this.ctrlKey = ctrlKeyArg
    this.altKey = altKeyArg
    this.shiftKey = shiftKeyArg
    this.metaKey = metaKeyArg
    this.button = buttonArg
    this.relatedTarget = relatedTargetArg
  }
}

export { TestMouseEvent }