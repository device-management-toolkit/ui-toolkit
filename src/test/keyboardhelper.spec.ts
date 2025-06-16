/**
 * @jest-environment jsdom
 */
/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { KeyBoardHelper } from '../core/Utilities/KeyboardHelper'
import { AmtDesktop } from './helper/testdesktop'

// classes defined for Unit testing
import { TestEvent } from './helper/testEvent'
import { TestKeyBoardEvent } from './helper/testKeyboard'
import { Communicator } from './helper/testcommunicator'

describe('Test KeyBoardHelper', () => {
  it('Test GrabKeyInput: KeyInputGrab == false', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    keyboardhelper.KeyInputGrab = false
    document.onkeyup = null
    document.onkeydown = null
    document.onkeypress = null

    // Test GrabKeyInput
    keyboardhelper.GrabKeyInput()

    // Output
    expect(document.onkeyup).not.toBe(null)
    expect(document.onkeydown).not.toBe(null)
    expect(document.onkeypress).not.toBe(null)
    expect(keyboardhelper.KeyInputGrab).toBe(true)
  })

  it('Test GrabKeyInput: KeyInputGrab == true', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    keyboardhelper.KeyInputGrab = true
    document.onkeyup = null
    document.onkeydown = null
    document.onkeypress = null

    // Test GrabKeyInput
    keyboardhelper.GrabKeyInput()

    // Output
    expect(document.onkeyup).toBe(null)
    expect(document.onkeydown).toBe(null)
    expect(document.onkeypress).toBe(null)
    expect(keyboardhelper.KeyInputGrab).toBe(true)
  })

  it('Test UnGrabKeyInput: KeyInputGrab == true', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    keyboardhelper.KeyInputGrab = true
    document.onkeyup = keyboardhelper.handleKeyUp
    document.onkeydown = keyboardhelper.handleKeyDown
    document.onkeypress = keyboardhelper.handleKeys

    // Test UnGrabKeyInput
    keyboardhelper.UnGrabKeyInput()

    // Output
    expect(document.onkeyup).toBe(null)
    expect(document.onkeydown).toBe(null)
    expect(document.onkeypress).toBe(null)
    expect(keyboardhelper.KeyInputGrab).toBe(false)
  })

  it('Test UnGrabKeyInput: KeyInputGrab == flase', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    keyboardhelper.KeyInputGrab = false
    document.onkeyup = null
    document.onkeydown = null
    document.onkeypress = null

    // Test UnGrabKeyInput
    keyboardhelper.UnGrabKeyInput()

    // Output
    expect(document.onkeyup).toBe(null)
    expect(document.onkeydown).toBe(null)
    expect(document.onkeypress).toBe(null)
    expect(keyboardhelper.KeyInputGrab).toBe(false)
  })

  it('Test handleKeys: preventDefault and stopPropagation are defined', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    const e = new TestEvent('keypress')
    e.preventDefaultVar = false
    e.stopPropagationVar = false

    // Test handleKeys
    const returnvalue = keyboardhelper.handleKeys(e)

    // Output
    expect(returnvalue).toBe(false)
    expect(e.preventDefaultVar).toBe(true)
    expect(e.stopPropagationVar).toBe(true)
  })

  it('Test haltEvent: preventDefault and stopPropagation are defined', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    const e = new TestEvent('keypress')
    e.preventDefaultVar = false
    e.stopPropagationVar = false

    // Test haltEvent
    const returnvalue = keyboardhelper.haltEvent(e)

    // Output
    expect(returnvalue).toBe(false)
    expect(e.preventDefaultVar).toBe(true)
    expect(e.stopPropagationVar).toBe(true)
  })

  it('Test handleKeyUp', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    const e = new TestKeyBoardEvent('keydown')
    e.keyCode = 186 // ';'
    e.code = ''
    e.preventDefaultVar = false
    e.stopPropagationVar = false
    Communicator.sentData = ''

    // Test haltEvent
    const returnvalue = keyboardhelper.handleKeyUp(e)

    // Output
    expect(returnvalue).toBe(false)
    expect(e.preventDefaultVar).toBe(true)
    expect(e.stopPropagationVar).toBe(true)
    expect(Communicator.sentData[1].charCodeAt(0)).toBe(0)
    expect(Communicator.sentData.substr(7, 1)).toContain(';')
  })

  it('Test handleKeyDown', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    const e = new TestKeyBoardEvent('keydown')
    e.keyCode = 187 // '='
    e.code = ''
    e.preventDefaultVar = false
    e.stopPropagationVar = false
    Communicator.sentData = ''

    // Test haltEvent
    const returnvalue = keyboardhelper.handleKeyDown(e)

    // Output
    expect(returnvalue).toBe(false)
    expect(e.preventDefaultVar).toBe(true)
    expect(e.stopPropagationVar).toBe(true)
    expect(Communicator.sentData[1].charCodeAt(0)).toBe(1)
    expect(Communicator.sentData.substr(7, 1)).toContain('=')
  })

  it('Test keyEvent: e.code has valid string value', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    const e = new TestKeyBoardEvent('keydown')
    e.code = 'Key' + String.fromCharCode(0x05)
    e.preventDefaultVar = false
    e.stopPropagationVar = false
    Communicator.sentData = ''

    // Test haltEvent
    const returnvalue = keyboardhelper.handleKeyEvent(1, e)

    // Output
    expect(returnvalue).toBe(false)
    expect(e.preventDefaultVar).toBe(true)
    expect(e.stopPropagationVar).toBe(true)

    expect(Communicator.sentData[1].charCodeAt(0)).toBe(1)
    expect(Communicator.sentData.substr(7, 1).charCodeAt(0)).toBe(37)
  })

  it('Test keyEvent: e.code empty for ,', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const keyboardhelper = new KeyBoardHelper(desktop, comm)
    const e = new TestKeyBoardEvent('keydown')
    e.keyCode = 188 // ,
    e.code = ''
    e.preventDefaultVar = false
    e.stopPropagationVar = false
    Communicator.sentData = ''

    // Test haltEvent
    const returnvalue = keyboardhelper.handleKeyEvent(1, e)

    // Output
    expect(returnvalue).toBe(false)
    expect(e.preventDefaultVar).toBe(true)
    expect(e.stopPropagationVar).toBe(true)

    expect(Communicator.sentData[1].charCodeAt(0)).toBe(1)
    expect(Communicator.sentData.substr(7, 1)).toContain(',')
  })
  /*
    it('Test keyEvent: e.code empty for ,', () => {

        // Input
        var comm = new Communicator();
        var desktop = new AmtDesktop();
        var keyboardhelper = new KeyBoardHelper(desktop, comm);
        var e = new TestKeyBoardEvent();
        e.keyCode = 188; // ,
        e.code = '';
        e.preventDefaultVar = false;
        e.stopPropagationVar = false;
        Communicator.sentData = '';

        // Test haltEvent
        var returnvalue = keyboardhelper.handleKeyEvent(1, null);

        console.log(Communicator.sentData)

        // Output
    }); */
})
