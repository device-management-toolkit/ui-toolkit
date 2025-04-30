/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
export declare class AmtTerminal {
  capture: string
  terminalEmulation: number
  fxEmulation: number
  fxLineBreak: number
  /** used to map Ascii values received from serial port to unicode characters */
  AsciiToUnicode: number[]
  AsciiToUnicodeIntel: number[]
  StateChange: (newState: any) => any
  /** sending  multiple unicode values to socket */
  TermSendKeys: (keys: any) => any
  onSend: (data: any) => void
  ProcessData: (str: string) => void
}
