/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type ICommunicator, type IStateProcessor, type IServerCutTextHandler } from '../Interfaces'
declare class FrameBufferBellServerCutText implements IStateProcessor {
  wsSocket: ICommunicator
  next: IStateProcessor
  cmdSize: number
  serverCutTextHandler: IServerCutTextHandler
  updateRFBState: any
  constructor(comm: ICommunicator, serverCutTextHandler: IServerCutTextHandler, updateRFBState: (state: number) => void)
  processState(acc: string): number
}
export { FrameBufferBellServerCutText }
