/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type AmtTerminal } from './AMTTerminal'
import { type IDataProcessor } from './Interfaces'
/** class to process serial over lan data **/
export declare class TerminalDataProcessor implements IDataProcessor {
  terminal: AmtTerminal
  constructor(terminal: any)
  processDataToXterm: (str: any) => void
  clearTerminal: () => void
  /** processing data received from serial port**/
  processData: (str: string) => any
}
