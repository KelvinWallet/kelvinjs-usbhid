/// <reference types="node" />
export declare const U2FAPDU: {
    CMD_REGISTER: number;
    CMD_AUTHENTICATE: number;
    CMD_VERSION: number;
    AUTH_ENFORCE: number;
    AUTH_CHECK_ONLY: number;
    STATUS_NO_ERROR: number;
    STATUS_WRONG_LENGTH: number;
    STATUS_INVALID_DATA: number;
    STATUS_CONDITIONS_NOT_SATISFIED: number;
    STATUS_WRONG_DATA: number;
    STATUS_INS_NOT_SUPPORTED: number;
    STATUS_UNKNOWN_ERROR: number;
    hash: (data: string | DataView | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | Buffer) => Buffer;
};
export declare class U2FError extends Error {
    code: number;
    constructor(message?: string | undefined, code?: number);
}
export declare enum U2FErrorCodes {
    UNKNOWN_ERROR = 0,
    INVALID_COMMAND = 1,
    INVALID_PARAMETER = 2,
    INVALID_MESSAGE_LENGTH = 3,
    INVALID_MESSAGE_SEQUENCING = 4,
    MESSAGE_TIMED_OUT = 5,
    CHANNEL_BUSY = 6,
    COMMAND_REQUIRES_CHANNEL_LOCK = 7,
    SYNC_COMMAND_FAILED = 8
}
