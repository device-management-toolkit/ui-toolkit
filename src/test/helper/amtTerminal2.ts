/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AmtTerminal } from '../../core/AMTTerminal'

export class AmtTerminal2 extends AmtTerminal {
  capture: string

  constructor(t: any) {
    super()
    this.capture = ''
  }
}
