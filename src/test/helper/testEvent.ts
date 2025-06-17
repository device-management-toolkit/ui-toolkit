/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

export class TestEvent implements Event {
  readonly AT_TARGET = 2 as const  
  readonly BUBBLING_PHASE = 3 as const  
  readonly CAPTURING_PHASE = 1 as const  
  readonly NONE = 0 as const  

  bubbles = false  
  cancelBubble = false  
  cancelable = false  
  composed = false  
  currentTarget: EventTarget | null = null
  defaultPrevented = false  
  eventPhase = 0  
  isTrusted = false  
  returnValue = true  
  srcElement: EventTarget | null = null
  target: EventTarget | null = null
  timeStamp = Date.now()  
  type = ''  
  preventDefaultVar = false  
  stopPropagationVar = false  

  constructor(type: string, eventInitDict?: EventInit) {
    this.type = type
    if (eventInitDict) {
      this.bubbles = eventInitDict.bubbles || false
      this.cancelable = eventInitDict.cancelable || false
      this.composed = eventInitDict.composed || false
    }
  }

  composedPath(): EventTarget[] {
    return []
  }

  initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void {
    this.type = type
    this.bubbles = bubbles || false
    this.cancelable = cancelable || false
  }

  preventDefault(): void {
    this.defaultPrevented = true
    this.preventDefaultVar = true  
  }

  stopImmediatePropagation(): void {
    // Implementation
  }

  stopPropagation(): void {
    this.cancelBubble = true  
    this.stopPropagationVar = true
  }
}