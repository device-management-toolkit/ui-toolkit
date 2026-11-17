/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AmtTerminal } from './AMTTerminal'
import { type IDataProcessor } from './Interfaces'
import { SolTerminalType } from './SolTerminalType'

// CP437 bytes 0x80-0xFF; ASCII and terminal control bytes pass through unchanged.
const CP437 =
  '\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5' +
  '\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00a2\u00a3\u00a5\u20a7\u0192' +
  '\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u2310\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb' +
  '\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255d\u255c\u255b\u2510' +
  '\u2514\u2534\u252c\u251c\u2500\u253c\u255e\u255f\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u2567' +
  '\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256b\u256a\u2518\u250c\u2588\u2584\u258c\u2590\u2580' +
  '\u03b1\u00df\u0393\u03c0\u03a3\u03c3\u00b5\u03c4\u03a6\u0398\u03a9\u03b4\u221e\u03c6\u03b5\u2229' +
  '\u2261\u00b1\u2265\u2264\u2320\u2321\u00f7\u2248\u00b0\u2219\u00b7\u221a\u207f\u00b2\u25a0\u00a0'

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
          text += byte < 0x80 ? String.fromCharCode(byte) : CP437[byte - 0x80]
        }
        break
    }
    this.processDataToXterm(text)
  }
}
