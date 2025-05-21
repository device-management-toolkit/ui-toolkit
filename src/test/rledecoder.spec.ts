/**
 * @jest-environment jsdom
 */

/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { RLEDecoder } from '../core/ImageData/RLEDecoder'

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

// classes defined for Unit testing
import { AmtDesktop } from '../test/helper/testdesktop'
import RleVariables from '../test/helper/rledecodervariables'

describe('Test Decode function in RLEDecoder', () => {
  it('RLEDecoder.Decode: Test Decode with subencoding == 0', () => {
    // create objects
    const parent = new AmtDesktop()
    const rledecoder = new RLEDecoder(parent)

    // Test input
    const strarray = RleVariables.inputtoDecode1.split(',')
    // Convert Input string into Unicode
    let input = ''
    for (const element of strarray) {
      const substringtonum = +element
      input += String.fromCodePoint(substringtonum)
    }

    // Input parameters
    const ptr = 0
    const x = 0
    const y = 0
    const width = 64
    const height = 64
    const s = 4096
    const datalen = input.length

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
    parent.spare = new ImageData(RleVariables.spare1, height, width)

    // Test processState
    rledecoder.Decode(input, ptr, x, y, width, height, s, datalen)

    // get Image data - Get the image on canvas and compare with the drawn image
    const output: ImageData = parent.canvasCtx.getImageData(x, y, width, height)
    expect(output.toString()).toEqual(parent.spare.toString())
  })

  it('RLEDecoder.Decode: Test Decode with subencoding == 1', () => {
    // create objects
    const parent = new AmtDesktop()
    const rledecoder = new RLEDecoder(parent)

    // Test input
    const strarray = RleVariables.inputtoDecode2.split(',')
    // Convert Input string into Unicode
    let input = ''
    for (const element of strarray) {
      const substringtonum = +element
      input += String.fromCodePoint(substringtonum)
    }

    // Input parameters
    const ptr = 0
    const x = 0
    const y = 0
    const width = 64
    const height = 64
    const s = 4096
    const datalen = input.length

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
      getImageData: jest.fn().mockReturnValue(new MockImageData(RleVariables.spare2, height, width))
    }
    parent.spare = new MockImageData(RleVariables.spare2, height, width)
    parent.bpp = 2

    // Test processState
    rledecoder.Decode(input, ptr, x, y, width, height, s, datalen)

    // get Image data - Get the image on canvas and compare with the drawn image
    const output = parent.canvasCtx.getImageData(x, y, width, height)
    expect(output.toString()).toEqual(parent.spare.toString())
  })

  it('RLEDecoder.Decode: Test Decode with subencoding > 1 && subencoding < 17', () => {
    // create objects
    const parent = new AmtDesktop()
    const rledecoder = new RLEDecoder(parent)

    // Test input
    const strarray = RleVariables.inputtoDecode3.split(',')
    // Convert Input string into Unicode
    let input = ''
    for (const element of strarray) {
      const substringtonum = +element
      input += String.fromCodePoint(substringtonum)
    }

    // Input parameters
    const ptr = 0
    const x = 0
    const y = 0
    const width = 64
    const height = 64
    const s = 4096
    const datalen = input.length

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
      getImageData: jest.fn().mockReturnValue(new MockImageData(RleVariables.spare3, height, width))
    }
    parent.spare = new MockImageData(RleVariables.spare3, height, width)

    // Test processState
    rledecoder.Decode(input, ptr, x, y, width, height, s, datalen)

    // get Image data - Get the image on canvas and compare with the drawn image
    const output: ImageData = parent.canvasCtx.getImageData(x, y, width, height)
    expect(output.toString()).toEqual(parent.spare.toString())
  })

  it('RLEDecoder.Decode: Test Decode with subencoding == 128', () => {
    // create objects
    const parent = new AmtDesktop()
    const rledecoder = new RLEDecoder(parent)

    // Test input
    const strarray = RleVariables.inputtoDecode4.split(',')
    // Convert Input string into Unicode
    let input = ''
    for (const element of strarray) {
      const substringtonum = +element
      input += String.fromCodePoint(substringtonum)
    }

    // Input parameters
    const ptr = 0
    const x = 0
    const y = 0
    const width = 64
    const height = 64
    const s = 4096
    const datalen = input.length

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
      getImageData: jest.fn().mockReturnValue(new MockImageData(RleVariables.spare4, height, width))
    }
    parent.spare = new MockImageData(RleVariables.spare4, height, width)

    // Test processState
    rledecoder.Decode(input, ptr, x, y, width, height, s, datalen)

    // get Image data - Get the image on canvas and compare with the drawn image
    const output: ImageData = parent.canvasCtx.getImageData(x, y, width, height)
    expect(output.toString()).toEqual(parent.spare.toString())
  })

  it('RLEDecoder.Decode: Test Decode with subencoding > 129', () => {
    // create objects
    const parent = new AmtDesktop()
    const rledecoder = new RLEDecoder(parent)

    // Test input
    const strarray = RleVariables.inputtoDecode5.split(',')
    // Convert Input string into Unicode
    let input = ''
    for (const element of strarray) {
      const substringtonum = +element
      input += String.fromCodePoint(substringtonum)
    }

    // Input parameters
    const ptr = 0
    const x = 0
    const y = 0
    const width = 64
    const height = 64
    const s = 4096
    const datalen = input.length

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
    parent.spare = new MockImageData(RleVariables.spare5, height, width)

    // Test processState
    rledecoder.Decode(input, ptr, x, y, width, height, s, datalen)

    // get Image data - Get the image on canvas and compare with the drawn image
    const output: ImageData = parent.canvasCtx.getImageData(x, y, width, height)
    expect(output.toString()).toEqual(parent.spare.toString())
  })
})
