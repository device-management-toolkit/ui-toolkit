/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type ICommunicator } from '../Interfaces/ICommunicator'
import { type Desktop } from '../Desktop'
/**
 * Mousehelper provides helper functions for handling mouse events. mouseup, mousedown, mousemove
 */
export declare class MouseHelper {
  parent: Desktop
  comm: ICommunicator
  MouseInputGrab: boolean
  lastEvent: any
  debounceTime: number
  mouseClickCompleted: boolean
  topposition: number
  leftposition: number
  constructor(parent: Desktop, comm: ICommunicator, debounceTime: number)
  GrabMouseInput(): any
  UnGrabMouseInput(): any
  mousedown(e: MouseEvent): any
  mouseup(e: MouseEvent): any
  mousemove(e: MouseEvent): boolean
  haltEvent(e: any): boolean
  getPositionOfControl(c: HTMLElement | null): number[]
  resetOffsets(): void
}
