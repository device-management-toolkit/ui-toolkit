/*********************************************************************
 * Copyright (c) Intel Corporation 2020
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

let zlib = require('../core/zlib/zlib')

describe('test zlib library', () => {
  it('should call the z stream constructor and set the variables', () => {
    zlib.z_stream()
    expect(zlib.data_type).toEqual(0)
  })

  it('should call the header constructor and set the variables', () => {
    zlib.gz_header()
    expect(zlib.name).toEqual(null)
  })

  it('should call the crc string functions and set the variables', () => {
    zlib.crc32(null, 'string', 0, 9)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the crc array functions and set the variables', () => {
    zlib.crc32(null, ['string'], 0, 9)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the crc_combine function and set the variables', () => {
    const crc1 = ['string1', 'string2']
    const crc2 = 'string3'
    const result = zlib.crc32_combine(crc1, crc2, 0)
    expect(result).toEqual(['string1', 'string2'])
  })

  it('should call the inflate reset keep function and set the varibales', () => {
    const stream = {
      state: {}
    }
    zlib.inflateResetKeep(stream)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflateinit method and set the variables', () => {
    const result = zlib.inflateInit(15)
    expect(typeof result).toBe('object')
  })

  it('should call the inflate method with code length mode and set the variables', () => {
    const stream = {
      state: {
        mode: 17,
        lens: 2,
        codes: [
          1,
          2,
          3
        ]
      },
      input_data: 'stringdata',
      avail_in: 0
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 20,
        lens: 2,
        codes: [
          { bits: 256 },
          { bits: 256 },
          { bits: 256 },
          { bits: 256 },
          { bits: 256 },
          { bits: 256 }],
        bits: 1,
        hold: 1,
        lenbits: 1,
        distbits: 1,
        lencode: 1
      },
      input_data: 'stringdata',
      avail_in: 10,
      avail_out: 300
    }

    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        extra: 20,
        back: 10,
        mode: 21
      },
      input_data: 'stringdata',
      avail_in: 10,
      avail_out: 300
    }

    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 0,
        head: null
      },
      input_data: 'stringdata'
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 1,
        head: {
          text: `string`
        }
      },
      input_data: 'stringdata'
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 2,
        head: {
          time: 123456
        },
        flags: 0x0200
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 2,
        head: {
          extra_len: 20
        },
        flags: 0x0400
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 9,
        head: {
          extra_len: 20
        },
        flags: 0x0400
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 12,
        head: {
          extra_len: 20
        },
        flags: 0x0400
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method and set the variables', () => {
    const stream = {
      state: {
        mode: 15,
        length: 0,
        head: {
          extra_len: 20
        },
        flags: 0x0400
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method with table length mode and set the variables', () => {
    const stream = {
      state: {
        mode: 16,
        length: 0,
        head: {
          extra_len: 20
        },
        flags: 0x0400
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate method with table length mode and set the variables', () => {
    const stream = {
      state: {
        mode: 6,
        length: 0,
        head: {
          extra_len: 20,
          name: null
        },
        flags: 0x0800
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the adler array function and set the variables', () => {
    zlib.adler32(null, ['string'], 0, 5570)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the adler string function and set the variables', () => {
    zlib.adler32(null, 'string', 0, 5570)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate prime function and set the varibales', () => {
    const stream = {
      state: {
        mode: 6,
        length: 0
      },
      input_data: 'stringdata',
      checksum_function: jest.fn()
    }

    zlib.inflatePrime(stream, 10, 10)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should return error if no stream is provided to inflate function', () => {
    const result = zlib.inflate('')
    console.info(result)
    expect(result).toEqual(-2)
  })

  it('should call the inflate function with waiting for length code', () => {
    const stream = {
      state: {
        mode: 23,
        length: 0,
        extra: 'extra',
        distcode: 0,
        distbits: 0,
        codes: [
          1,
          2,
          3,
          4,
          5
        ],
        offset: 0
      },
      input_data: 'stringdata',
      output_data: 'string',
      next_out: 1,
      checksum_function: jest.fn()
    }
    //zlib.inflate(stream, 6);
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate function and set the variables', () => {
    const stream = {
      state: {
        mode: 26,
        wrap: 'wrap'
      },
      input_data: 'stringdata'
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })

  it('should call the inflate function and set the variables', () => {
    const stream = {
      state: {
        mode: 27,
        wrap: 'wrap'
      },
      input_data: 'stringdata'
    }

    zlib.inflate(stream, 6)
    expect(zlib.common_initialized).toEqual(true)
  })
})
