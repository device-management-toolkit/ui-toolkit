/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type Desktop } from '../Desktop'
import { type ICommunicator } from '../Interfaces/ICommunicator'
import { type UpDown } from './KeyboardHelper'
declare const CommsHelper: {
  sendRefresh(parent: Desktop, comm: ICommunicator): void
  sendKey(comm: ICommunicator, k: number | any, d: UpDown): void
  sendKvmData(parent: Desktop, comm: ICommunicator, x: string): void
  sendKeepAlive(parent: Desktop, comm: ICommunicator): void
  sendCtrlAltDelMsg(comm: ICommunicator): void
  sendCad(comm: ICommunicator): void
}
export { CommsHelper }
