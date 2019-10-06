import * as crypto from 'crypto';

export const U2FAPDU = {
  CMD_REGISTER: 0x01,
  CMD_AUTHENTICATE: 0x02,
  CMD_VERSION: 0x03,

  AUTH_ENFORCE: 0x03,
  AUTH_CHECK_ONLY: 0x07,

  STATUS_NO_ERROR: 0x9000,
  STATUS_WRONG_LENGTH: 0x6700,
  STATUS_INVALID_DATA: 0x6984,
  STATUS_CONDITIONS_NOT_SATISFIED: 0x6985,
  STATUS_WRONG_DATA: 0x6a80,
  STATUS_INS_NOT_SUPPORTED: 0x6d00,
  STATUS_UNKNOWN_ERROR: 0xffff,

  hash: (data: |string|Buffer|Uint8Array|Uint8ClampedArray|Uint16Array|
         Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|
         DataView) => crypto.createHash('SHA256').update(data).digest(),
};

export class U2FError extends Error {
  public code: number;

  constructor(message?: string|undefined, code: number = 0) {
    super(message);
    this.code = code;
  }
}

export enum U2FErrorCodes {
  UNKNOWN_ERROR,
  INVALID_COMMAND,
  INVALID_PARAMETER,
  INVALID_MESSAGE_LENGTH,
  INVALID_MESSAGE_SEQUENCING,
  MESSAGE_TIMED_OUT,
  CHANNEL_BUSY,
  COMMAND_REQUIRES_CHANNEL_LOCK,
  SYNC_COMMAND_FAILED,
}
