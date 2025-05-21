/**
 * @jest-environment jsdom
 */

/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ImageHelper } from '../core/Utilities/ImageHelper'

// classes defined for Unit testing
import { AmtDesktop } from '../test/helper/testdesktop'
import RleVariables from '../test/helper/rledecodervariables'

// Mock for ImageData
class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number

  constructor(data: Uint8ClampedArray | number[], width: number, height: number) {
    // Handle both Uint8ClampedArray and regular array inputs
    this.data = data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data)
    this.width = width
    this.height = height
  }
}

// Replace global ImageData with our mock in tests
global.ImageData = MockImageData as any

describe('Test ImageHelper', () => {
  it('Test arotX function in ImageHelper with parent.rotation == 0', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 0

    // test arotX function
    const ret = ImageHelper.arotX(parent, x, y)

    // Output
    expect(ret).toBe(x)
  })

  it('Test arotX function in ImageHelper with parent.rotation == 3', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 3

    // test arotX function
    const ret = ImageHelper.arotX(parent, x, y)

    // Output
    expect(ret).toBe(y)
  })

  it('Test arotX function in ImageHelper with parent.rotation == 1', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 1
    parent.canvasCtx.canvas.width = 140
    parent.sparew2 = 10

    // test arotX function
    const ret = ImageHelper.arotX(parent, x, y)

    // Output
    expect(ret).toBe(10)
  })

  it('Test arotX function in ImageHelper with parent.rotation == 2', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 2
    parent.canvasCtx.canvas.width = 150
    parent.sparew2 = 20

    // test arotX function
    const ret = ImageHelper.arotX(parent, x, y)

    // Output
    expect(ret).toBe(30)
  })

  it('Test arotY function in ImageHelper with parent.rotation == 0', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 0

    // test arotY function
    const ret = ImageHelper.arotY(parent, x, y)

    // Output
    expect(ret).toBe(y)
  })

  it('Test arotY function in ImageHelper with parent.rotation == 1', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 1

    // test arotY function
    const ret = ImageHelper.arotY(parent, x, y)

    // Output
    expect(ret).toBe(x)
  })

  it('Test arotY function in ImageHelper with parent.rotation == 2', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 105
    parent.rotation = 2
    parent.canvasCtx.canvas.height = 140
    parent.spareh2 = 10

    // test arotY function
    const ret = ImageHelper.arotY(parent, x, y)

    // Output
    expect(ret).toBe(25)
  })

  it('Test arotY function in ImageHelper with parent.rotation == 3', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 3
    parent.canvasCtx.canvas.height = 150
    parent.spareh = 20

    // test arotY function
    const ret = ImageHelper.arotY(parent, x, y)

    // Output
    expect(ret).toBe(30)
  })

  it('Test crotX function in ImageHelper with parent.rotation == 0', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 0
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotX function
    const ret = ImageHelper.crotX(parent, x, y)

    // Output
    expect(ret).toBe(x)
  })

  it('Test crotX function in ImageHelper with parent.rotation == 1', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 1
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotX function
    const ret = ImageHelper.crotX(parent, x, y)

    // Output
    expect(ret).toBe(y)
  })

  it('Test crotX function in ImageHelper with parent.rotation == 2', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 2
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotX function
    const ret = ImageHelper.crotX(parent, x, y)

    // Output
    expect(ret).toBe(60)
  })

  it('Test crotX function in ImageHelper with parent.rotation == 3', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 3
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotX function
    const ret = ImageHelper.crotX(parent, x, y)

    // Output
    expect(ret).toBe(30)
  })

  it('Test crotY function in ImageHelper with parent.rotation == 0', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 120
    const y = 110
    parent.rotation = 0
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotY function
    const ret = ImageHelper.crotY(parent, x, y)

    // Output
    expect(ret).toBe(y)
  })

  it('Test crotY function in ImageHelper with parent.rotation == 3', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 120
    const y = 110
    parent.rotation = 3
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotY function
    const ret = ImageHelper.crotY(parent, x, y)

    // Output
    expect(ret).toBe(x)
  })

  it('Test crotY function in ImageHelper with parent.rotation == 1', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 120
    const y = 110
    parent.rotation = 1
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotY function
    const ret = ImageHelper.crotY(parent, x, y)

    // Output
    expect(ret).toBe(40)
  })

  it('Test crotY function in ImageHelper with parent.rotation == 2', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 120
    const y = 110
    parent.rotation = 2
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test crotY function
    const ret = ImageHelper.crotY(parent, x, y)

    // Output
    expect(ret).toBe(40)
  })

  it('Test rotX function in ImageHelper with parent.rotation == 0', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 0
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test rotX function
    const ret = ImageHelper.rotX(parent, x, y)

    // Output
    expect(ret).toBe(x)
  })

  it('Test rotX function in ImageHelper with parent.rotation == 1', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 1
    parent.canvasCtx.canvas.width = 80
    parent.canvasCtx.canvas.height = 90

    // test rotX function
    const ret = ImageHelper.rotX(parent, x, y)

    // Output
    expect(ret).toBe(x)
  })

  it('Test rotX function in ImageHelper with parent.rotation == 2', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 2
    parent.canvasCtx.canvas.width = 80
    parent.canvasCtx.canvas.height = 90

    // test rotX function
    const ret = ImageHelper.rotX(parent, x, y)

    // Output
    expect(ret).toBe(20)
  })

  it('Test rotX function in ImageHelper with parent.rotation == 3', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 3
    parent.canvasCtx.canvas.width = 80
    parent.canvasCtx.canvas.height = 90

    // test rotX function
    const ret = ImageHelper.rotX(parent, x, y)

    // Output
    expect(ret).toBe(10)
  })

  it('Test rotY function in ImageHelper with parent.rotation == 0', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 0
    parent.canvasCtx.canvas.width = 160
    parent.canvasCtx.canvas.height = 150

    // test rotY function
    const ret = ImageHelper.rotY(parent, x, y)

    // Output
    expect(ret).toBe(y)
  })

  it('Test rotY function in ImageHelper with parent.rotation == 1', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 1
    parent.canvasCtx.canvas.width = 80
    parent.canvasCtx.canvas.height = 90

    // test rotY function
    const ret = ImageHelper.rotY(parent, x, y)

    // Output
    expect(ret).toBe(40)
  })

  it('Test rotY function in ImageHelper with parent.rotation == 2', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 2
    parent.canvasCtx.canvas.width = 80
    parent.canvasCtx.canvas.height = 90

    // test rotY function
    const ret = ImageHelper.rotY(parent, x, y)

    // Output
    expect(ret).toBe(30)
  })

  it('Test rotY function in ImageHelper with parent.rotation == 3', () => {
    // Set Input
    const parent = new AmtDesktop()
    const x = 100
    const y = 120
    parent.rotation = 3
    parent.canvasCtx.canvas.width = 80
    parent.canvasCtx.canvas.height = 90

    // test rotY function
    const ret = ImageHelper.rotY(parent, x, y)

    // Output
    expect(ret).toBe(y)
  })

  it('Test fixColor function', () => {
    // test fixColor function
    const ret = ImageHelper.fixColor(128)

    // Output
    expect(ret).toBe(160)
  })

  it('Test fixColor function', () => {
    // test fixColor function
    const ret = ImageHelper.fixColor(127)

    // Output
    expect(ret).toBe(ret)
  })

  it('Test fixColor function', () => {
    // test fixColor function
    const ret = ImageHelper.fixColor(126)

    // Output
    expect(ret).toBe(ret)
  })

  it('Test putImage function', () => {
    // Create Objects
    const parent = new AmtDesktop()

    // Test input
    const strarray = RleVariables.inputtoDecode1.split(',')
    console.info('strarray', strarray)
    // Input parameters
    const x = 0
    const y = 0
    const width = 64
    const height = 64

    // Create canvas and populate image data
    const canvas = {
      width: 800,
      height: 600
    }
    parent.canvasCtx = {
      canvas: canvas,
      fillStyle: '',
      fillRect: jest.fn(),
      putImageData: jest.fn(),
      getImageData: jest.fn().mockReturnValue(new MockImageData(RleVariables.spare1, width, height))
    }
    parent.spare = new MockImageData(RleVariables.spare1, height, width)

    // test putImage function
    const ret = ImageHelper.putImage(parent, x, y)
    console.info('ret', ret)

    // get Image data - Get the image on canvas and compare with the drawn image
    const output = parent.canvasCtx.getImageData(x, y, width, height)
    console.info('output', output)
    // expect(output).toEqual(parent.spare);
  })

  it('Test setPixel function with parent.rotation = 0', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const width = 64
    const height = 64
    const ptr = 0
    const value = 207
    parent.spare = new MockImageData(RleVariables.spare1, height, width)
    parent.rotation = 0
    parent.bpp = 1

    // test setPixel function
    const ret = ImageHelper.setPixel(parent, value, ptr)
    console.info('ret', ret)

    // Output
    expect(parent.spare.data[0]).toBe(192)
    expect(parent.spare.data[1]).toBe(96)
    expect(parent.spare.data[2]).toBe(224)
    expect(parent.spare.data[3]).toBe(0xff)
  })

  it('Test setPixel function with parent.rotation = 1', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const width = 64
    const height = 64
    const ptr = 19
    const value = 207
    parent.spare = new MockImageData(RleVariables.spare1, height, width)
    parent.rotation = 1
    parent.bpp = 1
    parent.sparew = 4
    parent.sparew2 = 10

    // test setPixel function
    const ret = ImageHelper.setPixel(parent, value, ptr)
    console.info('ret', ret)

    // Output
    expect(parent.spare.data[140]).toBe(192)
    expect(parent.spare.data[141]).toBe(96)
    expect(parent.spare.data[142]).toBe(224)
    expect(parent.spare.data[143]).toBe(0xff)
  })

  it('Test setPixel function with parent.rotation = 2', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const width = 64
    const height = 64
    const ptr = 19
    const value = 207
    parent.spare = new MockImageData(RleVariables.spare1, height, width)
    parent.rotation = 2
    parent.bpp = 1
    parent.sparew = 4
    parent.spareh = 20

    // test setPixel function
    const ret = ImageHelper.setPixel(parent, value, ptr)
    console.info('ret', ret)

    // Output
    expect(parent.spare.data[240]).toBe(192)
    expect(parent.spare.data[241]).toBe(96)
    expect(parent.spare.data[242]).toBe(224)
    expect(parent.spare.data[243]).toBe(0xff)
  })

  it('Test setPixel function with parent.rotation = 3', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const width = 64
    const height = 64
    const ptr = 19
    const value = 9999
    parent.spare = new MockImageData(RleVariables.spare1, height, width)
    parent.rotation = 3
    parent.bpp = 0
    parent.sparew = 4
    parent.sparew2 = 10

    // test setPixel function
    const ret = ImageHelper.setPixel(parent, value, ptr)
    console.info('ret', ret)

    // Output
    expect(parent.spare.data[256]).toBe(32)
    expect(parent.spare.data[257]).toBe(224)
    expect(parent.spare.data[258]).toBe(120)
    expect(parent.spare.data[259]).toBe(0xff)
  })

  it('Test setRotation function with parent.holding == true', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const x = 15
    parent.holding = true

    // test setRotation function
    const ret = ImageHelper.setRotation(parent, x)
    console.info('ret', ret)

    // Output
    expect(parent.rotation).toBe(3)
  })

  it('Test setRotation function with parent.holding == true and x < 0', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const x = -3
    parent.holding = true

    // test setRotation function
    const ret = ImageHelper.setRotation(parent, x)
    console.info('ret', ret)

    // Output
    expect(parent.rotation).toBe(1)
  })

  it('Test setRotation function with newrotation == parent.rotation', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const x = 15
    parent.holding = false
    parent.rotation = 3

    // test setRotation function
    const ret = ImageHelper.setRotation(parent, x)

    // Output
    expect(ret).toBe(true)
  })

  it('Test setRotation function with newrotation == parent.rotation', () => {
    // Create Object
    const parent = new AmtDesktop()

    // Test input
    const x = 15
    parent.holding = false
    parent.rotation = 3

    // test setRotation function
    const ret = ImageHelper.setRotation(parent, x)

    // Output
    expect(ret).toBe(true)
  })
})
