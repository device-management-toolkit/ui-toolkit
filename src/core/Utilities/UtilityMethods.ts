/*********************************************************************
 * Copyright (c) Intel Corporation 2021
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

export const isTruthy = (value: any): boolean =>
  value !== null && value !== undefined && value !== '' && value !== false && value !== 0
