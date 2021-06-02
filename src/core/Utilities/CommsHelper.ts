/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/

import { Desktop } from '../Desktop'
import { TypeConverter } from '../Converter'
import { ICommunicator } from '../ICommunicator'
import { isTruthy } from './UtilityMethods'
export const CommsHelper = {
  sendRefresh (parent: Desktop, comm: ICommunicator): void {
    if (parent.holding) return

    if (parent.focusMode > 0) {
      // Request only pixels around the last mouse position
      const df = parent.focusMode * 2
      comm.send(String.fromCharCode(3, 1) +
        TypeConverter.ShortToStr(Math.max(Math.min(parent.oldMouseX, parent.lastMouseX) - parent.focusMode, 0)) +
        TypeConverter.ShortToStr(Math.max(Math.min(parent.oldMouseY, parent.lastMouseY) - parent.focusMode, 0)) +
        TypeConverter.ShortToStr(df + Math.abs(parent.oldMouseX - parent.lastMouseX)) +
        TypeConverter.ShortToStr(df + Math.abs(parent.oldMouseY - parent.lastMouseY))) // FramebufferUpdateRequest
      parent.oldMouseX = parent.lastMouseX
      parent.oldMouseY = parent.lastMouseY
    } else {
      // Request the entire screen
      comm.send(String.fromCharCode(3, 1, 0, 0, 0, 0) +
        TypeConverter.ShortToStr(parent.rwidth) +
        TypeConverter.ShortToStr(parent.rheight)) // FramebufferUpdateRequest
    }
  },

  sendKey (comm: ICommunicator, k: any, d: number): any {
    if (typeof k === 'object') { for (const i in k) { CommsHelper.sendKey(comm, k[i][0], k[i][1]) } } else { comm.send(String.fromCharCode(4, d, 0, 0) + TypeConverter.IntToStr(k)) }
  },

  sendKvmData (parent: Desktop, comm: ICommunicator, x: any): any {
    if (parent.onKvmDataAck !== true) {
      parent.onKvmDataPending.push(x)
    } else {
      if (isTruthy(parent.urlvars) && isTruthy(parent.urlvars.kvmdatatrace)) { console.log(`KVM-Send(${String(x.length)}): ${String(x)}`) }
      x = '\0KvmDataChannel\0' + String(x)
      comm.send(`${String.fromCharCode(6, 0, 0, 0)}${TypeConverter.IntToStr(x.length)}${String(x)}`)
      parent.onKvmDataAck = false
    }
  },

  sendKeepAlive (parent: Desktop, comm: ICommunicator): any {
    if (parent.lastKeepAlive < Date.now() - 5000) {
      parent.lastKeepAlive = Date.now()
      comm.send(String.fromCharCode(6, 0, 0, 0) + TypeConverter.IntToStr(16) + '\0KvmDataChannel\0')
    }
  },

  sendCtrlAltDelMsg (comm: ICommunicator): any {
    CommsHelper.sendCad(comm)
  },

  sendCad (comm: ICommunicator): any {
    CommsHelper.sendKey(comm, 0xFFE3, 1) // Control
    CommsHelper.sendKey(comm, 0xFFE9, 1) // Alt
    CommsHelper.sendKey(comm, 0xFFFF, 1) // Delete
    CommsHelper.sendKey(comm, 0xFFFF, 0) // Delete
    CommsHelper.sendKey(comm, 0xFFE9, 0) // Alt
    CommsHelper.sendKey(comm, 0xFFE3, 0) // Control
  }
}
