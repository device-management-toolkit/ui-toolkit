/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Vinay G
 **********************************************************************/
export declare const TypeConverter: {
  ReadShort(v: string, p: number): number
  ReadShortX(v: string, p: number): number
  ReadInt(v: string, p: number): number
  ReadSInt(v: string, p: number): number
  ReadIntX(v: string, p: number): number
  ShortToStr(v: number): string
  ShortToStrX(v: number): string
  IntToStr(v: number): string
  IntToStrX(v: number): string
  SplitArray(v: string): string[]
  Clone(v: string): string
  EscapeHtml(x: string | number | boolean): string | number | boolean | undefined
  ArrayElementMove(arr: number[], from: number, to: number): void
  ObjectToStringEx(x: any, c: number): string
  ObjectToStringEx2(x: any, c: number): string
  gap(c: number): string
  gap2(c: number): string
  ObjectToString(x: any): string
  ObjectToString2(x: any): string
  char2hex(i: number): string
  rstr2hex(input: string): string
  encode_utf8(s: string): string
  decode_utf8(s: string): string
  data2blob(data: string): any
  random(max: number): number
  trademarks(x: string): string
  arrToStr(arr: any): any
}
