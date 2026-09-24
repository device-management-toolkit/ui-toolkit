/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TerminalDataProcessor } from '../core/TerminalDataProcessor'
import { AmtTerminal } from '../core/AMTTerminal'
import { AmtTerminal2 } from './helper/amtTerminal2'
import { TextDecoder, TextEncoder } from 'util'

globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder

describe('Test TerminalDataProcessor class', () => {
  let result = ''
  it('decodes UTF-8 data received in one chunk', () => {
    // callback function for Unit testing
    function callback(value: string): void {
      result = value
    }

    // create object and set callback
    const term = new AmtTerminal()
    const tdataprocessor = new TerminalDataProcessor(term)
    tdataprocessor.processDataToXterm = callback

    // Test input
    const s = String.fromCharCode(...new TextEncoder().encode('abcD123?!=*“€'))

    // call processdata
    tdataprocessor.processData(s)

    // Test output
    expect(result).toBe('abcD123?!=*“€')
  })

  it('decodes UTF-8 data split across chunks', () => {
    // callback function for Unit testing
    function callback(value: string): void {
      result += value
    }

    // create object and set callback
    result = ''
    const term = new AmtTerminal2(1)
    const tdataprocessor = new TerminalDataProcessor(term)
    tdataprocessor.processDataToXterm = callback

    // Test input
    const encoded = new TextEncoder().encode("123Z?“€'")
    const split = encoded.indexOf(0xe2) + 1

    tdataprocessor.processData(String.fromCharCode(...encoded.slice(0, split)))
    tdataprocessor.processData(String.fromCharCode(...encoded.slice(split)))

    // Test output
    expect(result).toBe("123Z?“€'")
    expect(term.capture).toBe(String.fromCharCode(...encoded))
  })
})
