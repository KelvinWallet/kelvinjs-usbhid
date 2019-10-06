"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const definition_1 = require("./definition");
const hid_1 = require("./hid");
class U2FRequest {
    constructor(cmd, param1, param2, data) {
        if (typeof cmd !== 'number') {
            throw new definition_1.U2FError(`U2FDevice: input type error, unexpected cmd type '${typeof cmd}', wanted 'number'`, definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        this.cmd = cmd;
        this.param1 = param1 || 0;
        this.param2 = param2 || 0;
        this.data = data || Buffer.alloc(0);
    }
}
exports.U2FRequest = U2FRequest;
class RegisterRequest extends U2FRequest {
    constructor(challenge, appId) {
        let challengeBuffer;
        let appIdBuffer;
        if (!(challenge instanceof Buffer || typeof challenge === 'string')) {
            throw new definition_1.U2FError(`U2FDevice: input type error, unexpected challenge type '${typeof challenge}', wanted 'string' or 'Buffer'`, definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (!(appId instanceof Buffer || typeof appId === 'string')) {
            throw new definition_1.U2FError(`U2FDevice: input type error, unexpected appId type '${typeof appId}', wanted 'string' or 'Buffer'`, definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (challenge instanceof Buffer && challenge.length !== 32) {
            throw new definition_1.U2FError('U2FDevice: challenge Buffer must be exactly 32 bytes', definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (appId instanceof Buffer && appId.length !== 32) {
            throw new definition_1.U2FError('U2FDevice: appId Buffer must be exactly 32 bytes', definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (typeof challenge === 'string') {
            challengeBuffer = definition_1.U2FAPDU.hash(challenge);
        }
        else {
            challengeBuffer = challenge;
        }
        if (typeof appId === 'string') {
            appIdBuffer = definition_1.U2FAPDU.hash(appId);
        }
        else {
            appIdBuffer = appId;
        }
        super(definition_1.U2FAPDU.CMD_REGISTER, definition_1.U2FAPDU.AUTH_ENFORCE, 0x00, Buffer.concat([challengeBuffer, appIdBuffer]));
    }
}
exports.RegisterRequest = RegisterRequest;
class RegisterResponse {
    constructor(data) {
        const khLen = data[66];
        this.keyHandle = data.slice(67, 67 + khLen);
        if (this.keyHandle.length !== khLen) {
            throw new definition_1.U2FError(`U2FDevice: key handle length is incorrect, got ${this.keyHandle.length}, expected ${khLen}`, definition_1.U2FAPDU.STATUS_WRONG_LENGTH);
        }
        this.data = data;
    }
}
exports.RegisterResponse = RegisterResponse;
class AuthenticateRequest extends U2FRequest {
    constructor(challenge, appId, keyHandle) {
        let challengeBuffer;
        let appIdBuffer;
        if (!(challenge instanceof Buffer || typeof challenge === 'string')) {
            throw new definition_1.U2FError(`U2FDevice: input type error, unexpected challenge type '${typeof challenge}', wanted 'string' or 'Buffer'`, definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (!(appId instanceof Buffer || typeof appId === 'string')) {
            throw new definition_1.U2FError(`U2FDevice: input type error, unexpected appId type '${typeof appId}', wanted 'string' or 'Buffer'`, definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (!(keyHandle instanceof Buffer)) {
            throw new definition_1.U2FError(`U2FDevice: input type error, unexpected keyHandle type '${typeof keyHandle}', wanted 'Buffer'`, definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (challenge instanceof Buffer && challenge.length !== 32) {
            throw new definition_1.U2FError('U2FDevice: challenge Buffer must be exactly 32 bytes', definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (appId instanceof Buffer && appId.length !== 32) {
            throw new definition_1.U2FError('U2FDevice: appId Buffer must be exactly 32 bytes', definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (keyHandle.length > 255) {
            throw new definition_1.U2FError('U2FDevice: keyHandle is too long', definition_1.U2FAPDU.STATUS_WRONG_DATA);
        }
        if (typeof challenge === 'string') {
            challengeBuffer = definition_1.U2FAPDU.hash(challenge);
        }
        else {
            challengeBuffer = challenge;
        }
        if (typeof appId === 'string') {
            appIdBuffer = definition_1.U2FAPDU.hash(appId);
        }
        else {
            appIdBuffer = appId;
        }
        super(definition_1.U2FAPDU.CMD_AUTHENTICATE, definition_1.U2FAPDU.AUTH_ENFORCE, 0x00, Buffer.concat([
            challengeBuffer,
            appIdBuffer,
            Buffer.from([keyHandle.length]),
            keyHandle,
        ]));
    }
}
exports.AuthenticateRequest = AuthenticateRequest;
class AuthenticateResponse {
    constructor(data) {
        if (data.length < 6) {
            throw new definition_1.U2FError(`U2FDevice: data length is incorrect, got ${data.length}, expected more than 6 bytes`, definition_1.U2FAPDU.STATUS_WRONG_LENGTH);
        }
        this.counter = data.readUInt32BE(1);
        this.signature = data.slice(5);
        this.data = data;
    }
}
exports.AuthenticateResponse = AuthenticateResponse;
class U2FDevice {
    constructor(device) {
        if (!(device instanceof hid_1.HIDDevice)) {
            throw new Error('device is not an instance of HIDDevice');
        }
        this.device = device;
    }
    message(request) {
        const buffer = Buffer.alloc(9 + request.data.length, 0);
        const dataLen = Buffer.alloc(4);
        buffer[1] = request.cmd;
        buffer[2] = request.param1;
        buffer[3] = request.param2;
        dataLen.writeInt32BE(request.data.length, 0);
        dataLen.copy(buffer, 4, 1);
        request.data.copy(buffer, 7);
        const response = this.device.message(buffer);
        if (response.length < 2) {
            throw new definition_1.U2FError(`U2FDevice: response is too short, got ${response.length} bytes`, definition_1.U2FAPDU.STATUS_WRONG_LENGTH);
        }
        return [
            response.slice(0, response.length - 2),
            response.readUInt16BE(response.length - 2),
        ];
    }
    register(request) {
        const [data, status] = this.message(request);
        if (status !== definition_1.U2FAPDU.STATUS_NO_ERROR) {
            if (status === definition_1.U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED) {
                throw new definition_1.U2FError('U2FDevice: user presence required', definition_1.U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED);
            }
            throw new definition_1.U2FError(`U2FDevice: unexpected error ${status} during registration`, definition_1.U2FAPDU.STATUS_UNKNOWN_ERROR);
        }
        return new RegisterResponse(data);
    }
    authenticate(request) {
        const [data, status] = this.message(request);
        if (status !== definition_1.U2FAPDU.STATUS_NO_ERROR) {
            if (status === definition_1.U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED) {
                throw new definition_1.U2FError('U2FDevice: user presence required', definition_1.U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED);
            }
            throw new definition_1.U2FError(`U2FDevice: unexpected error ${status} during authentication`, definition_1.U2FAPDU.STATUS_UNKNOWN_ERROR);
        }
        if (data.length < 6) {
            throw new definition_1.U2FError(`U2FDevice: authenticate response is too short, got ${data.length} bytes`, definition_1.U2FAPDU.STATUS_WRONG_LENGTH);
        }
        return new AuthenticateResponse(data);
    }
    check(request) {
        request.param1 = definition_1.U2FAPDU.AUTH_CHECK_ONLY;
        const [, status] = this.message(request);
        if (status !== definition_1.U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED) {
            if (status === definition_1.U2FAPDU.STATUS_WRONG_DATA) {
                throw new definition_1.U2FError('U2FDevice: unknown key handle', definition_1.U2FAPDU.STATUS_WRONG_DATA);
            }
            throw new definition_1.U2FError(`U2FDevice: unexpected error ${status} during auth check`, definition_1.U2FAPDU.STATUS_UNKNOWN_ERROR);
        }
    }
    version() {
        const [data, status] = this.message(new U2FRequest(definition_1.U2FAPDU.CMD_VERSION));
        if (status !== definition_1.U2FAPDU.STATUS_NO_ERROR) {
            throw new definition_1.U2FError(`U2FDevice: unexpected error ${status} during version request`, definition_1.U2FAPDU.STATUS_UNKNOWN_ERROR);
        }
        return data.toString();
    }
    close() {
        this.device.close();
    }
}
exports.U2FDevice = U2FDevice;
