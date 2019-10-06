/// <reference types="node" />
import { HIDDevice } from './hid';
declare class U2FRequest {
    cmd: number;
    param1: number;
    param2: number;
    data: Buffer;
    constructor(cmd: number, param1?: number, param2?: number, data?: Buffer);
}
declare class RegisterRequest extends U2FRequest {
    constructor(challenge: string | Buffer, appId: string | Buffer);
}
declare class RegisterResponse {
    keyHandle: Buffer;
    data: Buffer;
    constructor(data: Buffer);
}
declare class AuthenticateRequest extends U2FRequest {
    constructor(challenge: string | Buffer, appId: string | Buffer, keyHandle: Buffer);
}
declare class AuthenticateResponse {
    counter: number;
    signature: Buffer;
    data: Buffer;
    constructor(data: Buffer);
}
declare class U2FDevice {
    private device;
    constructor(device: HIDDevice);
    message(request: U2FRequest): [Buffer, number];
    register(request: U2FRequest): RegisterResponse;
    authenticate(request: U2FRequest): AuthenticateResponse;
    check(request: U2FRequest): void;
    version(): string;
    close(): void;
}
export { U2FDevice, U2FRequest, RegisterRequest, RegisterResponse, AuthenticateRequest, AuthenticateResponse, };
