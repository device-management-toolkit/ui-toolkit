/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * Source text of the built KVM worker bundle, inlined by webpack (asset/source) so the worker can be
 * started from a blob URL without consumers having to serve a separate file.
 */
declare module '@kvm-worker-source' {
  const source: string
  export default source
}
