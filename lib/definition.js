"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
exports.U2FAPDU = {
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
    hash: (data) => crypto.createHash('SHA256').update(data).digest(),
};
class U2FError extends Error {
    constructor(message, code = 0) {
        super(message);
        this.code = code;
    }
}
exports.U2FError = U2FError;
var U2FErrorCodes;
(function (U2FErrorCodes) {
    U2FErrorCodes[U2FErrorCodes["UNKNOWN_ERROR"] = 0] = "UNKNOWN_ERROR";
    U2FErrorCodes[U2FErrorCodes["INVALID_COMMAND"] = 1] = "INVALID_COMMAND";
    U2FErrorCodes[U2FErrorCodes["INVALID_PARAMETER"] = 2] = "INVALID_PARAMETER";
    U2FErrorCodes[U2FErrorCodes["INVALID_MESSAGE_LENGTH"] = 3] = "INVALID_MESSAGE_LENGTH";
    U2FErrorCodes[U2FErrorCodes["INVALID_MESSAGE_SEQUENCING"] = 4] = "INVALID_MESSAGE_SEQUENCING";
    U2FErrorCodes[U2FErrorCodes["MESSAGE_TIMED_OUT"] = 5] = "MESSAGE_TIMED_OUT";
    U2FErrorCodes[U2FErrorCodes["CHANNEL_BUSY"] = 6] = "CHANNEL_BUSY";
    U2FErrorCodes[U2FErrorCodes["COMMAND_REQUIRES_CHANNEL_LOCK"] = 7] = "COMMAND_REQUIRES_CHANNEL_LOCK";
    U2FErrorCodes[U2FErrorCodes["SYNC_COMMAND_FAILED"] = 8] = "SYNC_COMMAND_FAILED";
})(U2FErrorCodes = exports.U2FErrorCodes || (exports.U2FErrorCodes = {}));
