/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { AMTRedirector, type RedirectorConfig } from './AMTRedirector'
import { type IKvmDataCommunicator } from './Interfaces'

export class AMTKvmDataRedirector extends AMTRedirector implements IKvmDataCommunicator {
  onSendKvmData: (data: string) => void
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(config: RedirectorConfig) {
    super(config)
  }
}
