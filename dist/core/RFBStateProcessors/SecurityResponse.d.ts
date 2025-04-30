/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type ICommunicator, type IStateProcessor } from '../Interfaces'
/**
 * Get auth security response and proceed with share desktop flag
 */
declare class SecurityResponse implements IStateProcessor {
  wsSocket: ICommunicator
  next: IStateProcessor
  updateRFBState: any
  constructor(comm: ICommunicator, updateRFBState: (state: number) => void)
  processState(acc: string): number
}
export { SecurityResponse }
