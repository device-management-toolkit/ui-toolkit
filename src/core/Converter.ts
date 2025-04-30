import { isTruthy } from './Utilities/UtilityMethods'

/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Vinay G
 **********************************************************************/
export const TypeConverter = {
  // Binary encoding and decoding functions
  ReadShort(v: string, p: number): number {
    //
    return (v.charCodeAt(p) << 8) + v.charCodeAt(p + 1)
  },

  ReadShortX(v: string, p: number): number {
    return (v.charCodeAt(p + 1) << 8) + v.charCodeAt(p)
  },

  ReadInt(v: string, p: number): number {
    return v.charCodeAt(p) * 0x1000000 + (v.charCodeAt(p + 1) << 16) + (v.charCodeAt(p + 2) << 8) + v.charCodeAt(p + 3)
  }, // We use "*0x1000000" instead of "<<24" because the shift converts the number to signed int32.

  ReadSInt(v: string, p: number): number {
    return (v.charCodeAt(p) << 24) + (v.charCodeAt(p + 1) << 16) + (v.charCodeAt(p + 2) << 8) + v.charCodeAt(p + 3)
  },

  ReadIntX(v: string, p: number): number {
    return v.charCodeAt(p + 3) * 0x1000000 + (v.charCodeAt(p + 2) << 16) + (v.charCodeAt(p + 1) << 8) + v.charCodeAt(p)
  },

  ShortToStr(v: number): string {
    return String.fromCharCode((v >> 8) & 0xff, v & 0xff)
  },

  ShortToStrX(v: number): string {
    return String.fromCharCode(v & 0xff, (v >> 8) & 0xff)
  },

  IntToStr(v: number): string {
    return String.fromCharCode((v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff)
  },

  IntToStrX(v: number): string {
    return String.fromCharCode(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff)
  },

  SplitArray(v: string): string[] {
    return v.split(',')
  },

  Clone(v: string): string {
    return JSON.parse(JSON.stringify(v))
  },

  EscapeHtml(x: string | number | boolean): string | number | boolean | undefined {
    if (typeof x === 'string') {
      return x
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }
    if (typeof x === 'boolean') {
      return x
    }
    if (typeof x === 'number') {
      return x
    }
  },

  // Move an element from one position in an array to a new position
  ArrayElementMove(arr: number[], from: number, to: number): void {
    arr.splice(to, 0, arr.splice(from, 1)[0])
  },

  // Print object for HTML
  ObjectToStringEx(x: any, c: number): string {
    let r = ''
    if (x !== 0 && (!isTruthy(x) || x == null)) return '(Null)'
    if (x instanceof Array) {
      // eslint-disable-next-line @typescript-eslint/no-for-in-array
      for (const i in x) {
        r =
          r + '<br />' + String(this.gap(c)) + 'Item #' + String(i) + ': ' + String(this.ObjectToStringEx(x[i], c + 1))
      }
    } else if (x instanceof Object) {
      for (const j in x) {
        r = r + '<br />' + String(this.gap(c)) + String(j) + ' = ' + String(this.ObjectToStringEx(x[j], c + 1))
      }
    } else {
      r = r + String(this.EscapeHtml(x))
    }
    return r
  },

  // Print object for console
  ObjectToStringEx2(x: any, c: number): string {
    let r = ''
    if (x !== 0 && (!isTruthy(x) || x == null)) {
      return '(Null)'
    }
    if (x instanceof Array) {
      // eslint-disable-next-line @typescript-eslint/no-for-in-array
      for (const i in x) {
        r =
          r + '\r\n' + String(this.gap2(c)) + 'Item #' + String(i) + ': ' + String(this.ObjectToStringEx2(x[i], c + 1))
      }
    } else if (x instanceof Object) {
      for (const j in x) {
        r = r + '\r\n' + String(this.gap2(c)) + String(j) + ' = ' + String(this.ObjectToStringEx2(x[j], c + 1))
      }
    } else {
      r = r + String(this.EscapeHtml(x))
    }
    return r
  },

  // Create an ident gap
  gap(c: number): string {
    let x = ''
    for (let i = 0; i < c * 4; i++) {
      x += '&nbsp;'
    }
    return x
  },

  gap2(c: number): string {
    let x = ''
    for (let i = 0; i < c * 4; i++) {
      x += ' '
    }
    return x
  },

  // Print an object in html
  ObjectToString(x: any): string {
    return this.ObjectToStringEx(x, 0)
  },

  ObjectToString2(x: any): string {
    return this.ObjectToStringEx2(x, 0)
  },

  // Convert decimal to hex
  char2hex(i: number): string {
    return (i + 0x100).toString(16).substr(-2).toUpperCase()
  },

  // Convert a raw string to a hex string
  rstr2hex(input: string): string {
    let r = ''
    let i = 0
    for (i = 0; i < input.length; i++) {
      r = r + String(this.char2hex(input.charCodeAt(i)))
    }
    return r
  },

  // UTF-8 encoding & decoding functions
  encode_utf8(s: string): string {
    return unescape(encodeURIComponent(s))
  },

  decode_utf8(s: string): string {
    return decodeURIComponent(escape(s))
  },

  // Convert a string into a blob
  data2blob(data: string): any {
    const bytes = new Array(data.length)
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i)
    }
    const blob = new Blob([new Uint8Array(bytes)])
    return blob
  },

  // Generate random numbers
  random(max: number): number {
    return Math.floor(Math.random() * max)
  },

  // Trademarks
  trademarks(x: string): string {
    return x.replace(/\(R\)/g, '&reg;').replace(/\(TM\)/g, '&trade;')
  },

  arrToStr(arr): any {
    return String.fromCharCode.apply(null, arr)
  }
}
