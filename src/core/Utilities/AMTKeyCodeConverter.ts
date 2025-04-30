/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import AMTKeyCodeTable from './AMTKeyCodeTable'
import { isTruthy } from './UtilityMethods'
/**
 * Provides code lookup functions for different special keys to send over the socket.
 */
export const AMTKeyCodeConverter = {
  convertAMTKeyCode(e: any): any {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    if (isTruthy(e.code.startsWith('Key')) && e.code.length === 4) {
      return e.code.charCodeAt(3) + (e.shiftKey === false ? 32 : 0)
    }
    if (isTruthy(e.code.startsWith('Digit')) && e.code.length === 6) {
      return e.code.charCodeAt(5)
    }
    if (isTruthy(e.code.startsWith('Numpad')) && e.code.length === 7) {
      return e.code.charCodeAt(6)
    }
    return AMTKeyCodeTable[e.code as string]
  }
}
