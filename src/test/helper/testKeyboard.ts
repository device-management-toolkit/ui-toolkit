/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TestEvent } from "./testEvent"

class TestKeyBoardEvent extends TestEvent implements KeyboardEvent {
  readonly DOM_KEY_LOCATION_STANDARD = 0 as const
  readonly DOM_KEY_LOCATION_LEFT = 1 as const
  readonly DOM_KEY_LOCATION_RIGHT = 2 as const
  readonly DOM_KEY_LOCATION_NUMPAD = 3 as const

  altKey = false
  charCode = 0
  code = ''
  ctrlKey = false
  detail = 0
  isComposing = false
  key = ''
  keyCode = 0
  location = 0
  metaKey = false
  repeat = false
  shiftKey = false
  view: Window | null = null
  which = 0

  preventDefaultVar = false
  stopPropagationVar = false

  constructor(type: string, eventInitDict?: KeyboardEventInit) {
    super(type, eventInitDict)
    if (eventInitDict) {
      this.altKey = eventInitDict.altKey || false
      this.ctrlKey = eventInitDict.ctrlKey || false
      this.metaKey = eventInitDict.metaKey || false
      this.shiftKey = eventInitDict.shiftKey || false
      this.code = eventInitDict.code || ''
      this.key = eventInitDict.key || ''
      this.location = eventInitDict.location || 0
      this.repeat = eventInitDict.repeat || false
      this.isComposing = eventInitDict.isComposing || false
    }
  }

  initKeyboardEvent(typeArg: string, bubblesArg?: boolean, cancelableArg?: boolean, viewArg?: Window | null, keyArg?: string, locationArg?: number, ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean, metaKey?: boolean): void {
    throw new Error("Method not implemented.")
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
}

export { TestKeyBoardEvent }