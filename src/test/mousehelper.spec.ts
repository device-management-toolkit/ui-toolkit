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

describe('MouseHelper.getFramebufferPosition maps the pointer onto the remote framebuffer', () => {
  // A real canvas element whose on-screen box (getBoundingClientRect) we control
  function setup(
    fbW: number,
    fbH: number,
    box: { left: number, top: number, width: number, height: number },
    objectFit = '' 
  ): MouseHelper {
    const canvas = document.createElement('canvas')
    canvas.width = fbW
    canvas.height = fbH
    if (objectFit != '') canvas.style.objectFit = objectFit
    canvas.getBoundingClientRect = () => ({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
      toJSON: () => {}
    })
    const desktop = new AmtDesktop()
    desktop.canvasControl = canvas
    return new MouseHelper(desktop, new Communicator(), 0)
  }
  const at = (clientX: number, clientY: number): MouseEvent => new MouseEvent('mousemove', { clientX, clientY })

  it('1:1 at the page origin', () => {
    expect(
      setup(1024, 768, { left: 0, top: 0, width: 1024, height: 768 }).getFramebufferPosition(at(700, 500))
    ).toEqual({ x: 700, y: 500 })
  })

  it('canvas offset in the page', () => {
    expect(
      setup(1024, 768, { left: 120, top: 80, width: 1024, height: 768 }).getFramebufferPosition(at(820, 580))
    ).toEqual({ x: 700, y: 500 })
  })

  it('page scrolled so the canvas top is above the viewport', () => {
    expect(
      setup(1024, 768, { left: 0, top: -120, width: 1024, height: 768 }).getFramebufferPosition(at(700,380))
    ).toEqual({ x: 700, y: 500 })
  })

  it('uniformly scaled canvas', () => {
    expect(
      setup(1024, 768, { left: 0, top: 0, width: 614.4, height: 460.8 }).getFramebufferPosition(at(420, 300))
    ).toEqual({ x: 700, y: 500 })
  })

  it('non-uniformly scaled canvas (object-fit: fill) scales each axis by its own ratio', () => {
    expect(
      setup(1024, 768, { left: 0, top: 0, width: 1000, height: 768 }).getFramebufferPosition(at((700 * 1000) / 1024, 500))
    ).toEqual({ x: 700, y: 500 })
  })

  it('fullscreen: element fills the screen, picture letterboxed by object-fit: contain', () => {
    // 1024x768 on 1920x1080: scale 1.40625, picture 1440 wide, 240px bars left and right
    const m = setup(1024, 768, { left: 0, top: 0, width: 1920, height: 1080 }, 'contain')
    expect(
      m.getFramebufferPosition(at(240 + 700 * 1.40625, 500 * 1.40625))
    ).toEqual({ x: 700, y: 500 })
    expect(
      m.getFramebufferPosition(at(240, 0))
    ).toEqual({ x: 0, y: 0 })
    expect(
      m.getFramebufferPosition(at(1679, 1079))
    ).toEqual({ x: 1023, y: 767 })
  })

  it('fullscreen with a taller-than-screen aspect: bars top and bottom', () => {
    // 1920x1200 on 1920x1080 is pillarboxed instead: scale 0.9, picture 1728 wide, 96px bars left and right
    const m = setup(1920, 1200, { left: 0, top: 0, width: 1920, height: 1080 }, 'contain')
    expect(m.getFramebufferPosition(at(96 + 1000 * 0.9, 600 * 0.9)))
      .toEqual({ x: 1000, y: 600 })
  })

  it('clicks in the letterbox bars clamp to the framebuffer edge', () => {
    const m = setup(1024, 768, { left: 0, top: 0, width: 1920, height: 1080 }, 'contain')
    expect(m.getFramebufferPosition(at(10, 500))).toEqual([0, 355])
    expect(m.getFramebufferPosition(at(1920, 500))).toEqual([1023, 355])
  })
})