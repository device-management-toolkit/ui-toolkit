/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type ICommunicator, type IStateProcessor, type IRLEDecoder } from '../Interfaces'
import { type Desktop } from '../Desktop'
/**
 * Handle encoded RFB packets. Supported encodings, RAW, ZRLE.
 */
declare class Encoding implements IStateProcessor {
  wsSocket: ICommunicator
  next: IStateProcessor
  parent: Desktop
  rleDecoder: IRLEDecoder
  updateRFBState: any
  constructor(comm: ICommunicator, parent: Desktop, rleDecoder: IRLEDecoder, updateRFBState: (state: number) => void)
  processState(acc: string): number
}
export { Encoding }
