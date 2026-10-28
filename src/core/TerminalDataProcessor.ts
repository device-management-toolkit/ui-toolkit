/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AmtTerminal } from './AMTTerminal'
import { type IDataProcessor } from './Interfaces'
import { CP437 } from './CP437'
import { SolTerminalType } from './SolTerminalType'

/** class to process serial over lan data **/
export class TerminalDataProcessor implements IDataProcessor {
  terminal: AmtTerminal
  // The native UTF-8 state machine retains at most three incomplete bytes.
  private decoder = new TextDecoder('utf-8', { fatal: false })
  private activeTerminalType = SolTerminalType.PCANSI

  constructor(terminal: AmtTerminal) {
    this.terminal = terminal
  }

  processDataToXterm: (str: string) => void
  clearTerminal: () => void

  get terminalType(): SolTerminalType {
    return this.activeTerminalType
  }

  setTerminalType(type: SolTerminalType): void {
    switch (type) {
      case SolTerminalType.VTUTF8:
      case SolTerminalType.PCANSI:
        this.reset()
        this.activeTerminalType = type
        break
      default:
        throw new RangeError(`Unsupported SOL terminal type: ${type}`)
    }
  }

  /** Discard partial input without changing the mode or clearing the display. */
  reset(): void {
    this.decoder = new TextDecoder('utf-8', { fatal: false })
  }

  /** processing data received from serial port**/
  processData = (str: string): void => {
    if (this.terminal.capture != null) this.terminal.capture = String(this.terminal.capture) + str
    const bytes = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff
    }

    let text = ''
    switch (this.activeTerminalType) {
      case SolTerminalType.VTUTF8:
        text = this.decoder.decode(bytes, { stream: true })
        break
      case SolTerminalType.PCANSI:
        for (const byte of bytes) {
          text += String.fromCharCode(byte < 0x80 ? byte : CP437[byte - 0x80])
        }
        break
    }
    this.processDataToXterm(text)
  }
}
