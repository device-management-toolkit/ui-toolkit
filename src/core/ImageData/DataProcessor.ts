/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/

import { type IStateProcessor, type IDataProcessor, type ICommunicator } from '../Interfaces'
import { StateProcessorFactory } from '../StateProcessorFactory'
import { type Desktop } from '../Desktop'
import { isTruthy } from '../Utilities/UtilityMethods'

/**
 * DataProcessor provides the functionality for processing different states of RFB leveraging
 * the different StateProcessors
 */
export class DataProcessor implements IDataProcessor {
  acc: string
  remoteFrameBufferStateManager: IStateProcessor
  stateProcessorFac: StateProcessorFactory
  parent: Desktop
  constructor(comm: ICommunicator, parent: Desktop) {
    this.acc = ''
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.stateProcessorFac = new StateProcessorFactory(comm, parent, this.updateRFBState.bind(this))
    this.parent = parent
  }

  /**
   * processData is called from ICommunicator on new data coming over the wire
   * @param data is the current data block received on the web socket
   */
  processData(data: string): any {
    if (!isTruthy(data)) return
    this.acc += data
    let cmdSize = 0
    console.debug(`Process Data ACC length:  ${this.acc.length}`)
    while (this.acc.length > 0) {
      const stateProcessor: IStateProcessor = this.stateProcessorFac.getProcessor(this.parent.state)
      const prevState = this.parent.state
      cmdSize = stateProcessor.processState(this.acc)
      console.debug(`State  ${prevState}  Processed. cmdSize returned ${cmdSize}`)
      if (cmdSize === 0) return
      console.debug('before acc ', this.acc)
      this.acc = this.acc.substring(cmdSize)
      console.debug(`remaining acc  ${this.acc.length} command size: ${cmdSize} new parent state: ${this.parent.state}`)
    }
  }

  updateRFBState(state: number): void {
    this.parent.state = state
  }
}
