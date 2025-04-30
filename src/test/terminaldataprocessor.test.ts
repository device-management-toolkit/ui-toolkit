/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TerminalDataProcessor } from '../core/TerminalDataProcessor'
import { AmtTerminal } from '../core/AMTTerminal'
import { AmtTerminal2 } from './helper/amtTerminal2'

describe('Test TerminalDataProcessor class', () => {
  let result = ''
  it('Test TerminalDataProcessor for processData', () => {
    // callback function for Unit testing
    function callback(value: string): void {
      result = value
    }

    // create object and set callback
    const term = new AmtTerminal()
    const tdataprocessor = new TerminalDataProcessor(term)
    tdataprocessor.processDataToXterm = callback

    // Test input
    const s = 'abcD123?!=*“€'

    // call processdata
    tdataprocessor.processData(s)

    // Test output
    expect(result).toBe('abcD123?!=*“¼')
  })

  it('Test TerminalDataProcessor for processData', () => {
    // callback function for Unit testing
    function callback(value: string): void {
      result = value
    }

    // create object and set callback
    const term = new AmtTerminal2(1)
    const tdataprocessor = new TerminalDataProcessor(term)
    tdataprocessor.processDataToXterm = callback

    // Test input
    const s = "123Z?“€'"

    // call processdata
    tdataprocessor.processData(s)

    // Test output
    expect(result).toBe("123Z?“¼'")
    expect(term.capture).toBe("123Z?“€'")
  })
})
