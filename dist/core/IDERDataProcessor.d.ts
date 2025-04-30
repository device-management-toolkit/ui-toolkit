/*********************************************************************
 * Copyright (c) Intel Corporation 2023
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/
import { type AMTIDER } from './AMTIDER'
export declare class IDERDataProcessor {
  ider: AMTIDER
  constructor(ider: AMTIDER)
  interpretCommandData(header: number): number
  processOpenSessionCommand(): number
  processCloseCommand(): number
  processPongCommand(): number
  processResetOccurredCommand(): number
  processStatusDataCommand(): number
  processErrorOccurredCommand(): number
  processHeartbeatCommand(): number
  processWrittenCommand(): number
  processDataFromHostCommand(): number
  handleSCSI(cdbFirstByte: number, dev: number, cdb: string, featureRegister: number, deviceFlags: number): number
  handleTestUnitReady(dev: number): number
  handleRead6(dev: number, cdb: string, featureRegister: number): void
  handleWrite6(dev: number, cdb: string): number
  handleModeSense6(dev: number, cdb: string, featureRegister: number): number
  handleStartStop(dev: number): void
  handleAllowMediumRemoval(dev: number): number
  handleReadFormatCapacities(dev: number, cdb: string, featureRegister: number): number
  handleReadCapacity(dev: number, featureRegister: number, deviceFlags: number): number
  handleRead10(dev: number, cdb: string, featureRegister: number): void
  handleWrite10(dev: number, cdb: string): void
  handleReadTOC(dev: number, cdb: string, featureRegister: number): number
  handleGetConfiguration(dev: number, cdb: string, featureRegister: any): number
  handleGetEventStatusNotification(dev: number, cdb: string, featureRegister: number): void
  handleReadDiscInfo(dev: number): number
  handleModeSelect10(dev: number): number
  handleModeSense10(dev: number, cdb: string, featureRegister: number): number
}
