/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/
import { AMTRedirector, type RedirectorConfig } from './AMTRedirector'
import { type IKvmDataCommunicator } from './Interfaces'
export declare class AMTKvmDataRedirector extends AMTRedirector implements IKvmDataCommunicator {
  onSendKvmData: (data: string) => void
  constructor(config: RedirectorConfig)
}
