/// <reference types="node" />
import * as U2FToken from './token';
export declare class KelvinWallet extends U2FToken.U2FDevice {
    constructor();
    send(cmdID: number, payload?: string | Buffer): [number, Buffer];
}
