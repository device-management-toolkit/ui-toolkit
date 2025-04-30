/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { AMTIDER, AMTRedirector, Protocol, RedirectorConfig, TypeConverter } from '../core'
import { RDCD } from '../core/Constants'

describe('IDERDataProcessor', () => {
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

  describe('interpretCommandData', () => {
    let sendDisableEnableFeaturesSpy: jest.SpyInstance
    let amtRedirectorStopSpy: jest.SpyInstance
    let stopSpy: jest.SpyInstance
    let sendCommandSpy: jest.SpyInstance

    beforeEach(() => {
      sendDisableEnableFeaturesSpy = jest.spyOn(amtIder, 'sendDisableEnableFeatures')
      amtRedirectorStopSpy = jest.spyOn(amtRedirector, 'stop').mockImplementation()
      sendCommandSpy = jest.spyOn(amtIder, 'sendCommand')
      stopSpy = jest.spyOn(amtIder, 'stop')
    })

    afterEach(() => {
      sendDisableEnableFeaturesSpy.mockClear()
      sendCommandSpy.mockClear()
      stopSpy.mockClear()
    })

    it('should call processCloseCommand when header is 0x43 (CLOSE)', () => {
      const result = amtIder.dataProcessor.interpretCommandData(0x43)
      expect(stopSpy).toHaveBeenCalled()
      expect(result).toBe(8)
    })

    it('should call sendCommand when header is 0x44 (KEEPALIVEPING)', () => {
      const result = amtIder.dataProcessor.interpretCommandData(0x44)
      expect(sendCommandSpy).toHaveBeenCalled()
      expect(result).toBe(8)
    })

    it('should call processPongCommand when header is 0x45 (KEEPALIVEPONG)', () => {
      const result = amtIder.dataProcessor.interpretCommandData(0x45)
      expect(result).toBe(8)
    })

    it('should call processHeartbeatCommand when header is 0x4B (HEARTBEAT)', () => {
      const result = amtIder.dataProcessor.interpretCommandData(0x4b)
      expect(result).toBe(8)
    })

    it('should return 0 and stop when header is unknown', () => {
      const result = amtIder.dataProcessor.interpretCommandData(0xff)
      expect(stopSpy).toHaveBeenCalled()
      expect(result).toBe(0)
    })

    describe('process open session command', () => {
      let iderinfo
      let accData

      beforeEach(() => {
        iderinfo = { major: 1, minor: 0, fwmajor: 16, fwminor: 1, readbfr: 8192, writebfr: 8192, proto: 0, iana: 343 }
        accData =
          'A\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0001\u0000\u0010\u0001\u0002\u0001\u0000\u0000\u0000 \u0000 \f\u0000\u0000\u0000\u0000W\u0001\u0000\u0000\u0000'
      })

      it('should return 0 if acc length is less than 30', () => {
        amtIder.acc = 'ShortAccLength'
        const result = amtIder.dataProcessor.processOpenSessionCommand()
        expect(result).toBe(0)
      })

      it('should return 0 if acc length is not enough for complete processing', () => {
        amtIder.acc = 'OpenSessionWithInsufficientData'
        const result = amtIder.dataProcessor.processOpenSessionCommand()
        expect(result).toBe(0)
      })

      it('should process OPEN_SESSION command with iderStart = 0 and set iderinfo', () => {
        amtIder.acc = accData
        const result = amtIder.dataProcessor.processOpenSessionCommand()
        expect(result).toBeGreaterThan(0)
        expect(amtIder.iderinfo).toEqual(iderinfo)
        expect(sendDisableEnableFeaturesSpy).toHaveBeenCalledTimes(1)
      })

      it('should process OPEN_SESSION command gracefully', () => {
        amtIder.acc = accData
        amtIder.iderStart = 1
        const result = amtIder.dataProcessor.processOpenSessionCommand()
        expect(result).toBeGreaterThan(0)
        expect(amtIder.iderinfo).toEqual(iderinfo)
        expect(sendDisableEnableFeaturesSpy).toHaveBeenCalledWith(TypeConverter.IntToStrX(0x01 + 0x10))
      })

      it('should process OPEN_SESSION command now', () => {
        amtIder.acc = accData
        amtIder.iderStart = 2
        const result = amtIder.dataProcessor.processOpenSessionCommand()
        expect(result).toBeGreaterThan(0)
        expect(amtIder.iderinfo).toEqual(iderinfo)
        expect(sendDisableEnableFeaturesSpy).toHaveBeenCalledWith(TypeConverter.IntToStrX(0x01 + 0x18))
      })

      it('should handle illegal read buffer size and stop', () => {
        amtIder.acc =
          'A\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0001\u0000\u0010\u0001\u0002\u0001\u0000\u0000\u0000 \u0000 \f\u0000\u0000\u0000\u0000\uFFFF\u0001\u0000\u0000\u0000' // Set read buffer size to 8193
        jest.spyOn(TypeConverter, 'ReadShortX').mockReturnValue(9000)
        const result = amtIder.dataProcessor.interpretCommandData(0x41)
        expect(stopSpy).toHaveBeenCalledTimes(2)
      })
    })

    describe('process reset occurred command', () => {
      let accData

      beforeEach(() => {
        accData = 'F\u0000\u0000\u0000\u0002\u0000\u0000\u0000\u0003'
      })

      it('should return 0 if acc length is less than 30', () => {
        amtIder.acc = 'ShortAcc'
        const result = amtIder.dataProcessor.interpretCommandData(0x46)
        expect(result).toBe(0)
      })
      it('should send ResetOccuredResponse and return 9 when g_media is null', () => {
        amtIder.acc = accData
        amtIder.g_media = null

        const result = amtIder.dataProcessor.processResetOccurredCommand()

        expect(result).toBe(9)
        expect(sendCommandSpy).toHaveBeenCalledWith(0x47)
      })

      it('should set g_reset to true and return 9 when g_media is not null', () => {
        amtIder.acc = accData
        amtIder.g_media = new Blob()

        const result = amtIder.dataProcessor.processResetOccurredCommand()

        expect(result).toBe(9)
        expect(amtIder.g_reset).toBe(true)
      })
    })

    describe('process status data command', () => {
      let sendDisableEnableFeaturesSpy: jest.SpyInstance
      beforeEach(() => {
        sendDisableEnableFeaturesSpy = jest.spyOn(amtIder, 'sendDisableEnableFeatures')
      })
      afterEach(() => {
        sendDisableEnableFeaturesSpy.mockClear()
      })
      it('should return 0 when acc length is less than 13', () => {
        amtIder.acc = 'A\u0000\u0000\u0000'
        const result = amtIder.dataProcessor.interpretCommandData(0x49)
        expect(result).toBe(0)
      })
      it('should handle REGS_TOGGLE when value is not 1', () => {
        amtIder.acc = 'I\u0000\u0000\u0000\u0001\u0000\u0000\u0000\u0003\u0001\u0000\u0000\u0000'
        const result = amtIder.dataProcessor.processStatusDataCommand()
        expect(result).toBe(13)
      })
      describe('when type is 1 (REGS_AVAIL)', () => {
        beforeEach(() => {
          amtIder.acc = '12345678' + String.fromCharCode(1) + TypeConverter.IntToStrX(1)
        })

        it('should handle iderStart value 0', () => {
          amtIder.iderStart = 0
          const result = amtIder.dataProcessor.processStatusDataCommand()
          expect(result).toBe(13)
          expect(sendDisableEnableFeaturesSpy).toHaveBeenCalledWith(TypeConverter.IntToStrX(0x01 + 0x08))
        })

        it('should handle iderStart value 1', () => {
          amtIder.iderStart = 1
          const result = amtIder.dataProcessor.processStatusDataCommand()
          expect(result).toBe(13)
          expect(sendDisableEnableFeaturesSpy).toHaveBeenCalledWith(TypeConverter.IntToStrX(0x01 + 0x10))
        })

        it('should handle iderStart value 2', () => {
          amtIder.iderStart = 2
          const result = amtIder.dataProcessor.processStatusDataCommand()
          expect(result).toBe(13)
          expect(sendDisableEnableFeaturesSpy).toHaveBeenCalledWith(TypeConverter.IntToStrX(0x01 + 0x18))
        })
      })
      describe('when type is 2 (REGS_STATUS)', () => {
        it('should set ider.enabled to true if value has bit 1 set', () => {
          amtIder.acc = '12345678' + String.fromCharCode(2) + TypeConverter.IntToStrX(2)
          const result = amtIder.dataProcessor.processStatusDataCommand()
          expect(result).toBe(13)
          expect(amtIder.enabled).toBeTruthy()
        })

        it('should set ider.enabled to false if value does not have bit 1 set', () => {
          amtIder.acc = '12345678' + String.fromCharCode(2) + TypeConverter.IntToStrX(1)
          const result = amtIder.dataProcessor.processStatusDataCommand()
          expect(result).toBe(13)
          expect(amtIder.enabled).toBeFalsy()
        })
      })
      //when type is 3
      it('should log an error for value not equal to 1', () => {
        amtIder.acc = '12345678' + String.fromCharCode(3) + TypeConverter.IntToStrX(2)
        console.log = jest.fn()
        const result = amtIder.dataProcessor.processStatusDataCommand()
        expect(result).toBe(13)
        expect(console.log).toHaveBeenCalledWith('Register toggle failure')
      })
    })

    describe('process error occurred command', () => {
      it('should return 0 when acc length is less than 11', () => {
        amtIder.acc = 'A\u0000\u0000\u0000'
        const result = amtIder.dataProcessor.processErrorOccurredCommand()
        expect(result).toBe(0)
      })

      it('should log an error message and return 11', () => {
        amtIder.acc = 'J\u0000\u0000\u0000\u000f\u0000\u0000\u0000\u0003\u0000\u0000'
        const result = amtIder.dataProcessor.processErrorOccurredCommand()
        expect(result).toBe(11)
      })
    })

    describe('process command written command', () => {
      let handleSCSISpy: jest.SpyInstance
      beforeEach(() => {
        handleSCSISpy = jest.spyOn(amtIder.dataProcessor, 'handleSCSI')
      })
      afterEach(() => {
        handleSCSISpy.mockClear()
      })
      it('should return 0 when acc length is less than 28', () => {
        amtIder.acc = 'A\u0000\u0000\u0000'
        const result = amtIder.dataProcessor.interpretCommandData(0x50)
        expect(result).toBe(0)
      })

      it('should process SCSI command and return 28', () => {
        amtIder.acc =
          'P\u0000\u0000\u0000\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000À\u0000\u0000 Z\u0000\u0005\u0000\u0000\u0000\u0000\u0000À\u0000\u0000\u0000'
        const result = amtIder.dataProcessor.processWrittenCommand()
        expect(result).toBe(28)
        expect(handleSCSISpy).toHaveBeenCalledWith(0x5a, 160, amtIder.acc.substring(16, 28), 0, 0)
      })
    })

    describe('process Data From Host Command', () => {
      it('should return 0 if ider.acc.length is less than 14', () => {
        amtIder.acc = 'shortvalue'
        const result = amtIder.dataProcessor.interpretCommandData(0x53)
        expect(result).toBe(0)
      })

      it('should return 0 when ider.acc is 14 in length but len requires more', () => {
        amtIder.acc = '12345678901234'
        jest.spyOn(TypeConverter, 'ReadShortX').mockReturnValue(10)
        const result = amtIder.dataProcessor.processDataFromHostCommand()
        expect(result).toBe(0)
      })

      it('should invoke sendCommand and return 14 + len when ider.acc.length is sufficient', () => {
        const len = 5
        amtIder.acc = '12345678901234' + '56789'
        jest.spyOn(TypeConverter, 'ReadShortX').mockReturnValue(len)
        const sendCommandSpy = jest.spyOn(amtIder, 'sendCommand')
        const result = amtIder.dataProcessor.processDataFromHostCommand()
        expect(sendCommandSpy).toHaveBeenCalledWith(
          0x51,
          String.fromCharCode(
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x87,
            0x70,
            0x03,
            0x00,
            0x00,
            0x00,
            0xa0,
            0x51,
            0x07,
            0x27,
            0x00
          ),
          true
        )
        expect(result).toBe(14 + len)
        sendCommandSpy.mockRestore()
      })
    })
  })

  describe('handleSCSI', () => {
    let sendCommandEndResponseSpy: jest.SpyInstance
    let sendDataToHostSpy: jest.SpyInstance
    let sendCommandSpy: jest.SpyInstance
    let sendGetDataFromHostSpy: jest.SpyInstance
    let sendDiskDataSpy: jest.SpyInstance
    let sendDiskDataExSpy: jest.SpyInstance

    beforeEach(() => {
      sendCommandEndResponseSpy = jest.spyOn(amtIder, 'sendCommandEndResponse')
      sendGetDataFromHostSpy = jest.spyOn(amtIder, 'sendGetDataFromHost')
      sendDataToHostSpy = jest.spyOn(amtIder, 'sendDataToHost')
      sendDiskDataSpy = jest.spyOn(amtIder, 'sendDiskData')
      sendCommandSpy = jest.spyOn(amtIder, 'sendCommand')
      sendDiskDataExSpy = jest.spyOn(amtIder, 'sendDiskDataEx')
    })
    afterEach(() => {
      sendCommandEndResponseSpy.mockClear()
      sendGetDataFromHostSpy.mockClear()
      sendDataToHostSpy.mockClear()
      sendDiskDataExSpy.mockClear()
      sendDiskDataSpy.mockClear()
      sendCommandSpy.mockClear()
    })

    it('should handle TEST_UNIT_READY for cdrom when cdrom is not null and cdromReady is true ', () => {
      amtIder.cdrom = {} as File
      amtIder.cdromReady = true
      const result = amtIder.dataProcessor.handleSCSI(0x00, 0xb0, 'testCDB', 2, 3)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x00, 0xb0, 0x00, 0x00)
    })
    // READ_6 (8)
    it('should handle read 6 command', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x08, 0xa0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 0, 0)
      expect(sendDiskDataSpy).toHaveBeenCalled()
    })
    // WRITE_6 (10)
    it('should return -1 for write 6 command', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x0a, 0xb0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 0, 0)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xb0, 0x3a, 0x00)
      expect(result).toBe(-1)
    })
    // MODE_SENSE_6 (26)
    it('should return -1 for unsupported device', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x1a, 0xc0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 1, 0)
      expect(result).toBe(-1)
    })
    // START_STOP (27)
    it('should handle start stop', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x1b, 0xb0, 'testCDB', 2, 3)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x00, 0xb0)
    })
    // ALLOW_MEDIUM_REMOVAL (30)
    it('should handle allow medium removal for an unknown device', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x1e, 0xc0, 'testCDB', 0, 0)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x00, 0xc0, 0x00, 0x00)
    })
    // READ_FORMAT_CAPACITIES (35)
    it('should handle ReadFormatCapacities an error for invalid dev value', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x23, 0xc0, 'testCDB', 0, 0)
      expect(result).toBe(-1)
    })
    // READ_CAPACITY (37)
    it('should handle ReadCapacity an error for invalid dev value', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x25, 0xc0, 'testCDB', 0, 0)
      expect(result).toBe(-1)
    })
    // READ_10 (40)
    it('should handle Read 10 command', () => {
      sendDiskDataSpy.mockImplementation()
      const result = amtIder.dataProcessor.handleSCSI(0x28, 0xb0, 'testCDB', 0, 0)
      expect(sendDiskDataSpy).toHaveBeenCalled()
    })
    // WRITE_10 (42)
    it('should handle Write 10 command', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x2a, 0xb0, 'testCDB', 0, 0)
      expect(sendGetDataFromHostSpy).toHaveBeenCalled()
    })
    // WRITE_AND_VERIFY (46)
    it('should handle Write and verify command', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x2e, 0xb0, 'testCDB', 0, 0)
      expect(sendGetDataFromHostSpy).toHaveBeenCalled()
    })
    // READ_TOC (67)
    it('should handle read TOC for an unknown device', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x43, 0xc0, 'testCDB', 0, 0)
      expect(result).toBe(-1)
    })
    // GET_CONFIGURATION (70)
    it('should handle GET_CONFIGURATION when buflen is 0', () => {
      const result = amtIder.dataProcessor.handleSCSI(
        0x46,
        0xb0,
        'F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
        0,
        16
      )
      expect(sendDataToHostSpy).toHaveBeenCalled()
      expect(result).toBe(-1)
    })
    // GET_EVENT_STATUS_NOTIFICATION (74)
    it('should handle error in Get Event Status Notification', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x4a, 0xa0, 'test', 0, 0)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x05, 0xa0, 0x26, 0x01)
    })
    // SEND_CUE_SHEET (76)
    it('should handle send cure sheet', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x4c, 0xa0, 'test', 0, 0)
      expect(sendCommandSpy).toHaveBeenCalledWith(
        0x51,
        TypeConverter.IntToStrX(0) +
          TypeConverter.IntToStrX(0) +
          TypeConverter.IntToStrX(0) +
          String.fromCharCode(0x87, 0x50, 0x03, 0x00, 0x00, 0x00, 0xb0, 0x51, 0x05, 0x20, 0x00),
        true
      )
    })
    // READ_DISK_INFORMATION (81)
    it('should handle read disk information', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x51, 0xa0, 'test', 0, 0)
      expect(result).toBe(-1)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(false, 0x05, 0xa0, 0x20, 0x00)
    })
    // MODE_SELECT_10 (85)
    it('should handle mode select 10', () => {
      const result = amtIder.dataProcessor.handleSCSI(0x55, 0xa0, 'test', 0, 0)
      expect(result).toBe(-1)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x05, 0xa0, 0x20, 0x00)
    })
    // MODE_SENSE_10 (90)
    it('should handle a case when buflen is 0', () => {
      const result = amtIder.dataProcessor.handleSCSI(
        0x5a,
        0xa0,
        'Z\u0000\u0005\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
        0,
        0
      )
      expect(sendDataToHostSpy).toHaveBeenCalledWith(
        0xa0,
        true,
        TypeConverter.IntToStr(0x003c) + TypeConverter.IntToStr(0x0008),
        0 & 1
      )
      expect(result).toBe(-1)
    })
    // GET_PERFORMANCE (172)
    it('should handle get performance', () => {
      const result = amtIder.dataProcessor.handleSCSI(0xac, 0xa0, 'test', 0, 0)
      expect(result).toBe(0)
      expect(sendDataToHostSpy).toHaveBeenCalledWith(0xa0, true, RDCD.Performance(), 0 & 1)
    })
    // UNKNOWN COMMAND
    it('should handle unknown command', () => {
      const result = amtIder.dataProcessor.handleSCSI(0xab, 0xa0, 'test', 0, 0)
      expect(result).toBe(-1)
      expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(false, 0x05, 0xa0, 0x20, 0x00)
    })

    describe('handle Test Unit Ready', () => {
      it('should handle TEST_UNIT_READY for floppy drive when floppy is null', () => {
        amtIder.floppy = null
        const result = amtIder.dataProcessor.handleTestUnitReady(0xa0)
        expect(result).toBe(-1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xa0, 0x3a, 0x00)
      })
      it('should handle TEST_UNIT_READY for floppy drive when floppy is not null', () => {
        const result = amtIder.dataProcessor.handleTestUnitReady(0xa0)
        expect(result).toBe(-1)
        expect(amtIder.floppyReady).toBeTruthy()
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x06, 0xa0, 0x28, 0x00)
      })
      it('should handle TEST_UNIT_READY for cdrom when cdrom is null', () => {
        amtIder.cdrom = null
        const result = amtIder.dataProcessor.handleTestUnitReady(0xb0)
        expect(result).toBe(-1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xb0, 0x3a, 0x00)
      })
      it('should handle TEST_UNIT_READY for cdrom when cdrom is not null', () => {
        const result = amtIder.dataProcessor.handleTestUnitReady(0xb0)
        expect(result).toBe(-1)
        expect(amtIder.cdromReady).toBeTruthy()
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x06, 0xb0, 0x28, 0x00)
      })
      it('should handle TEST_UNIT_READY for an unknown device', () => {
        const result = amtIder.dataProcessor.handleTestUnitReady(0xc0)
        expect(result).toBe(-1)
      })
    })

    describe('SCSI Command Handling - handleModeSense6', () => {
      it('should handle DEV_FLOPPY when floppy is not null', () => {
        const result = amtIder.dataProcessor.handleModeSense6(0xa0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 1)
        expect(sendDataToHostSpy).toHaveBeenCalledWith(0xa0, true, String.fromCharCode(0, 0x00, 0x80, 0), 1 & 1)
        expect(result).toBe(0)
      })

      it('should handle DEV_FLOPPY when floppy is null', () => {
        amtIder.floppy = null
        const result = amtIder.dataProcessor.handleModeSense6(0xa0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xa0, 0x3a, 0x00)
        expect(result).toBe(-1)
      })

      it('should handle DEV_CDDVD when cdrom is not null', () => {
        const result = amtIder.dataProcessor.handleModeSense6(0xb0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 1)
        expect(sendDataToHostSpy).toHaveBeenCalledWith(0xb0, true, String.fromCharCode(0, 0x05, 0x80, 0), 1)
        expect(result).toBe(0)
      })

      it('should handle DEV_CDDVD when cdrom is null', () => {
        amtIder.cdrom = null
        const result = amtIder.dataProcessor.handleModeSense6(0xb0, '\u001a\u0000?\u0000\u0000\u0000\u0000\u0000', 1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xb0, 0x3a, 0x00)
        expect(result).toBe(-1)
      })
      it('should handle invalid cdb values', () => {
        const result = amtIder.dataProcessor.handleModeSense6(0xa0, 'invalid_cdb', 1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x05, 0xa0, 0x24, 0x00)
      })
    })

    describe('handleAllowMediumRemoval', () => {
      it('should handle DEV_FLOPPY with floppy present', () => {
        const result = amtIder.dataProcessor.handleAllowMediumRemoval(0xa0)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x00, 0xa0, 0x00, 0x00)
      })

      it('should handle DEV_FLOPPY with no floppy present', () => {
        amtIder.floppy = null
        const result = amtIder.dataProcessor.handleAllowMediumRemoval(0xa0)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xa0, 0x3a, 0x00)
        expect(result).toBe(-1)
      })

      it('should handle DEV_CDDVD with CD/DVD present', () => {
        const result = amtIder.dataProcessor.handleAllowMediumRemoval(0xb0)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x00, 0xb0, 0x00, 0x00)
      })

      it('should handle DEV_CDDVD with no CD/DVD present', () => {
        amtIder.cdrom = null
        const result = amtIder.dataProcessor.handleAllowMediumRemoval(0xb0)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(true, 0x02, 0xb0, 0x3a, 0x00)
        expect(result).toBe(-1)
      })
    })

    describe('handleReadTOC', () => {
      it('should handle DEV_FLOPPY', () => {
        const result = amtIder.dataProcessor.handleReadTOC(
          0xa0,
          'C\u0002\u0000\u0000\u0000\u0000\u0000\u0003$\u0000\u0000\u0000',
          0
        )
        expect(sendCommandEndResponseSpy).toHaveBeenCalled()
        expect(result).toBe(-1)
      })

      it('should handle DEV_CDDVD with format 0', () => {
        const result = amtIder.dataProcessor.handleReadTOC(
          0xb0,
          'C\u0002\u0000\u0000\u0000\u0000\u0000\u0003$\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
        expect(result).toBe(0)
      })
    })

    describe('SCSI GET_CONFIGURATION Command Handling', () => {
      it('should handle GET_CONFIGURATION when buflen is 0', () => {
        const result = amtIder.dataProcessor.handleGetConfiguration(
          0xb0,
          'F\u0002\u0000.\u0000\u0000\u0000\u0000(\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
        expect(result).toBe(-1)
      })
      it('should handle GET_CONFIGURATION when buflen is 1', () => {
        const result = amtIder.dataProcessor.handleGetConfiguration(
          0xb0,
          'F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\b\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
        expect(result).toBe(-1)
      })
      it('should handle GET_CONFIGURATION when buflen is 2', () => {
        const result = amtIder.dataProcessor.handleGetConfiguration(
          0xb0,
          'F\u0002\u0000\u0000\u0000\u0000\u0000\u0000\f\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
        expect(result).toBe(-1)
      })
    })

    describe('handle Read Format Capacities', () => {
      it('should handle DEV_FLOPPY when dev is 0xA0', () => {
        const result = amtIder.dataProcessor.handleReadFormatCapacities(
          0xa0,
          '#\u0000\u0000\u0000\u0000\u0000\u0000\u0000ü\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle DEV_FLOPPY when dev is 0xA0 and floppy drive is null', () => {
        amtIder.floppy = null
        const result = amtIder.dataProcessor.handleReadFormatCapacities(
          0xa0,
          '#\u0000\u0000\u0000\u0000\u0000\u0000\u0000ü\u0000\u0000\u0000',
          0
        )
        expect(result).toBe(-1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(false, 0x05, 0xa0, 0x24, 0x00)
      })

      it('should handle DEV_CDDVD when dev is 0xB0', () => {
        const result = amtIder.dataProcessor.handleReadFormatCapacities(
          0xb0,
          'F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\b\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle DEV_CDDVD when dev is 0xB0 and cdrom is null', () => {
        amtIder.cdrom = null
        const result = amtIder.dataProcessor.handleReadFormatCapacities(
          0xb0,
          'F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\b\u0000\u0000\u0000',
          0
        )
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(false, 0x05, 0xb0, 0x24, 0x00)
        expect(result).toBe(-1)
      })
    })

    describe('handle Read Capacity', () => {
      it('should handle DEV_FLOPPY when dev is 0xA0', () => {
        const result = amtIder.dataProcessor.handleReadCapacity(0xa0, 0, 0)
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle DEV_FLOPPY when dev is 0xA0 and floppy drive is null', () => {
        amtIder.floppy = null
        const result = amtIder.dataProcessor.handleReadCapacity(0xa0, 0, 0)
        expect(result).toBe(-1)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(false, 0x02, 0xa0, 0x3a, 0x00)
      })

      it('should handle DEV_CDDVD when dev is 0xB0', () => {
        const result = amtIder.dataProcessor.handleReadCapacity(0xb0, 0, 0)
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle DEV_CDDVD when dev is 0xB0 and cdrom is null', () => {
        amtIder.cdrom = null
        const result = amtIder.dataProcessor.handleReadCapacity(0xb0, 0, 0)
        expect(sendCommandEndResponseSpy).toHaveBeenCalledWith(false, 0x02, 0xb0, 0x3a, 0x00)
        expect(result).toBe(-1)
      })
    })

    describe('handle Get Event Status Notification', () => {
      it('should handle DEV_FLOPPY when dev is 0xA0', () => {
        const result = amtIder.dataProcessor.handleGetEventStatusNotification(
          0xa0,
          'J\u0001\u0000\u0000\u0000\u0000\u0000\u0000\b\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle DEV_CDDVD when dev is 0xB0', () => {
        const result = amtIder.dataProcessor.handleGetEventStatusNotification(
          0xb0,
          'J\u0001\u0000\u0000\u0000\u0000\u0000\u0000\b\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
    })

    describe('SCSI Command Handling - handleModeSense10', () => {
      it('should handle sub command 1 - floppy drive', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xa0,
          'Z\u0000\u0001\u0000\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
      it('should handle sub command 1 - cdrom', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xb0,
          'Z\u0000\u0001\u0000\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle sub command 5', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xa0,
          'Z\u0000\u0005\u0000\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })

      it('should handle sub command 63 - floppy drive', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xa0,
          'Z\u0000?\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
      it('should handle sub command 63 - cdrom', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xb0,
          'Z\u0000?\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
      it('should handle sub command 26', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xb0,
          'Z\u0000\u001A\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
      it('should handle sub command 29', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xb0,
          'Z\u0000\u001D\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
      it('should handle sub command 42', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xb0,
          'Z\b*\u0000\u0000\u0000\u0000\u0000(\u0000\u0000\u0000',
          0
        )
        expect(sendDataToHostSpy).toHaveBeenCalled()
      })
      it('should handle unknown sub command', () => {
        const result = amtIder.dataProcessor.handleModeSense10(
          0xb0,
          'Z\u0000\u000A\u0000\u0000\u0000\u0000\u0000À\u0000\u0000\u0000',
          0
        )
        expect(sendCommandEndResponseSpy).toHaveBeenCalled()
      })
    })
  })
})
