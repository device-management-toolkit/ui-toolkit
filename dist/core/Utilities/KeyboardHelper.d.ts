import { type ICommunicator } from '../Interfaces/ICommunicator'
import { type Desktop } from '../Desktop'
export declare enum UpDown {
  Up = 0,
  Down = 1
}
/**
 * Provides helper functions to handle keyboard
 */
export declare class KeyBoardHelper {
  KeyInputGrab: boolean
  Comms: ICommunicator
  parent: Desktop
  constructor(parent: Desktop, comms: ICommunicator)
  /**
   * Starts grabbing keyboard events on the document object
   */
  GrabKeyInput(): any
  /**
   * releases event handlers used for keyboard event handling
   */
  UnGrabKeyInput(): any
  handleKeys(e: Event): any
  /**
   * halts default keyboard event  handling. Since the sole purpose of this event is to send it to the remote desktop
   * @param e keyboard event
   */
  haltEvent(e: any): boolean
  handleKeyUp(e: KeyboardEvent): boolean
  handleKeyDown(e: KeyboardEvent): boolean
  handleKeyEvent(d: UpDown, ke: KeyboardEvent): boolean
}
