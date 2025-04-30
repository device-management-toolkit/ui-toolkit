/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type Desktop } from '../Desktop'
/**
 * Provides helper functions to handle image pixel data.
 */
export declare const ImageHelper: {
  /**
   * puts image on canvas using the parent canvas ctx.
   * @param parent parent desktop with CTX for canvas
   * @param x x loc
   * @param y y loc
   */
  putImage(parent: Desktop, x: number, y: number): void
  /**
   *
   * @param parent parent desktop
   * @param value pixel value at ptr
   * @param ptr ptr into the image pixel data
   */
  setPixel(parent: Desktop, value: number, ptr: number): void
  arotX(parent: Desktop, x: number, y: number): number
  arotY(parent: Desktop, x: number, y: number): number
  crotX(parent: Desktop, x: number, y: number): number
  crotY(parent: Desktop, x: number, y: number): number
  rotX(parent: Desktop, x: number, y: number): number
  rotY(parent: Desktop, x: number, y: number): number
  setRotation(parent: Desktop, x: number): boolean
  fixColor(c: number): number
}
