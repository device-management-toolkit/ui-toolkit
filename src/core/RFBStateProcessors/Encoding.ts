/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author : Ramu Bachala
 **********************************************************************/

import { type ICommunicator, type IStateProcessor, type IRLEDecoder } from '../Interfaces'
import { TypeConverter } from '../Converter'
import { type Desktop } from '../Desktop'
import { ImageHelper, CommsHelper, isTruthy } from '../Utilities'
/**
 * Handle encoded RFB packets. Supported encodings, RAW, ZRLE.
 */

class Encoding implements IStateProcessor {
  wsSocket: ICommunicator
  next: IStateProcessor

  parent: Desktop
  rleDecoder: IRLEDecoder
  updateRFBState: any
  constructor(comm: ICommunicator, parent: Desktop, rleDecoder: IRLEDecoder, updateRFBState: (state: number) => void) {
    this.wsSocket = comm
    this.parent = parent
    this.rleDecoder = rleDecoder
    this.updateRFBState = updateRFBState
  }

  processState(acc: string): number {
    // acc is the accumulated byte encoded string so far
    // console.log(TypeConverter.rstr2hex(acc))
    let cmdSize = 0
    if (acc.length >= 12) {
      const x = TypeConverter.ReadShort(acc, 0)
      const y = TypeConverter.ReadShort(acc, 2)
      const width = TypeConverter.ReadShort(acc, 4)
      const height = TypeConverter.ReadShort(acc, 6)
      const s = width * height
      const encoding = TypeConverter.ReadInt(acc, 8)
      // console.log(x, y, width, height, s, encoding)
      if (encoding < 17) {
        if (width < 1 || width > 64 || height < 1 || height > 64) {
          console.error(`Invalid tile size (${width},${height}), disconnecting.`)
          throw new Error('Invalid tile size')
        }

        // Set the spare bitmap to the rigth size if it's not already. This allows us to recycle the spare most if not all the time.
        if (this.parent.sparew !== width || this.parent.spareh !== height) {
          this.parent.sparew = this.parent.sparew2 = width
          this.parent.spareh = this.parent.spareh2 = height

          if (this.parent.rotation === 1 || this.parent.rotation === 3) {
            this.parent.sparew2 = height
            this.parent.spareh2 = width
          }
          const xspacecachename = `${this.parent.sparew2}x${this.parent.spareh2}`
          this.parent.spare = this.parent.sparecache[xspacecachename]
          // console.log(this.parent.spare)
          if (!isTruthy(this.parent.spare)) {
            this.parent.sparecache[xspacecachename] = this.parent.spare = this.parent.canvasCtx.createImageData(
              this.parent.sparew2,
              this.parent.spareh2
            )
          }
          // console.log(this.parent.sparecache[xspacecachename])
        }
      }

      if (encoding === 0xffffff21) {
        // Desktop Size (0xFFFFFF21, -223)
        console.log('Desktop size')
        this.parent.canvasCtx.canvas.width = this.parent.ScreenWidth = this.parent.rwidth = this.parent.width = width
        this.parent.canvasCtx.canvas.height =
          this.parent.ScreenHeight =
          this.parent.rheight =
          this.parent.height =
            height
        this.wsSocket.send(
          String.fromCharCode(3, 0, 0, 0, 0, 0) +
            TypeConverter.ShortToStr(this.parent.width) +
            TypeConverter.ShortToStr(this.parent.height)
        ) // FramebufferUpdateRequest
        cmdSize = 12
        if (this.parent.onScreenSizeChange != null) {
          this.parent.onScreenSizeChange(this.parent.ScreenWidth, this.parent.ScreenHeight)
        }
        // this.parent.Debug("New desktop width: " + this.parent.width + ", height: " + this.parent.height);
      } else if (encoding === 0) {
        // RAW encoding

        let ptr = 12
        const cs = 12 + s * this.parent.bpp
        // console.log('RAW encoding ', acc.length, cs)
        if (acc.length < cs) return 0 // Check we have all the data needed and we can only draw 64x64 tiles.
        cmdSize = cs
        // console.log('encoding cmdSize', encoding, this.cmdSize)

        // CRITICAL LOOP, optimize this as much as possible
        for (let i = 0; i < s; i++) {
          ImageHelper.setPixel(
            this.parent,
            acc.charCodeAt(ptr++) + (this.parent.bpp === 2 ? acc.charCodeAt(ptr++) << 8 : 0),
            i
          )
        }
        ImageHelper.putImage(this.parent, x, y)
      } else if (encoding === 16) {
        // ZRLE encoding
        if (acc.length < 16) return 0
        const datalen = TypeConverter.ReadInt(acc, 12)
        if (acc.length < 16 + datalen) return 0
        // console.debug("RECT ZRLE (" + x + "," + y + "," + width + "," + height + ") LEN = " + datalen);
        // console.debug("RECT ZRLE LEN: " + TypeConverter.ReadShortX(acc, 17) + ", DATA: " + TypeConverter.rstr2hex(acc.substring(16)));

        // Process the ZLib header if this is the first block
        const ptr = 16
        const delta = 5
        const dx = 0
        // console.log(TypeConverter.rstr2hex(acc))
        // 0000000000400040000000100000000A789C626400000000FFFF00400000004000400000001000000008626400000000FFFF
        if (datalen > 5 && acc.charCodeAt(ptr) === 0 && TypeConverter.ReadShortX(acc, ptr + 1) === datalen - delta) {
          // This is an uncompressed ZLib data block
          this.rleDecoder.Decode(acc, ptr + 5, x, y, width, height, s, datalen)
        } else {
          // This is compressed ZLib data, decompress and process it.
          // console.log('acclength=',acc.length,'ptr=',ptr,'datalen=',datalen,'dx=',dx)
          const zlibstring = acc.substring(ptr, ptr + datalen - dx)
          // console.log(zlibstring)
          const arr: string = this.parent.inflate.inflate(zlibstring)
          // console.log('unzipped stream', arr)
          if (arr.length > 0) {
            this.rleDecoder.Decode(arr, 0, x, y, width, height, s, arr.length)
          } else {
            console.error('Invalid deflate data.')
            throw new Error('invalid deflate data')
          }
        }

        cmdSize = 16 + datalen
      } else {
        console.error(`Unknown Encoding: ${encoding} , HEX: ${TypeConverter.rstr2hex(acc)}`)
        throw new Error(`Unknown Encoding: ${encoding}`)
      }
      // console.log('state ', this.parent.state, 'acc ', acc.length)
      if (--this.parent.state === 100) {
        console.debug('Frame completed. Update state and request new frame')
        this.updateRFBState(4)
        const sendRefreshCallback = (): any => {
          CommsHelper.sendRefresh(this.parent, this.wsSocket)
        }
        if (this.parent.frameRateDelay === 0) {
          CommsHelper.sendRefresh(this.parent, this.wsSocket) // Ask for new frame
        } else {
          setTimeout(sendRefreshCallback, this.parent.frameRateDelay) // Hold x miliseconds before asking for a new frame
        }
      }
    }
    return cmdSize
  }
}

export { Encoding }
