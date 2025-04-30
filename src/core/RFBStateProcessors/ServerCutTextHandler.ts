/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/

import { type IKvmDataCommunicator, type IServerCutTextHandler } from '../Interfaces'
import { type Desktop } from '../Desktop'
import { TypeConverter } from '../Converter'
import { isTruthy } from '../Utilities/UtilityMethods'
class ServerCutTextHandler implements IServerCutTextHandler {
  wsSocket: IKvmDataCommunicator
  parent: Desktop
  constructor(comm: IKvmDataCommunicator, parent: Desktop) {
    this.wsSocket = comm
    this.parent = parent
  }

  handleServerCutText(acc: string): number {
    if (acc.length < 8) return 0
    const len = TypeConverter.ReadInt(acc, 4) + 8
    if (acc.length < len) return 0

    if (this.parent.onKvmData != null) {
      const d = acc.substring(8, len)
      if (d.length >= 16 && d.substring(0, 15) === '\0KvmDataChannel') {
        if (!this.parent.kvmDataSupported) {
          this.parent.kvmDataSupported = true
          console.log('KVM Data Channel Supported.')
        }
        if ((this.parent.onKvmDataAck === -1 && d.length === 16) || d.charCodeAt(15) !== 0) {
          this.parent.onKvmDataAck = true
        }
        if (isTruthy(this.parent.urlvars) && isTruthy(this.parent.urlvars.kvmdatatrace)) {
          console.debug(`KVM-Recv((${d.length - 16})):  ${d.substring(16)}`)
        }
        if (d.length > 16) {
          this.parent.onKvmData(d.substring(16))
        } // Event the data and ack
        if (this.parent.onKvmDataAck === true && this.parent.onKvmDataPending.length > 0) {
          this.wsSocket.onSendKvmData(this.parent.onKvmDataPending.shift() ?? '')
        } // Send pending data
      }
    }
    return len
  }
}

export { ServerCutTextHandler }
