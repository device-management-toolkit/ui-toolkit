/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { TypeConverter } from './Converter'
import { type AMTRedirector } from './AMTRedirector'
import { IDERDataProcessor } from './IDERDataProcessor'
import { REGS_TOGGLE } from './Constants'

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

// Construct a Intel AMT IDER object
export class AMTIDER {
  protocol = 3 // IDER
  bytesToAmt = 0
  bytesFromAmt = 0
  floppyRead = 0
  floppyWrite = 0
  cdromRead = 0
  cdromWrite = 0
  rx_timeout = 30000 // Default 30000
  tx_timeout = 0 // Default 0
  heartbeat = 20000 // Default 20000
  version = 1
  acc = ''
  inSequence = 0
  outSequence = 0
  iderinfo: IDERInfo
  enabled = false
  iderStart = 0 // OnReboot = 0, Graceful = 1, Now = 2
  floppy: File | null
  cdrom: File | null
  floppyReady = false
  cdromReady = false
  amtRedirector: AMTRedirector
  sectorStats: any = null

  g_readQueue: any = []
  g_reset = false
  g_media: any = null
  g_dev: number
  g_lba: number
  g_len: number

  dataProcessor: IDERDataProcessor

  constructor(amtRedirector: AMTRedirector, cdrom: File | null, floppy: File | null) {
    this.amtRedirector = amtRedirector
    this.floppy = floppy
    this.cdrom = cdrom
    this.dataProcessor = new IDERDataProcessor(this)
  }

  // Private method, called by parent when it change state
  stateChange(newstate: number): void {
    console.debug(`IDER-StateChange: ${newstate}`)
    if (newstate === 0) {
      this.stop()
    }
    if (newstate === 3) {
      this.start()
    }
  }

  start(): void {
    console.log('IDER-Start')
    console.debug('Floppy: ', this.floppy)
    console.debug('CD-ROM: ', this.cdrom)
    this.bytesToAmt = 0
    this.bytesFromAmt = 0
    this.floppyRead = 0
    this.floppyWrite = 0
    this.cdromRead = 0
    this.cdromWrite = 0
    this.inSequence = 0
    this.outSequence = 0
    this.g_readQueue = []
    // Send first command, OPEN_SESSION
    this.sendCommand(
      0x40,
      TypeConverter.ShortToStrX(this.rx_timeout) +
        TypeConverter.ShortToStrX(this.tx_timeout) +
        TypeConverter.ShortToStrX(this.heartbeat) +
        TypeConverter.IntToStrX(this.version)
    )

    // Send sector stats
    console.log('Send sector stats')
    if (typeof this.sectorStats === 'function') {
      console.log('IDE-R sectorStats')
      this.sectorStats(0, 0, this.floppy != null ? this.floppy.size >> 9 : 0, 0, 0)
      this.sectorStats(0, 1, this.cdrom != null ? this.cdrom.size >> 11 : 0, 0, 0)
    }
  }

  stop(): void {
    console.log('IDER-Stop')
    this.amtRedirector.stop()
  }

  processData(data: string): void {
    this.bytesFromAmt += data.length
    this.acc += data
    console.debug(`IDER-ProcessData:  ${this.acc.length}, ${TypeConverter.rstr2hex(this.acc)}`)
    // Process as many commands as possible
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // checks if the received data contains at least 8 bytes in the header.
      // If not, it returns 0, indicating that there is not enough data to process.
      console.debug('acc data:', JSON.stringify(this.acc))
      if (this.acc.length < 8) {
        return
      }
      console.debug('this.ider.acc.charCodeAt(0):', this.acc.charCodeAt(0))
      const header = this.acc.charCodeAt(0)

      const len = this.dataProcessor.interpretCommandData(header)
      // const len = this.interpretCommandData()
      if (len === 0) return
      console.debug(
        `this.acc : ${this.acc} this.inSequence : ${this.inSequence}  ${TypeConverter.ReadIntX(this.acc, 4)}`
      )
      if (this.inSequence !== TypeConverter.ReadIntX(this.acc, 4)) {
        console.debug(`ERROR: Out of sequence ${this.inSequence}, ${TypeConverter.ReadIntX(this.acc, 4)}`)
        this.stop()
        return
      }
      this.inSequence++
      this.acc = this.acc.substring(len)
    }
  }

  // Private method
  sendCommand(cmdid: number, data = '', completed?: boolean, dma?: number): void {
    console.debug('cmdid :', cmdid, 'data', typeof data, 'completed :', completed, 'dma :', dma)
    let attributes = cmdid > 50 && completed === true ? 2 : 0
    if (dma != null) {
      attributes += 1
    }
    const x = String.fromCharCode(cmdid, 0, 0, attributes) + TypeConverter.IntToStrX(this.outSequence++) + data
    this.amtRedirector.socketSend(x)
    this.bytesToAmt += x.length
    if (cmdid !== 0x4b) {
      // If not 75
      console.debug('IDER-SendData', x.length, TypeConverter.rstr2hex(x))
    }
  }

  // CommandEndResponse (SCSI_SENSE)
  sendCommandEndResponse(error: boolean, sense: number, device: number, asc = 0, asq = 0): void {
    console.debug(`error: ${String(error)}, sense: ${sense}, device: ${device}, asc: ${asc}, asq: ${asq}`)
    if (error) {
      this.sendCommand(
        0x51,
        String.fromCharCode(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xc5, 0, 3, 0, 0, 0, device, 0x50, 0, 0, 0),
        true
      )
    } else {
      this.sendCommand(
        0x51,
        String.fromCharCode(
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0x87,
          sense << 4,
          3,
          0,
          0,
          0,
          device,
          0x51,
          sense,
          asc,
          asq
        ),
        true
      )
    }
  }

  // DataToHost (SCSI_READ)
  sendDataToHost(device: number, completed: boolean, data: string, dma: number): void {
    const dmalen: number = dma !== 0 ? 0 : data.length
    if (completed) {
      this.sendCommand(
        0x54,
        String.fromCharCode(
          0,
          data.length & 0xff,
          data.length >> 8,
          0,
          dma !== 0 ? 0xb4 : 0xb5,
          0,
          2,
          0,
          dmalen & 0xff,
          dmalen >> 8,
          device,
          0x58,
          0x85,
          0,
          3,
          0,
          0,
          0,
          device,
          0x50,
          0,
          0,
          0,
          0,
          0,
          0
        ) + data,
        completed,
        dma
      )
    } else {
      this.sendCommand(
        0x54,
        String.fromCharCode(
          0,
          data.length & 0xff,
          data.length >> 8,
          0,
          dma !== 0 ? 0xb4 : 0xb5,
          0,
          2,
          0,
          dmalen & 0xff,
          dmalen >> 8,
          device,
          0x58,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ) + data,
        completed,
        dma
      )
    }
  }

  // GetDataFromHost (SCSI_CHUNK)
  sendGetDataFromHost(device: number, chunksize: number): void {
    console.debug(`device: ${typeof device}, ${device}, chunksize: ${typeof chunksize}, ${chunksize}`)
    this.sendCommand(
      0x52,
      String.fromCharCode(
        0,
        chunksize & 0xff,
        chunksize >> 8,
        0,
        0xb5,
        0,
        0,
        0,
        chunksize & 0xff,
        chunksize >> 8,
        device,
        0x58,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ),
      false
    )
  }

  // DisableEnableFeatures (STATUS_DATA)
  // If type is REGS_TOGGLE (3), 4 bytes of data must be provided.
  sendDisableEnableFeatures(data = ''): void {
    this.sendCommand(0x48, String.fromCharCode(REGS_TOGGLE) + data)
  }

  sendDiskData(dev: number, lba: number, len: number, featureRegister: number): void {
    let media: File | null
    let mediaBlocks = 0
    console.debug(`dev in sendDiskData : ${dev}`)
    if (dev === 0xa0) {
      // 160 floppy
      console.debug(`dev in sendDiskData 0xA0: ${dev}`)
      media = this.floppy
      if (this.floppy != null) {
        mediaBlocks = this.floppy.size >> 9
      }
    } else {
      // if (dev == 0xB0) { //176 cdrom
      console.debug(`dev in sendDiskData 0xB0: ${dev}`)
      media = this.cdrom
      if (this.cdrom != null) {
        mediaBlocks = this.cdrom.size >> 11
      }
    }

    if (len < 0 || lba + len > mediaBlocks) {
      this.sendCommandEndResponse(true, 0x05, dev, 0x21, 0x00)
      return
    }
    if (len === 0) {
      this.sendCommandEndResponse(true, 0x00, dev, 0x00, 0x00)
      return
    }

    // Send sector stats
    if (typeof this.sectorStats === 'function') {
      this.sectorStats(1, dev === 0xa0 ? 0 : 1, mediaBlocks, lba, len)
    }

    if (dev === 0xa0) {
      lba <<= 9
      len <<= 9
    } else {
      lba <<= 11
      len <<= 11
    }
    if (this.g_media != null) {
      // Queue read operation
      this.g_readQueue.push({ media, dev, lba, len, fr: featureRegister })
    } else {
      // obj.iderinfo.readbfr // TODO: MaxRead
      this.g_media = media
      this.g_dev = dev
      this.g_lba = lba
      this.g_len = len
      this.sendDiskDataEx(featureRegister)
    }
  }

  sendDiskDataEx(featureRegister: number): void {
    console.debug('featureRegister :', featureRegister)
    let len: number = this.g_len
    const lba: number = this.g_lba
    console.debug('this.g_len: ', this.g_len, 'this.g_lba :', this.g_lba)
    if (this.g_len > this.iderinfo.readbfr) {
      len = this.iderinfo.readbfr
    }
    this.g_len -= len
    this.g_lba += len
    const fr = new FileReader()
    fr.onload = () => {
      console.debug('fr.result :', fr.result)
      let result = fr.result
      if (typeof result === 'object') {
        result = TypeConverter.arrToStr(new Uint8Array(result as ArrayBufferLike))
      }
      this.sendDataToHost(this.g_dev, this.g_len === 0, result as string, featureRegister & 1)
      console.debug('this.g_len: ', this.g_len, '!this.g_reset :', !this.g_reset)
      if (this.g_len > 0 && !this.g_reset) {
        this.sendDiskDataEx(featureRegister)
      } else {
        this.g_media = null
        console.debug('this.g_reset :', this.g_reset)
        if (this.g_reset) {
          this.sendCommand(0x47)
          this.g_readQueue = []
          this.g_reset = false // Send ResetOccuredResponse
        } else if (this.g_readQueue.length > 0) {
          console.debug('this.g_readQueue :', this.g_readQueue.length)
          const op = this.g_readQueue.shift()
          this.g_media = op.media
          this.g_dev = op.dev
          this.g_lba = op.lba
          this.g_len = op.len
          this.sendDiskDataEx(op.fr as number)
        } // Un-queue read operation
      }
    }
    if (fr.readAsBinaryString != null) {
      if (this.g_media != null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        fr.readAsBinaryString(this.g_media.slice(lba, lba + len))
      }
    } else {
      if (this.g_media != null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        fr.readAsArrayBuffer(this.g_media.slice(lba, lba + len))
      }
    }
  }
}
