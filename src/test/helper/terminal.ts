/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
export class Terminal {
  writestring: string
  resetvalue: number
  constructor() {
    this.writestring = ';'
    this.resetvalue = 0
  }

  write(strarg: string): void {
    this.writestring = strarg
  }

  reset(): void {
    this.resetvalue = 1
  }
}
