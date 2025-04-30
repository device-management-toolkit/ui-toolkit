/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TypeConverter } from '../core/Converter'

describe('Test ReadShort function: ', () => {
  // Test Input "1928"
  const input =
    String.fromCharCode(0x00) + String.fromCharCode(0x13) + String.fromCharCode(0x00) + String.fromCharCode(0x1c)

  it('Test if ReadShort works for positive test case: first two nibbles', () => {
    const value = TypeConverter.ReadShort(input, 0)
    expect(value).toBe(19)
  })

  it('Test if ReadShort works for positive test case: third-fourth nibble', () => {
    const value = TypeConverter.ReadShort(input, 2)
    expect(value).toBe(28)
  })
})

describe('Test ReadShortX function: ', () => {
  // Test Input "9876"
  const input =
    String.fromCharCode(0x62) + String.fromCharCode(0x00) + String.fromCharCode(0x4c) + String.fromCharCode(0x00)

  it('Test if ReadShortX works for positive test case: first two nibbles', () => {
    const value = TypeConverter.ReadShortX(input, 0)
    expect(value).toBe(98)
  })

  it('Test if ReadShortX works for positive test case: third-fourth nibble', () => {
    const value = TypeConverter.ReadShortX(input, 2)
    expect(value).toBe(76)
  })
})

describe('Test ReadInt function: ', () => {
  // Test Input "98765432"
  const input =
    String.fromCharCode(0x00) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x26) +
    String.fromCharCode(0x94) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x15) +
    String.fromCharCode(0x38)

  it('Test if ReadInt works for positive test case: position 0th-3rd bytes', () => {
    const value = TypeConverter.ReadInt(input, 0)
    expect(value).toBe(9876)
  })

  it('Test if ReadInt works for positive test case: position 4th-7th bytes', () => {
    const value = TypeConverter.ReadInt(input, 4)
    expect(value).toBe(5432)
  })
})

describe('Test ReadSInt function: ', () => {
  // Test Input "-98765432"
  const input =
    String.fromCharCode(0xff) +
    String.fromCharCode(0xff) +
    String.fromCharCode(0xd9) +
    String.fromCharCode(0x6c) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x15) +
    String.fromCharCode(0x38)

  it('Test if ReadSInt works for positive test case: position 0th-3rd bytes', () => {
    const value = TypeConverter.ReadSInt(input, 0)
    expect(value).toBe(-9876)
  })

  it('Test if ReadSInt works for positive test case: position 4th-7th bytes', () => {
    const value = TypeConverter.ReadSInt(input, 4)
    expect(value).toBe(5432)
  })
})

describe('Test ReadIntX function: ', () => {
  // Test Input "98765432"
  const input =
    String.fromCharCode(0x94) +
    String.fromCharCode(0x26) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x38) +
    String.fromCharCode(0x15) +
    String.fromCharCode(0x00) +
    String.fromCharCode(0x00)

  it('Test if ReadIntX works for positive test case: position 0th-3rd bytes', () => {
    const value = TypeConverter.ReadIntX(input, 0)
    expect(value).toBe(9876)
  })

  it('Test if ReadIntX works for positive test case: position 4th-7th bytes', () => {
    const value = TypeConverter.ReadIntX(input, 4)
    expect(value).toBe(5432)
  })
})

describe('Test ShortToStr function: ', () => {
  // Test Input 43
  const input = 0x3433

  it('Test if ShortToStr works for positive test case', () => {
    const value = TypeConverter.ShortToStr(input)
    expect(value).toBe('43')
  })
})

describe('Test ShortToStrX function: ', () => {
  // Test Input 34
  const input = 0x3433

  it('Test if ShortToStrX works for positive test case', () => {
    const value = TypeConverter.ShortToStrX(input)
    expect(value).toBe('34')
  })
})

describe('Test IntToStr function: ', () => {
  // Test Input 9876
  const input = 0x39383736

  it('Test if IntToStr works for positive test case', () => {
    const value = TypeConverter.IntToStr(input)
    expect(value).toBe('9876')
  })
})

describe('Test IntToStrX function: ', () => {
  // Test Input 4321
  const input = 0x31323334

  it('Test if IntToStrX works for positive test case', () => {
    const value = TypeConverter.IntToStrX(input)
    expect(value).toBe('4321')
  })
})

describe('Test SplitArray function: ', () => {
  // Test Input "123"
  const input = '123'

  it('Test if SplitArray works for positive test case', () => {
    const value = TypeConverter.SplitArray(input)
    expect(value).toEqual(expect.arrayContaining(['123']))
  })
})

describe('Test Clone function: ', () => {
  // Test Input "123"
  const input = '123456'

  it('Test if Clone works for positive test case', () => {
    const value = TypeConverter.Clone(input)
    expect(value).toBe('123456')
  })
})

describe('Test EscapeHtml function: ', () => {
  // Test Input number:765
  const input1 = 765

  it('Test if EscapeHtml works for positive test case: number', () => {
    const value = TypeConverter.EscapeHtml(input1)
    expect(value).toBe(765)
  })

  // Test Input boolean:true
  const input2 = true

  it('Test if EscapeHtml works for positive test case: boolean', () => {
    const value = TypeConverter.EscapeHtml(input2)
    expect(value).toBe(true)
  })

  // Test Input string:'a">b&c<def'g'
  // eslint-disable-next-line no-useless-escape
  const input3 = 'a\"\>b\&c\<def\'g'

  it('Test if EscapeHtml works for positive test case: string', () => {
    const value = TypeConverter.EscapeHtml(input3)
    expect(value).toBe('a&quot;&gt;b&amp;c&lt;def&apos;g')
  })
})

describe('Test ArrayElementMove function: ', () => {
  // Test Input [1, 2, 3, 4, 5, 6, 7, 8]
  const input = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8
  ]
  // Expected Output with movement of element from
  // position 2 to 5 is [1, 2, 4, 5, 6, 3, 7, 8]
  const output = [
    1,
    2,
    4,
    5,
    6,
    3,
    7,
    8
  ]

  it('Test if ArrayElementMove works for positive test case', () => {
    TypeConverter.ArrayElementMove(input, 2, 5)
    expect(input).toEqual(expect.arrayContaining(output))
  })
})

describe('Test ObjectToStringEx function: ', () => {
  // Test Input number:[10, 20, 30]
  const input = [
    10,
    20,
    30
  ]
  // 4 non-breaking space
  const space = 1
  const output =
    '<br />&nbsp;&nbsp;&nbsp;&nbsp;Item #0: 10' +
    '<br />&nbsp;&nbsp;&nbsp;&nbsp;Item #1: 20' +
    '<br />&nbsp;&nbsp;&nbsp;&nbsp;Item #2: 30'

  it('Test if ObjectToStringEx works for positive test case: array', () => {
    const value = TypeConverter.ObjectToStringEx(input, space)
    expect(value).toBe(output)
  })

  // class for testing
  class Test {
    test1: number
    test2: string
    test3: number
  }
  // Test Input Object
  const input2 = new Test()
  input2.test1 = 22
  input2.test2 = 'Test'
  input2.test3 = 33
  const output2 =
    '<br />&nbsp;&nbsp;&nbsp;&nbsp;test1 = 22' +
    '<br />&nbsp;&nbsp;&nbsp;&nbsp;test2 = Test' +
    '<br />&nbsp;&nbsp;&nbsp;&nbsp;test3 = 33'

  it('Test if ObjectToStringEx works for positive test case: Object', () => {
    const value = TypeConverter.ObjectToStringEx(input2, space)
    expect(value).toBe(output2)
  })
})

describe('Test ObjectToStringEx2 function: ', () => {
  // Test Input number:[10, 20, 30]
  const input = [
    10,
    20,
    30
  ]
  // 4 non-breaking space
  const space = 1
  const output = '\r\n    Item #0: 10' + '\r\n    Item #1: 20' + '\r\n    Item #2: 30'

  it('Test if ObjectToStringEx2 works for positive test case: array', () => {
    const value = TypeConverter.ObjectToStringEx2(input, space)
    expect(value).toBe(output)
  })

  // class for testing
  class Test {
    test1: number
    test2: string
    test3: number
  }
  // Test Input Object
  const input2 = new Test()
  input2.test1 = 22
  input2.test2 = 'Test'
  input2.test3 = 33
  const output2 = '\r\n    test1 = 22' + '\r\n    test2 = Test' + '\r\n    test3 = 33'

  it('Test if ObjectToStringEx2 works for positive test case: Object', () => {
    const value = TypeConverter.ObjectToStringEx2(input2, space)
    expect(value).toBe(output2)
  })
})

describe('Test gap function: ', () => {
  // Test Input number:2
  const input = 2

  it('Test if gap works for positive test case', () => {
    const value = TypeConverter.gap(input)
    expect(value).toBe('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
  })
})

describe('Test gap2 function: ', () => {
  // Test Input number:3
  const input = 3

  it('Test if gap2 works for positive test case', () => {
    const value = TypeConverter.gap2(input)
    expect(value).toBe('            ')
  })
})

describe('Test ObjectToString function: ', () => {
  class Test {
    test1: number
    test2: boolean
    test3: string
  }
  // Test Input number:Object
  const input = new Test()
  input.test1 = 25
  input.test2 = true
  input.test3 = 'TEST'
  // Test Output
  const output = '<br />test1 = 25' + '<br />test2 = true' + '<br />test3 = TEST'

  it('Test if ObjectToString works for positive test case', () => {
    const value = TypeConverter.ObjectToString(input)
    expect(value).toBe(output)
  })
})

describe('Test ObjectToString2 function: ', () => {
  class Test {
    test1: number
    test2: boolean
    test3: string
  }
  // Test Input number:Object
  const input = new Test()
  input.test1 = 35
  input.test2 = false
  input.test3 = 'TEST'
  // Test Output
  const output = '\r\ntest1 = 35' + '\r\ntest2 = (Null)' + '\r\ntest3 = TEST'

  it('Test if ObjectToString2 works for positive test case', () => {
    const value = TypeConverter.ObjectToString2(input)
    expect(value).toBe(output)
  })
})

describe('Test char2hex function: ', () => {
  // Test Input number:75
  const input = 75

  it('Test if char2hex works for positive test case', () => {
    const value = TypeConverter.char2hex(input)
    expect(value).toBe('4B')
  })
})

describe('Test rstr2hex function: ', () => {
  // Test Input number:89
  const input = '89'

  it('Test if rstr2hex works for positive test case', () => {
    const value = TypeConverter.rstr2hex(input)
    expect(value).toBe('3839')
  })
})

describe('Test encode_utf8 function: ', () => {
  // Test Input number:URL
  const input = 'https://TEST.com/'
  // encode_utf8 function calls encodeURIComponent and then
  //  call unescape; input should be same as output
  const output = 'https://TEST.com/'

  it('Test if encode_utf8 works for positive test case', () => {
    const value = TypeConverter.encode_utf8(input)
    expect(value).toBe(output)
  })
})

describe('Test decode_utf8 function: ', () => {
  const input = 'https%3A%2F%2FTEST.com%2F'
  // decode_utf8 function calls escape and then
  //  call decodeURIComponent; input should be same as output
  const output = 'https%3A%2F%2FTEST.com%2F'

  it('Test if decode_utf8 works for positive test case', () => {
    const value = TypeConverter.decode_utf8(input)
    expect(value).toBe(output)
  })
})

describe('Test random function: ', () => {
  const max = 10000

  it('Test if random works for positive test case', () => {
    // Call random() multiple times and
    // verify that they are not same value
    const value1 = TypeConverter.random(max)
    const value2 = TypeConverter.random(max)
    const value3 = TypeConverter.random(max)
    expect(value1).not.toEqual(value2)
    expect(value1).not.toEqual(value3)
    expect(value3).not.toEqual(value2)
  })
})

describe('Test trademarks function: ', () => {
  // eslint-disable-next-line no-useless-escape
  const input = 'AB/\(TM\)/CD/\(R\)/EF'
  const output = 'AB/&trade;/CD/&reg;/EF'

  it('Test if trademarks works for positive test case', () => {
    const value = TypeConverter.trademarks(input)
    expect(value).toBe(output)
  })
})
