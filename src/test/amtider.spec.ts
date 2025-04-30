/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AMTIDER, IDERInfo } from '../core/AMTIDER'
import { AMTRedirector, Protocol, RedirectorConfig } from '../core/AMTRedirector'
import { TypeConverter } from '../core/Converter'

describe('AMTIDER', () => {
  let amtIder: AMTIDER
  let amtRedirector: AMTRedirector
  let config: RedirectorConfig

  const cdromMock: any = {
    name: 'netboot.xyz.iso',
    lastModified: 1691709797992,
    lastModifiedDate: 'Thu Aug 10 2023 16:23:17 GMT-0700 (Pacific Daylight Time)',
    webkitRelativePath: '',
    size: 2428928
  }
  const floppyMock: any = {
    name: 'floppy.img',
    lastModified: 1691704908577,
    lastModifiedDate: 'Thu Aug 10 2023 15:01:48 GMT-0700 (Pacific Daylight Time)',
    webkitRelativePath: '',
    size: 1474560
  }

  beforeEach(() => {
    config = {
      mode: 'ider',
      protocol: Protocol.IDER,
      fr: new FileReader(),
      host: '4c4c4544-004d-4d10-8050-b3c04f325133',
      port: 16994,
      user: '',
      pass: '',
      tls: 0,
      tls1only: 0,
      authToken: '',
      server: 'ws://localhost:3000/relay'
    }
    amtRedirector = new AMTRedirector(config)
    amtIder = new AMTIDER(amtRedirector, cdromMock, floppyMock)
  })

  afterEach(() => {})

  describe('AMTIDER stateChange', () => {
    it('should start when newstate is 3', () => {
      const startSpy = jest.spyOn(amtIder, 'start').mockImplementation()
      amtIder.stateChange(3)
      expect(startSpy).toHaveBeenCalled()
    })

    it('should stop when newstate is 0', () => {
      const stopSpy = jest.spyOn(amtIder, 'stop').mockImplementation()
      amtIder.stateChange(0)
      expect(stopSpy).toHaveBeenCalled()
    })
  })

  it('should start AMTIDER', () => {
    const sendCommandSpy = jest.spyOn(amtIder, 'sendCommand').mockImplementation()
    amtIder.start()
    expect(sendCommandSpy).toHaveBeenCalledWith(0x40, expect.any(String))
  })

  it('should stop AMTIDER', () => {
    const stopSpy = jest.spyOn(amtRedirector, 'stop').mockImplementation()
    amtIder.stop()
    expect(stopSpy).toHaveBeenCalled()
  })

  describe('AMTIDER processData', () => {
    it('should return', () => {
      const binaryData = Buffer.alloc(30).toString()
      const interpretCommandDataSpy = jest.spyOn(amtIder.dataProcessor, 'interpretCommandData').mockReturnValueOnce(0)

      amtIder.processData(binaryData)
      expect(amtIder.bytesFromAmt).toBe(30)
      expect(interpretCommandDataSpy).toHaveBeenCalled()
    })

    it('should stop IDER and return', () => {
      const binaryData = Buffer.alloc(30).toString()
      const stopSpy = jest.spyOn(amtRedirector, 'stop').mockImplementation()
      const interpretCommandDataSpy = jest.spyOn(amtIder.dataProcessor, 'interpretCommandData').mockReturnValueOnce(5)
      amtIder.inSequence = 5

      amtIder.processData(binaryData)

      expect(interpretCommandDataSpy).toHaveBeenCalled()
      expect(stopSpy).toHaveBeenCalled()
    })

    it('should continue to process data from AMT', () => {
      const binaryData = Buffer.alloc(35).toString()
      const interpretCommandDataSpy = jest
        .spyOn(amtIder.dataProcessor, 'interpretCommandData')
        .mockReturnValueOnce(5)
        .mockReturnValueOnce(0)
      amtIder.inSequence = 0

      amtIder.processData(binaryData)

      expect(interpretCommandDataSpy).toHaveBeenCalled()
      expect(amtIder.inSequence).toBe(1)
    })
  })

  describe('AMTIDER sendCommand', () => {
    let socketSendSpy: jest.SpyInstance<void, [string]>
    beforeEach(() => {
      socketSendSpy = jest.spyOn(amtRedirector, 'socketSend')
    })
    afterEach(() => {
      socketSendSpy.mockClear()
    })
    it('should send a command with attributes when cmdid > 50 and completed is true', () => {
      amtIder.sendCommand(64, 'data', true)
      expect(socketSendSpy).toHaveBeenCalledWith(String.fromCharCode(64, 0, 0, 2) + TypeConverter.IntToStrX(0) + 'data')
    })

    it('should send a command without attributes when cmdid <= 50', () => {
      amtIder.sendCommand(40, 'data', true)
      expect(socketSendSpy).toHaveBeenCalledWith(String.fromCharCode(40, 0, 0, 0) + TypeConverter.IntToStrX(0) + 'data')
    })

    it('should send a command without attributes when completed is not true', () => {
      amtIder.sendCommand(60, 'data', false)
      expect(socketSendSpy).toHaveBeenCalledWith(String.fromCharCode(60, 0, 0, 0) + TypeConverter.IntToStrX(0) + 'data')
    })

    it('should increment outSequence', () => {
      const initialOutSequence = amtIder.outSequence
      amtIder.sendCommand(60, 'data', true)
      expect(amtIder.outSequence).toBe(initialOutSequence + 1)
    })

    it('should update bytesToAmt', () => {
      const initialBytesToAmt = amtIder.bytesToAmt
      const expectedResult = String.fromCharCode(60, 0, 0, 3) + TypeConverter.IntToStrX(0) + 'data'
      amtIder.sendCommand(60, 'data', true, 1)
      expect(amtIder.bytesToAmt).toBe(initialBytesToAmt + expectedResult.length)
    })
  })

  describe('AMTIDER sendCommandEndResponse', () => {
    it('should send an error response', () => {
      const error = true
      const device = 0x01
      const sendCommandSpy = jest.spyOn(amtIder, 'sendCommand').mockImplementation()
      amtIder.sendCommandEndResponse(error, 0, device)

      expect(sendCommandSpy).toHaveBeenCalledWith(
        0x51,
        String.fromCharCode(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xc5, 0, 3, 0, 0, 0, device, 0x50, 0, 0, 0),
        true
      )
    })
    it('should send a success response', () => {
      const error = false
      const sense = 2
      const device = 0x01
      const asc = 0x12
      const asq = 0x34
      const sendCommandSpy = jest.spyOn(amtIder, 'sendCommand').mockImplementation()
      amtIder.sendCommandEndResponse(error, sense, device, asc, asq)

      expect(sendCommandSpy).toHaveBeenCalledWith(
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
    })
  })

  describe('AMTIDER sendDiskDataEx', () => {
    let mockFileReader: any
    let simulateOnload
    beforeEach(() => {
      mockFileReader = {
        onload: null,
        readAsBinaryString: jest.fn(),
        readAsArrayBuffer: jest.fn(),
        result: 'mockData',
        EMPTY: 0,
        LOADING: 1,
        DONE: 2
      }
      ;(global as any).FileReader = jest.fn(() => mockFileReader)
      simulateOnload = () => {
        mockFileReader.onload()
      }
    })
    it('should choose readAsBinaryString when available', () => {
      amtIder.g_media = new Blob(['data'])
      amtIder.g_len = 10
      amtIder.g_lba = 0
      amtIder.iderinfo = { readbfr: 15 } as IDERInfo

      amtIder.sendDiskDataEx(0)

      expect(mockFileReader.readAsBinaryString).toHaveBeenCalled()
    })
    it('should choose readAsArrayBuffer when readAsBinaryString is not available', () => {
      amtIder.g_media = new Blob(['data'])
      amtIder.g_len = 10
      amtIder.g_lba = 0
      amtIder.iderinfo = { readbfr: 15 } as IDERInfo
      mockFileReader.readAsBinaryString = null

      amtIder.sendDiskDataEx(0)

      expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalled()
    })
    it('should recurse if g_len > 0 and !g_reset', () => {
      amtIder.g_media = new Blob(['data'])
      amtIder.g_len = 100
      amtIder.g_lba = 0
      amtIder.iderinfo = { readbfr: 15 } as IDERInfo
      amtIder.g_reset = false

      const sendDiskDataExSpy = jest.spyOn(amtIder, 'sendDiskDataEx')

      amtIder.sendDiskDataEx(0)
      simulateOnload()

      expect(sendDiskDataExSpy).toHaveBeenCalledTimes(2)
      sendDiskDataExSpy.mockRestore()
    })

    it('should handle reset correctly', () => {
      amtIder.g_len = 10
      amtIder.g_lba = 5
      amtIder.iderinfo = { readbfr: 10 } as IDERInfo
      amtIder.g_media = new Blob(['data'.repeat(1000)])
      amtIder.g_reset = true

      amtIder.sendDiskDataEx(0)
      simulateOnload()

      expect(amtIder.g_media).toBeNull()
      expect(amtIder.g_reset).toBe(false)
    })

    it('should handle g_readQueue correctly', () => {
      amtIder.g_len = 0
      amtIder.g_lba = 5
      amtIder.iderinfo = { readbfr: 10 } as IDERInfo
      amtIder.g_media = new Blob(['data'.repeat(1000)])
      amtIder.g_readQueue = [
        { media: new Blob(['anotherData']), dev: 'devValue', lba: 7, len: 12, fr: 0 }]
      const sendDiskDataExSpy = jest.spyOn(amtIder, 'sendDiskDataEx')

      amtIder.sendDiskDataEx(0)
      simulateOnload()

      expect(sendDiskDataExSpy).toHaveBeenCalledTimes(2)
      expect(amtIder.g_media).toEqual(new Blob(['anotherData']))
      expect(amtIder.g_dev).toBe('devValue')
      expect(amtIder.g_lba).toBe(17)
      expect(amtIder.g_len).toBe(2)

      sendDiskDataExSpy.mockRestore()
    })
  })

  describe('sendDiskData', () => {
    let sendCommandEndResponseSpy: jest.SpyInstance
    let sendDiskDataExSpy: jest.SpyInstance
    beforeEach(() => {
      sendCommandEndResponseSpy = jest.spyOn(amtIder, 'sendCommandEndResponse')
      sendDiskDataExSpy = jest.spyOn(amtIder, 'sendDiskDataEx')
      amtIder.g_readQueue = []
      amtIder.sectorStats = jest.fn()
      amtIder.iderinfo = { readbfr: 15 } as IDERInfo
    })
    afterEach(() => {
      sendCommandEndResponseSpy.mockClear()
      sendDiskDataExSpy.mockClear()
    })

    it('should handle dev 0xA0 and floppy is not null', () => {
      amtIder.floppy = new File(['data'.repeat(512)], 'floppy.txt')
      amtIder.sendDiskData(0xa0, 0, 1, 0)
      expect(amtIder.g_media).toBe(amtIder.floppy)
    })

    it('should handle dev 0xA0 and floppy is null', () => {
      amtIder.floppy = null
      amtIder.sendDiskData(0xa0, 0, 1, 0)
      expect(amtIder.sendCommandEndResponse).toHaveBeenCalledWith(true, 0x05, 0xa0, 0x21, 0x00)
    })

    it('should handle dev 0xB0 and cdrom is not null', () => {
      amtIder.cdrom = new File(['data'.repeat(2048)], 'cdrom.iso')
      amtIder.sendDiskData(0xb0, 0, 1, 0)
      expect(amtIder.g_media).toBe(amtIder.cdrom)
    })

    it('should handle dev 0xB0 and cdrom is null', () => {
      amtIder.cdrom = null
      amtIder.sendDiskData(0xb0, 0, 1, 0)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x05, 0xb0, 0x21, 0x00)
    })

    it('should handle invalid length or LBA', () => {
      amtIder.floppy = new File(['data'], 'floppy.txt')
      amtIder.sendDiskData(0xa0, 10, 100, 0)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x05, 0xa0, 0x21, 0x00)
    })

    it('should handle length of 0', () => {
      amtIder.sendDiskData(0xa0, 0, 0, 0)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x00, 0xa0, 0x00, 0x00)
    })

    it('should queue read operation if g_media is not null', () => {
      amtIder.g_media = new Blob()
      amtIder.sendDiskData(0xa0, 0, 1, 0)
      expect(amtIder.g_readQueue.length).toBe(1)
    })
  })
})
