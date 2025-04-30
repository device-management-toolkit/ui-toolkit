/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type IServerCutTextHandler } from '../../core'

class ServerCutTextHandler implements IServerCutTextHandler {
  handleServerCutText(acc: string): number {
    return 15
  }
}

export { ServerCutTextHandler }
