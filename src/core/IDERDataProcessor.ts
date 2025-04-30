/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type AMTIDER } from './AMTIDER'
import { TypeConverter } from './Converter'
import { IDEModeSenceArray, IDECDConfigArray, IDECD, IDEModeSenceRecoveryArray, RDCD } from './Constants'

export class IDERDataProcessor {
  ider: AMTIDER
  constructor(ider: AMTIDER) {
    this.ider = ider
  }

  interpretCommandData(header: number): number {
    switch (header) {
      case 0x41: // OPEN_SESSION (65)
        return this.processOpenSessionCommand()
      case 0x43: // CLOSE (67)
        return this.processCloseCommand()
      case 0x44: // KEEPALIVEPING (68)
        this.ider.sendCommand(0x45) // Send PONG back
        return 8
      case 0x45: // KEEPALIVEPONG (69)
        return this.processPongCommand()
      case 0x46: // RESETOCCURED (70)
        return this.processResetOccurredCommand()
      case 0x49: // STATUS_DATA - DisableEnableFeaturesReply (73)
        return this.processStatusDataCommand()
      case 0x4a: // ERROR OCCURRED (74)
        return this.processErrorOccurredCommand()
      case 0x4b: // HEARTBEAT (75)
        return this.processHeartbeatCommand()
      case 0x50: // COMMAND WRITTEN (80)
        return this.processWrittenCommand()
      case 0x53: // DATA FROM HOST (83)
        return this.processDataFromHostCommand()
      default:
        console.error('Unknown IDER command', header)
        this.ider.stop()
        return 0
    }
  }

  processOpenSessionCommand(): number {
    console.debug('acc data:', JSON.stringify(this.ider.acc))

    // Checks if data is atleast 30 bytes. If not, returns
    if (this.ider.acc.length < 30) {
      return 0
    }
    // Checks if enough data is available to complete the processing of the entire "OPEN_SESSION" command, including any variable-length data indicated by len.
    const len = this.ider.acc.charCodeAt(29)
    if (this.ider.acc.length < 30 + len) {
      return 0
    }

    this.ider.iderinfo = {
      major: this.ider.acc.charCodeAt(8),
      minor: this.ider.acc.charCodeAt(9),
      fwmajor: this.ider.acc.charCodeAt(10),
      fwminor: this.ider.acc.charCodeAt(11),
      readbfr: TypeConverter.ReadShortX(this.ider.acc, 16),
      writebfr: TypeConverter.ReadShortX(this.ider.acc, 18),
      proto: this.ider.acc.charCodeAt(21),
      iana: TypeConverter.ReadIntX(this.ider.acc, 25)
    }

    console.debug('this.ider.iderinfo :', JSON.stringify(this.ider.iderinfo))

    if (this.ider.iderinfo.proto !== 0) {
      console.debug('Unknown proto', this.ider.iderinfo.proto)
      this.ider.stop()
    }
    if (this.ider.iderinfo.readbfr > 8192) {
      console.debug('Illegal read buffer size', this.ider.iderinfo.readbfr)
      this.ider.stop()
    }
    if (this.ider.iderinfo.writebfr > 8192) {
      console.debug('Illegal write buffer size', this.ider.iderinfo.writebfr)
      this.ider.stop()
    }

    if (this.ider.iderStart === 0) {
      this.ider.sendDisableEnableFeatures(TypeConverter.IntToStrX(0x01 + 0x08)) // OnReboot
    } else if (this.ider.iderStart === 1) {
      this.ider.sendDisableEnableFeatures(TypeConverter.IntToStrX(0x01 + 0x10)) // Graceful
    } else if (this.ider.iderStart === 2) {
      this.ider.sendDisableEnableFeatures(TypeConverter.IntToStrX(0x01 + 0x18)) // Now
    }

    return 30 + len
  }

  // Process the CLOSE (0x43) command
  processCloseCommand(): number {
    console.log('CLOSE')
    this.ider.stop()
    return 8
  }

  // Process the KEEPALIVEPONG (0x45) command
  processPongCommand(): number {
    console.log('PONG')
    return 8
  }

  // Process the RESETOCCURRED (0x46) command
  processResetOccurredCommand(): number {
    if (this.ider.acc.length < 9) {
      return 0
    }

    const resetMask = this.ider.acc.charCodeAt(8)

    if (this.ider.g_media === null) {
      // No operations are pending
      this.ider.sendCommand(0x47) // Send ResetOccuredResponse
      console.debug('RESETOCCURRED1', resetMask)
    } else {
      // Operations are being done, send the reset once completed.
      this.ider.g_reset = true
      console.debug('RESETOCCURRED2', resetMask)
    }

    return 9
  }

  // Process the STATUS_DATA (0x49) command
  processStatusDataCommand(): number {
    if (this.ider.acc.length < 13) {
      return 0
    }

    const type = this.ider.acc.charCodeAt(8)
    const value = TypeConverter.ReadIntX(this.ider.acc, 9)

    console.debug('STATUS_DATA', type, value)

    switch (type) {
      case 1: // REGS_AVAIL
        if ((value & 1) !== 0) {
          if (this.ider.iderStart === 0) {
            this.ider.sendDisableEnableFeatures(TypeConverter.IntToStrX(0x01 + 0x08)) // OnReboot
          } else if (this.ider.iderStart === 1) {
            this.ider.sendDisableEnableFeatures(TypeConverter.IntToStrX(0x01 + 0x10)) // Graceful
          } else if (this.ider.iderStart === 2) {
            this.ider.sendDisableEnableFeatures(TypeConverter.IntToStrX(0x01 + 0x18)) // Now
          }
        }
        break
      case 2: // REGS_STATUS
        this.ider.enabled = !!((value & 2) !== 0)
        console.debug('IDER Status: ', this.ider.enabled)
        break
      case 3: // REGS_TOGGLE
        if (value !== 1) {
          console.log('Register toggle failure')
        }
        break
    }

    return 13
  }

  // Process the ERROR OCCURRED (0x4A) command
  processErrorOccurredCommand(): number {
    if (this.ider.acc.length < 11) {
      return 0
    }
    console.debug('IDER: ABORT', this.ider.acc.charCodeAt(8))
    return 11
  }

  // Process the HEARTBEAT (0x4B) command
  processHeartbeatCommand(): number {
    console.log('HEARTBEAT')
    return 8
  }

  // Process the COMMAND WRITTEN (0x50) command
  processWrittenCommand(): number {
    if (this.ider.acc.length < 28) {
      return 0
    }

    const device = (this.ider.acc.charCodeAt(14) & 0x10) !== 0 ? 0xb0 : 0xa0
    const deviceFlags = this.ider.acc.charCodeAt(14)
    const cdb = this.ider.acc.substring(16, 28)
    const featureRegister = this.ider.acc.charCodeAt(9)

    console.debug('SCSI_CMD', device, TypeConverter.rstr2hex(cdb), featureRegister, deviceFlags)
    const cdbFirstByte = cdb.charCodeAt(0)
    this.handleSCSI(cdbFirstByte, device, cdb, featureRegister, deviceFlags)
    return 28
  }

  // Process the DATA FROM HOST (0x53) command
  processDataFromHostCommand(): number {
    if (this.ider.acc.length < 14) {
      return 0
    }

    const len = TypeConverter.ReadShortX(this.ider.acc, 9)
    if (this.ider.acc.length < 14 + len) {
      return 0
    }

    console.debug(`SCSI_WRITE, len = ${14 + len}`)

    this.ider.sendCommand(
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

    return 14 + len
  }

  handleSCSI(cdbFirstByte: number, dev: number, cdb: string, featureRegister: number, deviceFlags: number): number {
    switch (cdbFirstByte) {
      case 0x00: // TEST_UNIT_READY (0)
        return this.handleTestUnitReady(dev)
      case 0x08: // READ_6 (8)
        this.handleRead6(dev, cdb, featureRegister)
        break
      case 0x0a: // WRITE_6 (10)
        return this.handleWrite6(dev, cdb)
      case 0x1a: // MODE_SENSE_6 (26)
        return this.handleModeSense6(dev, cdb, featureRegister)
      case 0x1b: // START_STOP (27)
        this.handleStartStop(dev)
        break
      case 0x1e: // ALLOW_MEDIUM_REMOVAL (30)
        return this.handleAllowMediumRemoval(dev)
      case 0x23: // READ_FORMAT_CAPACITIES (35)
        return this.handleReadFormatCapacities(dev, cdb, featureRegister)
      case 0x25: // READ_CAPACITY (37)
        return this.handleReadCapacity(dev, featureRegister, deviceFlags)
      case 0x28: // READ_10 (40)
        this.handleRead10(dev, cdb, featureRegister)
        break
      case 0x2a: // WRITE_10 (42) (Floppy only)
      case 0x2e: // WRITE_AND_VERIFY (46) (Floppy only)
        this.handleWrite10(dev, cdb)
        break
      case 0x43: // READ_TOC (67)
        return this.handleReadTOC(dev, cdb, featureRegister)
      case 0x46: // GET_CONFIGURATION (70)
        return this.handleGetConfiguration(dev, cdb, featureRegister)
      case 0x4a: // GET_EVENT_STATUS_NOTIFICATION (74)
        this.handleGetEventStatusNotification(dev, cdb, featureRegister)
        break
      case 0x4c: // SEND_CUE_SHEET (76)
        this.ider.sendCommand(
          0x51,
          TypeConverter.IntToStrX(0) +
            TypeConverter.IntToStrX(0) +
            TypeConverter.IntToStrX(0) +
            String.fromCharCode(0x87, 0x50, 0x03, 0x00, 0x00, 0x00, 0xb0, 0x51, 0x05, 0x20, 0x00),
          true
        )
        break
      case 0x51: // READ_DISC_INFO (81)
        return this.handleReadDiscInfo(dev)
      case 0x55: // MODE_SELECT_10 (85)
        return this.handleModeSelect10(dev)
      case 0x5a: // MODE_SENSE_10 (90)
        return this.handleModeSense10(dev, cdb, featureRegister)
      // case 0x51: // READ_DISK_INFORMATION (81)
      //   this.ider.sendDataToHost(dev, true, RDCD.DiskInfo(), featureRegister & 1)
      //   break
      case 0xac: // GET_PERFORMANCE (172)
        this.ider.sendDataToHost(dev, true, RDCD.Performance(), featureRegister & 1)
        break
      default: // UNKNOWN COMMAND
        console.debug('IDER: Unknown SCSI command', cdb.charCodeAt(0))
        this.ider.sendCommandEndResponse(false, 0x05, dev, 0x20, 0x00)
        return -1
    }
    return 0
  }

  // Handle TEST_UNIT_READY command
  handleTestUnitReady(dev: number): number {
    console.debug('SCSI: TEST_UNIT_READY', dev)

    switch (dev) {
      case 0xa0: // DEV_FLOPPY (160)
        if (this.ider.floppy == null) {
          this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00)
          return -1
        }
        if (!this.ider.floppyReady) {
          this.ider.floppyReady = true
          this.ider.sendCommandEndResponse(true, 0x06, dev, 0x28, 0x00)
          return -1
        } // Switch to ready
        break
      case 0xb0: // DEV_CDDVD (176)
        if (this.ider.cdrom == null) {
          this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00)
          return -1
        }
        if (!this.ider.cdromReady) {
          this.ider.cdromReady = true
          this.ider.sendCommandEndResponse(true, 0x06, dev, 0x28, 0x00)
          return -1
        } // Switch to ready
        break
      default:
        console.debug('SCSI Internal error 3', dev)
        return -1
    }
    this.ider.sendCommandEndResponse(true, 0x00, dev, 0x00, 0x00) // Indicate ready
    return 0
  }

  // Handle READ_6 command
  handleRead6(dev: number, cdb: string, featureRegister: number): void {
    const lba = ((cdb.charCodeAt(1) & 0x1f) << 16) + (cdb.charCodeAt(2) << 8) + cdb.charCodeAt(3)
    let len = cdb.charCodeAt(4)
    if (len === 0) {
      len = 256
    }
    console.debug('SCSI: READ_6', dev, lba, len)
    this.ider.sendDiskData(dev, lba, len, featureRegister)
  }

  // Handle WRITE_6 command
  handleWrite6(dev: number, cdb: string): number {
    const lba = ((cdb.charCodeAt(1) & 0x1f) << 16) + (cdb.charCodeAt(2) << 8) + cdb.charCodeAt(3)
    let len = cdb.charCodeAt(4)
    if (len === 0) {
      len = 256
    }
    console.debug('SCSI: WRITE_6', dev, lba, len)
    this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00) // Write is not supported, remote no medium.
    return -1
  }

  // Handle MODE_SENSE_6 command
  handleModeSense6(dev: number, cdb: string, featureRegister: number): number {
    console.debug('SCSI: MODE_SENSE_6', dev)

    if (cdb.charCodeAt(2) === 0x3f && cdb.charCodeAt(3) === 0x00) {
      let a = 0
      let b = 0
      switch (dev) {
        case 0xa0: // DEV_FLOPPY
          if (this.ider.floppy == null) {
            this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00)
            return -1
          }
          a = 0x00
          b = 0x80 // Read only = 0x80, Read write = 0x00
          break
        case 0xb0: // DEV_CDDVD
          if (this.ider.cdrom == null) {
            this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00)
            return -1
          }
          a = 0x05
          b = 0x80
          break
        default:
          console.debug('SCSI Internal error 6', dev)
          return -1
      }
      this.ider.sendDataToHost(dev, true, String.fromCharCode(0, a, b, 0), featureRegister & 1)
      return 0
    }
    this.ider.sendCommandEndResponse(true, 0x05, dev, 0x24, 0x00)
    return 0
  }

  // Handle START_STOP command
  handleStartStop(dev: number): void {
    // var immediate = cdb.charCodeAt(1) & 0x01
    // var loej = cdb.charCodeAt(4) & 0x02
    // var start = cdb.charCodeAt(4) & 0x01
    this.ider.sendCommandEndResponse(true, 0, dev)
  }

  // Handle ALLOW_MEDIUM_REMOVAL command
  handleAllowMediumRemoval(dev: number): number {
    console.debug('SCSI: ALLOW_MEDIUM_REMOVAL', dev)

    if (dev === 0xa0 && this.ider.floppy == null) {
      this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00)
      return -1
    }
    if (dev === 0xb0 && this.ider.cdrom == null) {
      this.ider.sendCommandEndResponse(true, 0x02, dev, 0x3a, 0x00)
      return -1
    }
    this.ider.sendCommandEndResponse(true, 0x00, dev, 0x00, 0x00)
    return 0
  }

  // Handle READ_FORMAT_CAPACITIES command
  handleReadFormatCapacities(dev: number, cdb: string, featureRegister: number): number {
    console.debug('SCSI: READ_FORMAT_CAPACITIES', dev)
    // const buflen = TypeConverter.ReadShort(cdb, 7)
    // const mediaStatus = 0
    // let sectors
    // const mcSize = buflen / 8 // Capacity descriptor size is 8
    switch (dev) {
      case 0xa0: // DEV_FLOPPY
        if (this.ider.floppy == null || this.ider.floppy.size === 0) {
          this.ider.sendCommandEndResponse(false, 0x05, dev, 0x24, 0x00)
          return -1
        }
        // sectors = (this.ider.floppy.size >> 9) - 1
        break
      case 0xb0: // DEV_CDDVD
        if (this.ider.cdrom == null || this.ider.cdrom.size === 0) {
          this.ider.sendCommandEndResponse(false, 0x05, dev, 0x24, 0x00)
          return -1
        }
        // sectors = (this.ider.cdrom.size >> 11) - 1 // Number 2048 byte blocks
        break
      default:
        console.debug('SCSI Internal error 4', dev)
        return -1
    }
    this.ider.sendDataToHost(
      dev,
      true,
      TypeConverter.IntToStr(8) + String.fromCharCode(0x00, 0x00, 0x0b, 0x40, 0x02, 0x00, 0x02, 0x00),
      featureRegister & 1
    )
    return 0
  }

  // Handle READ_CAPACITY command
  handleReadCapacity(dev: number, featureRegister: number, deviceFlags: number): number {
    console.debug('SCSI: READ_CAPACITY', dev)
    let len = 0

    switch (dev) {
      case 0xa0: // DEV_FLOPPY
        if (this.ider.floppy == null || this.ider.floppy.size === 0) {
          this.ider.sendCommandEndResponse(false, 0x02, dev, 0x3a, 0x00)
          return -1
        }
        if (this.ider.floppy != null) {
          len = (this.ider.floppy.size >> 9) - 1
        }
        console.debug('DEV_FLOPPY', len) // Number 512 byte blocks
        break
      case 0xb0: // DEV_CDDVD
        if (this.ider.cdrom == null || this.ider.cdrom.size === 0) {
          this.ider.sendCommandEndResponse(false, 0x02, dev, 0x3a, 0x00)
          return -1
        }
        if (this.ider.cdrom != null) {
          len = (this.ider.cdrom.size >> 11) - 1 // Number 2048 byte blocks
        }
        console.debug('DEV_CDDVD', len)
        break
      default:
        console.debug('SCSI Internal error 4', dev)
        return -1
    }
    // if (dev == 0xA0) { dev = 0x00; } else { dev = 0x10; } // Weird but seems to work.
    console.debug('SCSI: READ_CAPACITY2', dev, deviceFlags)
    this.ider.sendDataToHost(
      deviceFlags,
      true,
      TypeConverter.IntToStr(len) + String.fromCharCode(0, 0, dev === 0xb0 ? 0x08 : 0x02, 0),
      featureRegister & 1
    )
    return 0
  }

  // Handle READ_10 command
  handleRead10(dev: number, cdb: string, featureRegister: number): void {
    const lba = TypeConverter.ReadInt(cdb, 2)
    const len = TypeConverter.ReadShort(cdb, 7)
    console.debug('SCSI: READ_10', dev, lba, len)
    this.ider.sendDiskData(dev, lba, len, featureRegister)
  }

  // Handle WRITE_10 command
  handleWrite10(dev: number, cdb: string): void {
    const lba = TypeConverter.ReadInt(cdb, 2)
    const len = TypeConverter.ReadShort(cdb, 7)
    console.debug('SCSI: WRITE_10', dev, lba, len)
    this.ider.sendGetDataFromHost(dev, 512 * len) // Floppy writes only, accept sectors of 512 bytes
  }

  // Handle READ_TOC command
  handleReadTOC(dev: number, cdb: string, featureRegister: number): number {
    const buflen = TypeConverter.ReadShort(cdb, 7)
    const msf = (cdb.charCodeAt(1) & 0x02) !== 0
    let format = cdb.charCodeAt(2) & 0x07
    if (format === 0) {
      format = cdb.charCodeAt(9) >> 6
    }
    console.debug(`SCSI: READ_TOC, dev= ${dev}, buflen= ${buflen}, format=${format}`)
    switch (dev) {
      case 0xa0: // DEV_FLOPPY
        this.ider.sendCommandEndResponse(true, 0x05, dev, 0x20, 0x00) // Not implemented
        return -1
      case 0xb0: // DEV_CDDVD
        // NOP
        break
      default:
        console.debug('SCSI Internal error 9', dev)
        return -1
    }
    if (format === 1) {
      this.ider.sendDataToHost(
        dev,
        true,
        String.fromCharCode(0x00, 0x0a, 0x01, 0x01, 0x00, 0x14, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00),
        featureRegister & 1
      )
    } else if (format === 0) {
      if (msf) {
        this.ider.sendDataToHost(
          dev,
          true,
          String.fromCharCode(
            0x00,
            0x12,
            0x01,
            0x01,
            0x00,
            0x14,
            0x01,
            0x00,
            0x00,
            0x00,
            0x02,
            0x00,
            0x00,
            0x14,
            0xaa,
            0x00,
            0x00,
            0x00,
            0x34,
            0x13
          ),
          featureRegister & 1
        )
      } else {
        this.ider.sendDataToHost(
          dev,
          true,
          String.fromCharCode(
            0x00,
            0x12,
            0x01,
            0x01,
            0x00,
            0x14,
            0x01,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x14,
            0xaa,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00
          ),
          featureRegister & 1
        )
      }
    }
    return 0
  }

  // Handle GET_CONFIGURATION command (0x46)
  handleGetConfiguration(dev: number, cdb: string, featureRegister): number {
    const sendall = cdb.charCodeAt(1) !== 2
    const firstcode = TypeConverter.ReadShort(cdb, 2)
    const buflen = TypeConverter.ReadShort(cdb, 7)

    console.debug('SCSI: GET_CONFIGURATION', dev, sendall, firstcode, buflen)

    if (buflen === 0) {
      this.ider.sendDataToHost(
        dev,
        true,
        TypeConverter.IntToStr(0x003c) + TypeConverter.IntToStr(0x0008),
        featureRegister & 1
      )
      return -1
    }
    // Set the header
    let r: string = TypeConverter.IntToStr(0x0008)

    console.debug('r value in GET_Configuration : ', r)
    // Add the data
    if (firstcode === 0) {
      r += IDECDConfigArray.ProfileList()
    }
    if (firstcode === 0x1 || (sendall && firstcode < 0x1)) {
      r += IDECDConfigArray.Core()
    }
    if (firstcode === 0x2 || (sendall && firstcode < 0x2)) {
      r += IDECD.Morphing()
    }
    if (firstcode === 0x3 || (sendall && firstcode < 0x3)) {
      r += IDECDConfigArray.Removable()
    }
    if (firstcode === 0x10 || (sendall && firstcode < 0x10)) {
      r += IDECDConfigArray.Random()
    }
    if (firstcode === 0x1e || (sendall && firstcode < 0x1e)) {
      r += IDECD.Read()
    }
    if (firstcode === 0x100 || (sendall && firstcode < 0x100)) {
      r += IDECD.PowerManagement()
    }
    if (firstcode === 0x105 || (sendall && firstcode < 0x105)) {
      r += IDECD.Timeout()
    }
    // Set the length
    r = TypeConverter.IntToStr(r.length) + r
    // Cut the length to buflen if needed
    if (r.length > buflen) {
      r = r.substring(0, buflen)
    }
    this.ider.sendDataToHost(dev, true, r, featureRegister & 1)
    return -1
  }

  // Handle GET_EVENT_STATUS_NOTIFICATION command (0x4a)
  handleGetEventStatusNotification(dev: number, cdb: string, featureRegister: number): void {
    console.debug('SCSI: GET_EVENT_STATUS_NOTIFICATION', dev, cdb.charCodeAt(1), cdb.charCodeAt(4), cdb.charCodeAt(9))
    if (cdb.charCodeAt(1) !== 0x01 && cdb.charCodeAt(4) !== 0x10) {
      console.error('SCSI ERROR')
      this.ider.sendCommandEndResponse(true, 0x05, dev, 0x26, 0x01)
      return
    }
    let present = 0x00
    if (dev === 0xa0 && this.ider.floppy != null) {
      present = 0x02
    } else if (dev === 0xb0 && this.ider.cdrom != null) {
      present = 0x02
    }
    this.ider.sendDataToHost(dev, true, String.fromCharCode(0x00, present, 0x80, 0x00), featureRegister & 1) // This is the original version, 4 bytes long
  }

  // Handle READ_DISC_INFO command (0x51)
  handleReadDiscInfo(dev: number): number {
    console.debug('SCSI READ_DISC_INFO', dev)
    this.ider.sendCommandEndResponse(false, 0x05, dev, 0x20, 0x00) // Correct
    return -1
  }

  // Handle MODE_SELECT_10 command (0x55)
  handleModeSelect10(dev: number): number {
    console.debug('SCSI ERROR: MODE_SELECT_10', dev)
    this.ider.sendCommandEndResponse(true, 0x05, dev, 0x20, 0x00)
    return -1
  }

  // Handle MODE_SENSE_10 command (0x5a)
  handleModeSense10(dev: number, cdb: string, featureRegister: number): number {
    console.debug('SCSI: MODE_SENSE_10', dev, cdb.charCodeAt(2) & 0x3f)
    const buflen = TypeConverter.ReadShort(cdb, 7)
    let r: string | null = null

    if (buflen === 0) {
      this.ider.sendDataToHost(
        dev,
        true,
        TypeConverter.IntToStr(0x003c) + TypeConverter.IntToStr(0x0008),
        featureRegister & 1
      )
      return -1
    }

    // 1.44 mb floppy or LS120 (sectorCount == 0x3c300)
    let sectorCount = 0
    if (dev === 0xa0) {
      if (this.ider.floppy != null) {
        sectorCount = this.ider.floppy.size >> 9
      }
    } else {
      if (this.ider.cdrom != null) {
        sectorCount = this.ider.cdrom.size >> 11
      }
    }
    console.debug('cdb.charCodeAt(2) & 0x3f : ', cdb.charCodeAt(2) & 0x3f)
    switch (cdb.charCodeAt(2) & 0x3f) {
      case 0x01: // Case 1
        if (dev === 0xa0) {
          r = sectorCount <= 0xb40 ? IDEModeSenceRecoveryArray.FloppyError() : IDEModeSenceRecoveryArray.Ls120Error()
        } else {
          r = IDEModeSenceRecoveryArray.CDError()
        }
        break
      case 0x05: // Case 5
        if (dev === 0xa0) {
          r = sectorCount <= 0xb40 ? IDEModeSenceArray.MSFloppyDiskPage() : IDEModeSenceArray.MSLS120DiskPage()
        }
        break
      case 0x3f: // Case 63
        if (dev === 0xa0) {
          r = sectorCount <= 0xb40 ? IDEModeSenceArray.MS3FFloppy() : IDEModeSenceArray.MS3FLS120()
        } else {
          r = IDEModeSenceArray.MS3FCD()
        }
        break
      case 0x1a: // Case 26
        if (dev === 0xb0) {
          r = IDEModeSenceArray.MSCD1A()
        }
        break
      case 0x1d: // Case 29
        if (dev === 0xb0) {
          r = IDEModeSenceArray.MSCD1D()
        }
        break
      case 0x2a: // Case 42
        if (dev === 0xb0) {
          r = IDEModeSenceArray.MSCD2A()
        }
        break
    }
    console.debug('r value ', r)
    if (r == null) {
      this.ider.sendCommandEndResponse(false, 0x05, dev, 0x20, 0x00) // TODO: Send proper error!!!
    } else {
      // Set disk to read only (we don't support write).
      // ms_data[3] = ms_data[3] | 0x80;
      this.ider.sendDataToHost(dev, true, r, featureRegister & 1)
    }
    return 0
  }
}
