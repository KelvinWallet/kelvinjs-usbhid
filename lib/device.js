"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NodeHID = require("node-hid");
const definition_1 = require("./definition");
const U2FHID = require("./hid");
const U2FToken = require("./token");
class KelvinWalletRequest extends U2FToken.U2FRequest {
    constructor(cmdID, payload) {
        const dataHeader = Buffer.alloc(4, 0);
        dataHeader.writeUInt16BE(cmdID, 0);
        let data = dataHeader;
        if (typeof payload !== 'undefined') {
            let buf;
            if (typeof payload === 'string') {
                buf = Buffer.from(payload, 'hex');
            }
            else if (payload instanceof Buffer) {
                buf = payload;
            }
            else {
                throw Error('data type error');
            }
            data.writeUInt16BE(buf.length, 2);
            data = Buffer.concat([data, buf]);
        }
        super(0x7f, 0x00, 0x00, data);
    }
}
const open = (deviceInfo) => {
    if (deviceInfo.path) {
        const device = new U2FHID.HIDDevice(new NodeHID.HID(deviceInfo.path));
        device.channel = 0xaaaaaaaa;
        return device;
    }
    throw new definition_1.U2FError('');
};
class KelvinWallet extends U2FToken.U2FDevice {
    constructor() {
        const devices = NodeHID.devices().filter((dev) => dev &&
            dev.vendorId === 0x0483 &&
            dev.productId === 0x5750);
        if (devices.length > 0) {
            super(open(devices[0]));
            const [status] = this.send(0x0001);
            if (status !== 0) {
                throw Error(`error status code 0x${status.toString(16)}`);
            }
        }
        else {
            throw new Error('no USB HID devices');
        }
    }
    send(cmdID, payload) {
        try {
            const req = new KelvinWalletRequest(cmdID, payload);
            const [resp, apduStatus] = this.message(req);
            if (apduStatus !== definition_1.U2FAPDU.STATUS_NO_ERROR) {
                throw Error(`error status code ${apduStatus}`);
            }
            const status = resp.readUInt16BE(0);
            const length = resp.readUInt16BE(2);
            const body = resp.slice(4);
            if (length !== body.length) {
                throw Error('unexpected data length');
            }
            return [status, body];
        }
        catch (error) {
            throw error;
        }
    }
}
exports.KelvinWallet = KelvinWallet;
