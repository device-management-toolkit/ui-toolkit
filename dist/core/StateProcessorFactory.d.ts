/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { type IStateProcessor, type ICommunicator } from './Interfaces'
import { type Desktop } from './Desktop'
/**
 * StateProcessorFactory is the factory class to return the processor for current state.
 */
declare class StateProcessorFactory {
  stateProcessors: any
  constructor(comm: ICommunicator, parent: Desktop, updateRFBState: (state: number) => void)
  /**
   * getProcessor returns the StateProcessor to handle the next RFB state
   * @param state RFB state to process next
   */
  getProcessor(state: number): IStateProcessor
}
export { StateProcessorFactory }
