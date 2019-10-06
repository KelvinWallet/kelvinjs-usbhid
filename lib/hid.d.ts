/// <reference types="node" />
import * as NodeHID from 'node-hid';
export declare const CMD_PING: number;
export declare const CMD_MSG: number;
export declare const CMD_LOCK: number;
export declare const CMD_INIT: number;
export declare const CMD_WINK: number;
export declare const CMD_SYNC: number;
export declare const CMD_ERROR: number;
export declare const BROADCAST_CHANNEL = 4294967295;
export declare const MIN_MSG_LEN = 7;
export declare const MAX_MSG_LEN = 7609;
export declare const MIN_INIT_RESP_LEN = 17;
export declare const RESP_TIMEOUT = 3000;
export declare const FIDO_USAGE_PAGE = 61904;
export declare const U2F_USAGE = 1;
export declare class HIDDevice {
    protected device: NodeHID.HID;
    protected channel: number;
    constructor(device: NodeHID.HID);
    send(channel: number, cmd: number, data: Buffer): void;
    read(channel: number, cmd: number): Buffer;
    init(): HIDDevice;
    command(cmd: number, data?: Buffer): Buffer;
    ping(data: Buffer): Buffer;
    wink(): Buffer;
    message(data: Buffer): Buffer;
    close(): void;
}
export declare function devices(): NodeHID.Device[];
export declare function open(deviceInfo: NodeHID.Device): HIDDevice;
