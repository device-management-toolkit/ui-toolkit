/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * Entry point of the KVM worker bundle (see webpack.config.worker.js).
 */
import { KvmWorkerHost, type WorkerScope } from './KvmWorkerHost'

new KvmWorkerHost(self as unknown as WorkerScope)
