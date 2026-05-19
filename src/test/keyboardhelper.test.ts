/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { KeyBoardHelper, UpDown } from '../core/Utilities/KeyboardHelper'
import { CommsHelper } from '../core/Utilities/CommsHelper'
import { type ICommunicator } from '../core/Interfaces/ICommunicator'
import { type Desktop } from '../core/Desktop'

const ALT_LEFT = 0xffe9
const CTRL_LEFT = 0xffe3
const META_LEFT = 0xffe7

function makeKeyEvent(code: string): KeyboardEvent {
  // Pass through the modern e.code path in handleKeyEvent.
  return { code, shiftKey: false, preventDefault: () => {}, stopPropagation: () => {} } as unknown as KeyboardEvent
}

describe('KeyBoardHelper focus-loss key release', () => {
  let helper: KeyBoardHelper
  let comm: ICommunicator
  let sendKeySpy: jest.SpyInstance

  beforeEach(() => {
    comm = { send: jest.fn() } as unknown as ICommunicator
    const desktop = {} as unknown as Desktop
    helper = new KeyBoardHelper(desktop, comm)
    sendKeySpy = jest.spyOn(CommsHelper, 'sendKey')
    helper.GrabKeyInput()
  })

  afterEach(() => {
    helper.UnGrabKeyInput()
    sendKeySpy.mockRestore()
  })

  it('does not synthesize release when down and up are both seen', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    helper.handleKeyEvent(UpDown.Up, makeKeyEvent('AltLeft'))
    sendKeySpy.mockClear()

    window.dispatchEvent(new Event('blur'))

    expect(sendKeySpy).not.toHaveBeenCalled()
  })

  it('synthesizes Up for a held modifier on window blur', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    sendKeySpy.mockClear()

    window.dispatchEvent(new Event('blur'))

    expect(sendKeySpy).toHaveBeenCalledTimes(1)
    expect(sendKeySpy).toHaveBeenCalledWith(comm, ALT_LEFT, UpDown.Up)
  })

  it('releases every held key on blur, in any order', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('ControlLeft'))
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('MetaLeft'))
    sendKeySpy.mockClear()

    window.dispatchEvent(new Event('blur'))

    expect(sendKeySpy).toHaveBeenCalledTimes(3)
    const releasedCodes = sendKeySpy.mock.calls.map((args) => args[1])
    expect(releasedCodes).toEqual(expect.arrayContaining([ALT_LEFT, CTRL_LEFT, META_LEFT]))
    sendKeySpy.mock.calls.forEach((args) => {
      expect(args[2]).toBe(UpDown.Up)
    })
  })

  it('releases held keys when the document becomes hidden', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    sendKeySpy.mockClear()

    const originalHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    try {
      document.dispatchEvent(new Event('visibilitychange'))
      expect(sendKeySpy).toHaveBeenCalledWith(comm, ALT_LEFT, UpDown.Up)
    } finally {
      delete (document as any).hidden
      if (originalHidden) {
        Object.defineProperty(Document.prototype, 'hidden', originalHidden)
      }
    }
  })

  it('does NOT release keys on visibilitychange when document is visible', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    sendKeySpy.mockClear()

    // document.hidden is false by default in jsdom
    document.dispatchEvent(new Event('visibilitychange'))

    expect(sendKeySpy).not.toHaveBeenCalled()
  })

  it('clears tracking after blur so a second blur is a no-op', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    sendKeySpy.mockClear()

    window.dispatchEvent(new Event('blur'))
    expect(sendKeySpy).toHaveBeenCalledTimes(1)

    sendKeySpy.mockClear()
    window.dispatchEvent(new Event('blur'))
    expect(sendKeySpy).not.toHaveBeenCalled()
  })

  it('stops listening for blur after UnGrabKeyInput', () => {
    helper.handleKeyEvent(UpDown.Down, makeKeyEvent('AltLeft'))
    helper.UnGrabKeyInput()
    sendKeySpy.mockClear()

    window.dispatchEvent(new Event('blur'))

    expect(sendKeySpy).not.toHaveBeenCalled()
  })
})
