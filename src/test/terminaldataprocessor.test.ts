/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TerminalDataProcessor } from '../core/TerminalDataProcessor'
import { AmtTerminal } from '../core/AMTTerminal'
import { AmtTerminal2 } from './helper/amtTerminal2'
import { TextDecoder, TextEncoder } from 'util'
import { SolTerminalType } from '../core/SolTerminalType'
import { CP437 } from '../core/CP437'

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
    tdataprocessor.setTerminalType(SolTerminalType.VTUTF8)
    tdataprocessor.processDataToXterm = callback

    // Test input
    const s = String.fromCharCode(...new TextEncoder().encode('abcD123?!=*“€'))

    // call processdata
    tdataprocessor.processData(s)

    // Test output
    expect(result).toBe('abcD123?!=*“€')
  })

  describe('SOL decoding strategies', () => {
    let processor: TerminalDataProcessor
    let terminal: AmtTerminal
    let chunks: string[]

    const binary = (text: string): string => String.fromCharCode(...new TextEncoder().encode(text))

    beforeEach(() => {
      terminal = new AmtTerminal()
      terminal.capture = ''
      processor = new TerminalDataProcessor(terminal)
      processor.setTerminalType(SolTerminalType.VTUTF8)
      chunks = []
      processor.processDataToXterm = (text) => chunks.push(text)
      processor.clearTerminal = vi.fn()
    })

    it('defaults to PC-ANSI', () => {
      expect(new TerminalDataProcessor(new AmtTerminal()).terminalType).toBe(SolTerminalType.PCANSI)
    })

    it.each([
      '\u00a2',
      '\u20ac',
      '\ud83d\ude00'
    ])('handles every split of %s', (character) => {
      const bytes = binary(`J${character}\x1b[2J`)
      for (let split = 0; split <= bytes.length; split++) {
        processor.reset()
        chunks = []
        processor.processData(bytes.slice(0, split))
        processor.processData('')
        processor.processData(bytes.slice(split))
        expect(chunks.join('')).toBe(`J${character}\x1b[2J`)
      }
      expect(processor.clearTerminal).not.toHaveBeenCalled()
    })

    it('retains three incomplete bytes and resolves the fourth without losing following text', () => {
      for (const byte of [
        0xf0,
        0x9f,
        0x98
      ]) {
        processor.processData(String.fromCharCode(byte))
        expect(chunks.join('')).toBe('')
      }
      processor.processData('\x80J')
      expect(chunks.join('')).toBe('\ud83d\ude00J')
    })

    it('rejects an invalid fourth byte immediately and recovers', () => {
      processor.processData('\xf0\x9f\x98')
      processor.processData('J')
      expect(chunks.join('')).toBe('\ufffdJ')
    })

    it('does not accumulate unresolved invalid leading bytes', () => {
      for (let i = 0; i < 4096; i++) processor.processData('\xf0')
      expect(chunks.join('')).toBe('\ufffd'.repeat(4095))
      processor.processData('\x9f\x98\x80')
      expect(chunks.join('')).toBe('\ufffd'.repeat(4095) + '\ud83d\ude00')
    })

    it.each([
      ['\xff', '\ufffd'],
      ['\xc0\xaf', '\ufffd\ufffd'],
      ['\xed\xa0\x80', '\ufffd\ufffd\ufffd'],
      ['\xf4\x90\x80\x80', '\ufffd\ufffd\ufffd\ufffd'],
      ['\xe2(A', '\ufffd(A']
    ])('replaces malformed UTF-8 %s and continues', (input, expected) => {
      for (const byte of input) processor.processData(byte)
      processor.processData('OK')
      expect(chunks.join('')).toBe(expected + 'OK')
    })

    it('discards incomplete UTF-8 on reset without clearing capture or display', () => {
      processor.processData('visible\xf0\x9f\x98')
      processor.reset()
      processor.processData('J')
      expect(chunks.join('')).toBe('visibleJ')
      expect(terminal.capture).toBe('visible\xf0\x9f\x98J')
      expect(processor.terminalType).toBe(SolTerminalType.VTUTF8)
      expect(processor.clearTerminal).not.toHaveBeenCalled()
    })

    it('maps all 128 CP437 high bytes independently of chunk boundaries', () => {
      const expected =
        'ÇüéâäàåçêëèïîìÄÅ' +
        'ÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
        'áíóúñÑªº¿⌐¬½¼¡«»' +
        '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
        '└┴┬├─┼╞╟╚╔╩╦╠═╬╧' +
        '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
        'αßΓπΣσµτΦΘΩδ∞φε∩' +
        '≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00a0'
      expect(CP437).toHaveLength(128)
      processor.setTerminalType(SolTerminalType.PCANSI)
      for (let byte = 0x80; byte <= 0xff; byte++) processor.processData(String.fromCharCode(byte))
      expect(chunks.join('')).toBe(expected)
      expect(terminal.capture).toBe(String.fromCharCode(...Array.from({ length: 128 }, (_, i) => i + 128)))
    })

    it('preserves every ASCII byte and ANSI attributes in PC-ANSI', () => {
      processor.setTerminalType(SolTerminalType.PCANSI)
      const ascii = String.fromCharCode(...Array.from({ length: 128 }, (_, i) => i))
      processor.processData(ascii + '\x1b[31mJ\x1b[0m\x1b[2J')
      expect(chunks.join('')).toBe(ascii + '\x1b[31mJ\x1b[0m\x1b[2J')
    })

    it('switches modes without carrying partial UTF-8 state', () => {
      processor.processData('\xe2\x82')
      processor.setTerminalType(SolTerminalType.PCANSI)
      processor.processData('\xda\xc4\xbf')
      processor.setTerminalType(SolTerminalType.VTUTF8)
      processor.processData(binary('\u20ac'))
      expect(chunks.join('')).toBe('\u250c\u2500\u2510\u20ac')
      expect(processor.clearTerminal).not.toHaveBeenCalled()
    })

    it('resets even when reselecting the current mode', () => {
      processor.processData('\xe2\x82')
      processor.setTerminalType(SolTerminalType.VTUTF8)
      processor.processData('J')
      expect(chunks.join('')).toBe('J')
    })

    it('rejects unsupported modes without mutating decoder state', () => {
      processor.processData('\xe2\x82')
      expect(() => {
        // @ts-expect-error Exercise invalid values from untyped JavaScript consumers.
        processor.setTerminalType(0)
      }).toThrow(RangeError)
      expect(processor.terminalType).toBe(SolTerminalType.VTUTF8)
      processor.processData('\xac')
      expect(chunks.join('')).toBe('\u20ac')
    })
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
    tdataprocessor.setTerminalType(SolTerminalType.VTUTF8)
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
