/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/

import { type Desktop } from '../Desktop'
import { TypeConverter } from '../Converter'
import { type ICommunicator } from '../Interfaces/ICommunicator'
import { isTruthy } from './UtilityMethods'
import { type UpDown } from './KeyboardHelper'

const CommsHelper = {
  sendRefresh(parent: Desktop, comm: ICommunicator): void {
    if (parent.holding) return

    if (parent.focusMode > 0) {
      // Request only pixels around the last mouse position
      const df = parent.focusMode * 2
      comm.send(
        String.fromCharCode(3, 1) +
          TypeConverter.ShortToStr(Math.max(Math.min(parent.oldMouseX, parent.lastMouseX) - parent.focusMode, 0)) +
          TypeConverter.ShortToStr(Math.max(Math.min(parent.oldMouseY, parent.lastMouseY) - parent.focusMode, 0)) +
          TypeConverter.ShortToStr(df + Math.abs(parent.oldMouseX - parent.lastMouseX)) +
          TypeConverter.ShortToStr(df + Math.abs(parent.oldMouseY - parent.lastMouseY))
      ) // FramebufferUpdateRequest
      parent.oldMouseX = parent.lastMouseX
      parent.oldMouseY = parent.lastMouseY
    } else {
      // Request the entire screen
      comm.send(
        String.fromCharCode(3, 1, 0, 0, 0, 0) +
          TypeConverter.ShortToStr(parent.rwidth) +
          TypeConverter.ShortToStr(parent.rheight)
      ) // FramebufferUpdateRequest
    }
  },

  sendKey(comm: ICommunicator, k: number | any, d: UpDown): void {
    if (typeof k === 'object') {
      for (const i in k) {
        this.sendKey(comm, k[i][0], k[i][1])
      }
    } else {
      comm.send(String.fromCharCode(4, d, 0, 0) + TypeConverter.IntToStr(k as number))
    }
  },

  sendKvmData(parent: Desktop, comm: ICommunicator, x: string): void {
    if (parent.onKvmDataAck !== true) {
      parent.onKvmDataPending.push(x)
    } else {
      if (isTruthy(parent.urlvars) && isTruthy(parent.urlvars.kvmdatatrace)) {
        console.debug(`KVM-Send(${String(x.length)}): ${String(x)}`)
      }
      x = '\0KvmDataChannel\0' + String(x)
      comm.send(`${String.fromCharCode(6, 0, 0, 0)}${TypeConverter.IntToStr(x.length)}${String(x)}`)
      parent.onKvmDataAck = false
    }
  },

  sendKeepAlive(parent: Desktop, comm: ICommunicator): void {
    if (parent.lastKeepAlive < Date.now() - 5000) {
      parent.lastKeepAlive = Date.now()
      comm.send(String.fromCharCode(6, 0, 0, 0) + TypeConverter.IntToStr(16) + '\0KvmDataChannel\0')
    }
  },

  sendCtrlAltDelMsg(comm: ICommunicator): void {
    this.sendCad(comm)
  },

  sendCad(comm: ICommunicator): void {
    this.sendKey(comm, 0xffe3, 1) // Control
    this.sendKey(comm, 0xffe9, 1) // Alt
    this.sendKey(comm, 0xffff, 1) // Delete
    this.sendKey(comm, 0xffff, 0) // Delete
    this.sendKey(comm, 0xffe9, 0) // Alt
    this.sendKey(comm, 0xffe3, 0) // Control
  }
}

export { CommsHelper }
