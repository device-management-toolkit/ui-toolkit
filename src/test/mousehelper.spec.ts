/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { MouseHelper } from '../core/Utilities/MouseHelper'

// classes defined for Unit testing
import { AmtDesktop } from './helper/testdesktop'
import { Communicator } from './helper/testcommunicator'
import { TestMouseEvent } from './helper/testmouseevent' 

describe('Test MouseHelper', () => {
  it('Test GrabMouseInput: MouseInputGrab == false', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    mousehelper.MouseInputGrab = false
    desktop.canvasCtx.canvas.onmouseup = null
    desktop.canvasCtx.canvas.onmousedown = null
    desktop.canvasCtx.canvas.onmousemove = null

    // Test GrabMouseInput
    mousehelper.GrabMouseInput()

    // Output
    expect(mousehelper.MouseInputGrab).toBe(true)
  })

  it('Test GrabMouseInput: MouseInputGrab == true', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    mousehelper.MouseInputGrab = true
    desktop.canvasCtx.canvas.onmouseup = null
    desktop.canvasCtx.canvas.onmousedown = null
    desktop.canvasCtx.canvas.onmousemove = null

    // Test GrabMouseInput
    mousehelper.GrabMouseInput()

    // Output
    expect(desktop.canvasCtx.canvas.onmouseup).toBe(null)
    expect(desktop.canvasCtx.canvas.onmousedown).toBe(null)
    expect(desktop.canvasCtx.canvas.onmousemove).toBe(null)
    expect(mousehelper.MouseInputGrab).toBe(true)
  })

  it('Test UnGrabMouseInput: MouseInputGrab == true', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    mousehelper.MouseInputGrab = true
    desktop.canvasCtx.canvas.onmouseup = mousehelper.mouseup
    desktop.canvasCtx.canvas.onmousedown = mousehelper.mousedown
    desktop.canvasCtx.canvas.onmousemove = mousehelper.mousemove

    // Test UnGrabMouseInput
    mousehelper.UnGrabMouseInput()

    // Output
    expect(desktop.canvasCtx.canvas.onmouseup).toBe(null)
    expect(desktop.canvasCtx.canvas.onmousedown).toBe(null)
    expect(desktop.canvasCtx.canvas.onmousemove).toBe(null)
    expect(mousehelper.MouseInputGrab).toBe(false)
  })

  it('Test UnGrabMouseInput: MouseInputGrab == false', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    mousehelper.MouseInputGrab = false
    desktop.canvasCtx.canvas.onmouseup = mousehelper.mouseup
    desktop.canvasCtx.canvas.onmousedown = mousehelper.mousedown
    desktop.canvasCtx.canvas.onmousemove = mousehelper.mousemove

    // Test UnGrabMouseInput
    mousehelper.UnGrabMouseInput()

    // Output
    desktop.canvasCtx.canvas.onmouseup = mousehelper.mouseup
    desktop.canvasCtx.canvas.onmousedown = mousehelper.mousedown
    desktop.canvasCtx.canvas.onmousemove = mousehelper.mousemove
    expect(mousehelper.MouseInputGrab).toBe(false)
  })

  it('Test haltEvent', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mousedown')
    mousehelper.MouseInputGrab = false
    // TestMouseEvent.preventDefaultvar = 0
    // TestMouseEvent.stopPropagationvar = 0

    // Test haltEvent
    mousehelper.haltEvent(e)

    // Output
    // expect(TestMouseEvent.preventDefaultvar).toBe(1)
    // expect(TestMouseEvent.stopPropagationvar).toBe(1)
    expect(e.defaultPrevented).toBe(true) 
  })

  it('Test mousedown', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mousedown')

    // Test mousedown
    mousehelper.mousedown(e)

    expect(e.screenY).toBe(0)
  })

  it('Test mouseup', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mouseup')

    // Test mousedown
    mousehelper.mouseup(e)

    expect(e.screenY).toBe(0)
  })

  it('Test mousemove', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mousemove')

    desktop.state = 4

    // Test mousemove
    mousehelper.mousemove(e)

    expect(e.screenY).toBe(0)
  })

  it('Test mousemove - vertical scroll', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mousemove')

    desktop.state = 4
    mousehelper.topposition = -1

    // Test mousemove
    mousehelper.mousemove(e)

    expect(e.screenY).toBe(0)
  })

  it('Test mousemove - horizontal scroll', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mousemove')

    desktop.state = 4
    mousehelper.leftposition = -1

    // Test mousemove
    mousehelper.mousemove(e)

    expect(e.screenY).toBe(0)
  })

  it('Test mousemove with focusmode', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)
    const e = new TestMouseEvent('mousemove')

    desktop.state = 4
    desktop.focusMode = 1

    // Test mousemove
    mousehelper.mousemove(e)

    expect(e.screenY).toBe(0)
  })

  it('Test resetOffsets', () => {
    // Input
    const comm = new Communicator()
    const desktop = new AmtDesktop()
    const mousehelper = new MouseHelper(desktop, comm, 0)

    // Test resetOffsets
    mousehelper.resetOffsets()

    expect(mousehelper.leftposition).toBe(0)
    expect(mousehelper.topposition).toBe(0)
  })
})
