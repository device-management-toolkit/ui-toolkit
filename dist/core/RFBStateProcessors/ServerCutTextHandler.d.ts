/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type IKvmDataCommunicator, type IServerCutTextHandler } from '../Interfaces'
import { type Desktop } from '../Desktop'
declare class ServerCutTextHandler implements IServerCutTextHandler {
  wsSocket: IKvmDataCommunicator
  parent: Desktop
  constructor(comm: IKvmDataCommunicator, parent: Desktop)
  handleServerCutText(acc: string): number
}
export { ServerCutTextHandler }
