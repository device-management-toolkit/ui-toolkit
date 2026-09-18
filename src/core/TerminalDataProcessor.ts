/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AmtTerminal } from './AMTTerminal'
import { type IDataProcessor } from './Interfaces'

/** class to process serial over lan data **/
export class TerminalDataProcessor implements IDataProcessor {
  terminal: AmtTerminal
  private readonly decoder = new TextDecoder('utf-8')

  constructor(terminal) {
    this.terminal = terminal
  }

  processDataToXterm: (str: any) => void
  clearTerminal: () => void

  /** processing data received from serial port**/
  processData = (str: string): any => {
    if (this.terminal.capture != null) this.terminal.capture = String(this.terminal.capture) + str
    const bytes: number[] = []
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i)
      if (str[i] === 'J') {
        this.clearTerminal()
      } else {
        bytes.push(ch & 0xff)
      }
    }
    this.processDataToXterm(this.decoder.decode(new Uint8Array(bytes), { stream: true }))
  }
}
