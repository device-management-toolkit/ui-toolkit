/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type AMTRedirector } from './AMTRedirector'
import { IDERDataProcessor } from './IDERDataProcessor'
export interface IDERInfo {
  major: number
  minor: number
  fwmajor: number
  fwminor: number
  readbfr: number
  writebfr: number
  proto: number
  iana: number
}
export declare class AMTIDER {
  protocol: number
  bytesToAmt: number
  bytesFromAmt: number
  floppyRead: number
  floppyWrite: number
  cdromRead: number
  cdromWrite: number
  rx_timeout: number
  tx_timeout: number
  heartbeat: number
  version: number
  acc: string
  inSequence: number
  outSequence: number
  iderinfo: IDERInfo
  enabled: boolean
  iderStart: number
  floppy: File | null
  cdrom: File | null
  floppyReady: boolean
  cdromReady: boolean
  amtRedirector: AMTRedirector
  sectorStats: any
  g_readQueue: any
  g_reset: boolean
  g_media: any
  g_dev: number
  g_lba: number
  g_len: number
  dataProcessor: IDERDataProcessor
  constructor(amtRedirector: AMTRedirector, cdrom: File | null, floppy: File | null)
  stateChange(newstate: number): void
  start(): void
  stop(): void
  processData(data: string): void
  sendCommand(cmdid: number, data?: string, completed?: boolean, dma?: number): void
  sendCommandEndResponse(error: boolean, sense: number, device: number, asc?: number, asq?: number): void
  sendDataToHost(device: number, completed: boolean, data: string, dma: number): void
  sendGetDataFromHost(device: number, chunksize: number): void
  sendDisableEnableFeatures(data?: string): void
  sendDiskData(dev: number, lba: number, len: number, featureRegister: number): void
  sendDiskDataEx(featureRegister: number): void
}
