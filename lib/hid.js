"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NodeHID = require("node-hid");
const definition_1 = require("./definition");
exports.CMD_PING = 0x80 | 0x01;
exports.CMD_MSG = 0x80 | 0x03;
exports.CMD_LOCK = 0x80 | 0x04;
exports.CMD_INIT = 0x80 | 0x06;
exports.CMD_WINK = 0x80 | 0x08;
exports.CMD_SYNC = 0x80 | 0x3c;
exports.CMD_ERROR = 0x80 | 0x3f;
exports.BROADCAST_CHANNEL = 0xffffffff;
exports.MIN_MSG_LEN = 7;
exports.MAX_MSG_LEN = 7609;
exports.MIN_INIT_RESP_LEN = 17;
exports.RESP_TIMEOUT = 3000;
exports.FIDO_USAGE_PAGE = 0xf1d0;
exports.U2F_USAGE = 1;
const errorMessages = {
    1: 'invalid command',
    2: 'invalid parameter',
    3: 'invalid message length',
    4: 'invalid message sequencing',
    5: 'message timed out',
    6: 'channel busy',
    7: 'command requires channel lock',
    8: 'sync command failed',
};
const buffer2array = (buffer) => {
    return Array.prototype.slice.call(buffer, 0);
};
class HIDDevice {
    constructor(device) {
        this.device = device;
        this.channel = exports.BROADCAST_CHANNEL;
    }
    send(channel, cmd, data) {
        if (data.length > exports.MAX_MSG_LEN) {
            throw new definition_1.U2FError('U2FHID: message is too long', 3);
        }
        const buffer = Buffer.alloc(65, 0);
        buffer.writeUInt32BE(channel, 1);
        buffer[5] = cmd;
        buffer.writeUInt16BE(data.length, 6);
        let len = data.copy(buffer, 8);
        let remainData = data.slice(len);
        this.device.write([...buffer2array(buffer)]);
        let seq = 0;
        while (remainData.length > 0) {
            buffer.fill(0);
            buffer.writeUInt32BE(channel, 1);
            buffer[5] = seq;
            seq += 1;
            len = remainData.copy(buffer, 6);
            remainData = remainData.slice(len);
            this.device.write([...buffer2array(buffer)]);
        }
    }
    read(channel, cmd) {
        let buffer = Buffer.alloc(0);
        let haveFirst = false;
        let expectedLen = 0;
        while (true) {
            let data = Buffer.from(this.device.readSync());
            if (data.length < exports.MIN_MSG_LEN) {
                throw new definition_1.U2FError(`U2FHID: message is too short, only received ${data.length} bytes`, 3);
            }
            if (channel === data.readUInt32BE(0)) {
                if (data[4] === exports.CMD_ERROR) {
                    const code = data[7];
                    const errMsg = errorMessages[code];
                    if (errMsg) {
                        throw new definition_1.U2FError(errMsg, code);
                    }
                    else {
                        throw new definition_1.U2FError(`U2FHID: received unknown error response ${data[7]}`, 9);
                    }
                }
                if (!haveFirst) {
                    if (data[4] !== cmd) {
                        throw new definition_1.U2FError(`U2FHID: error reading response, unexpected command ${data[4]}, wanted ${cmd}`, 1);
                    }
                    haveFirst = true;
                    expectedLen = data.readUInt16BE(5);
                    data = data.slice(7);
                    if (data.length > expectedLen) {
                        data = data.slice(0, expectedLen);
                    }
                    buffer = Buffer.concat([buffer, data]);
                }
                else {
                    if ((data[4] & 0x80) !== 0) {
                        throw new definition_1.U2FError(`U2FHID: error reading response, unexpected command ${data[4]}, wanted continuation`, 1);
                    }
                    data = data.slice(5);
                    if (data.length > expectedLen - buffer.length) {
                        data = data.slice(0, expectedLen - buffer.length);
                    }
                    buffer = Buffer.concat([buffer, data]);
                }
                if (buffer.length >= expectedLen) {
                    return buffer;
                }
            }
        }
    }
    init() {
        const nonce = Buffer.from(Math.random()
            .toString(16)
            .substring(2, 10) +
            Math.random()
                .toString(16)
                .substring(2, 10), 'hex');
        this.send(exports.BROADCAST_CHANNEL, exports.CMD_INIT, nonce);
        while (true) {
            const response = this.read(exports.BROADCAST_CHANNEL, exports.CMD_INIT);
            if (response.length < exports.MIN_INIT_RESP_LEN) {
                throw new definition_1.U2FError(`U2FHID: init response is short, wanted ${exports.MIN_INIT_RESP_LEN}, got ${response.length} bytes`, 3);
            }
            if (nonce.compare(response.slice(0, 8)) === 0) {
                this.channel = response.readUInt32BE(8);
                break;
            }
        }
        return this;
    }
    command(cmd, data = Buffer.alloc(0)) {
        this.send(this.channel, cmd, data);
        return this.read(this.channel, cmd);
    }
    ping(data) {
        return this.command(exports.CMD_PING, data);
    }
    wink() {
        return this.command(exports.CMD_WINK);
    }
    message(data) {
        return this.command(exports.CMD_MSG, data);
    }
    close() {
        this.device.close();
    }
}
exports.HIDDevice = HIDDevice;
function devices() {
    return NodeHID.devices().filter((dev) => dev &&
        dev.vendorId === 0x0483 &&
        dev.productId === 0x5750);
}
exports.devices = devices;
function open(deviceInfo) {
    if (deviceInfo.path) {
        const device = new HIDDevice(new NodeHID.HID(deviceInfo.path));
        return device.init();
    }
    throw new definition_1.U2FError('');
}
exports.open = open;
