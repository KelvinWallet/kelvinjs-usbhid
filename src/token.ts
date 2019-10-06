import { U2FAPDU, U2FError } from './definition';
import { HIDDevice } from './hid';

class U2FRequest {
  public cmd: number;
  public param1: number;
  public param2: number;
  public data: Buffer;

  /**
   * Creates an instance of U2FRequest.
   */
  constructor(cmd: number, param1?: number, param2?: number, data?: Buffer) {
    if (typeof cmd !== 'number') {
      throw new U2FError(
        `U2FDevice: input type error, unexpected cmd type '${typeof cmd}', wanted 'number'`,
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }

    this.cmd = cmd;
    this.param1 = param1 || 0;
    this.param2 = param2 || 0;
    this.data = data || Buffer.alloc(0);
  }
}

class RegisterRequest extends U2FRequest {
  /**
   * Creates an instance of RegisterRequest.
   */
  constructor(challenge: string | Buffer, appId: string | Buffer) {
    let challengeBuffer: Buffer;
    let appIdBuffer: Buffer;

    if (!(challenge instanceof Buffer || typeof challenge === 'string')) {
      throw new U2FError(
        `U2FDevice: input type error, unexpected challenge type '${typeof challenge}', wanted 'string' or 'Buffer'`,
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }
    if (!(appId instanceof Buffer || typeof appId === 'string')) {
      throw new U2FError(
        `U2FDevice: input type error, unexpected appId type '${typeof appId}', wanted 'string' or 'Buffer'`,
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }

    if (challenge instanceof Buffer && challenge.length !== 32) {
      throw new U2FError(
        'U2FDevice: challenge Buffer must be exactly 32 bytes',
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }
    if (appId instanceof Buffer && appId.length !== 32) {
      throw new U2FError(
        'U2FDevice: appId Buffer must be exactly 32 bytes',
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }

    if (typeof challenge === 'string') {
      challengeBuffer = U2FAPDU.hash(challenge);
    } else {
      challengeBuffer = challenge;
    }

    if (typeof appId === 'string') {
      appIdBuffer = U2FAPDU.hash(appId);
    } else {
      appIdBuffer = appId;
    }

    super(
      U2FAPDU.CMD_REGISTER,
      U2FAPDU.AUTH_ENFORCE,
      0x00,
      Buffer.concat([challengeBuffer, appIdBuffer]),
    );
  }
}

class RegisterResponse {
  public keyHandle: Buffer;
  public data: Buffer;

  /**
   * Creates an instance of RegisterResponse.
   */
  constructor(data: Buffer) {
    const khLen = data[66];

    this.keyHandle = data.slice(67, 67 + khLen);
    if (this.keyHandle.length !== khLen) {
      throw new U2FError(
        `U2FDevice: key handle length is incorrect, got ${
          this.keyHandle.length
        }, expected ${khLen}`,
        U2FAPDU.STATUS_WRONG_LENGTH,
      );
    }

    this.data = data;
  }
}

class AuthenticateRequest extends U2FRequest {
  /**
   * Creates an instance of AuthenticateRequest.
   */
  constructor(
    challenge: string | Buffer,
    appId: string | Buffer,
    keyHandle: Buffer,
  ) {
    let challengeBuffer;
    let appIdBuffer;

    if (!(challenge instanceof Buffer || typeof challenge === 'string')) {
      throw new U2FError(
        `U2FDevice: input type error, unexpected challenge type '${typeof challenge}', wanted 'string' or 'Buffer'`,
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }
    if (!(appId instanceof Buffer || typeof appId === 'string')) {
      throw new U2FError(
        `U2FDevice: input type error, unexpected appId type '${typeof appId}', wanted 'string' or 'Buffer'`,
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }
    if (!(keyHandle instanceof Buffer)) {
      throw new U2FError(
        `U2FDevice: input type error, unexpected keyHandle type '${typeof keyHandle}', wanted 'Buffer'`,
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }

    if (challenge instanceof Buffer && challenge.length !== 32) {
      throw new U2FError(
        'U2FDevice: challenge Buffer must be exactly 32 bytes',
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }
    if (appId instanceof Buffer && appId.length !== 32) {
      throw new U2FError(
        'U2FDevice: appId Buffer must be exactly 32 bytes',
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }
    if (keyHandle.length > 255) {
      throw new U2FError(
        'U2FDevice: keyHandle is too long',
        U2FAPDU.STATUS_WRONG_DATA,
      );
    }

    if (typeof challenge === 'string') {
      challengeBuffer = U2FAPDU.hash(challenge);
    } else {
      challengeBuffer = challenge;
    }

    if (typeof appId === 'string') {
      appIdBuffer = U2FAPDU.hash(appId);
    } else {
      appIdBuffer = appId;
    }

    super(
      U2FAPDU.CMD_AUTHENTICATE,
      U2FAPDU.AUTH_ENFORCE,
      0x00,
      Buffer.concat([
        challengeBuffer,
        appIdBuffer,
        Buffer.from([keyHandle.length]),
        keyHandle,
      ]),
    );
  }
}

class AuthenticateResponse {
  public counter: number;
  public signature: Buffer;
  public data: Buffer;

  /**
   * Creates an instance of AuthenticateResponse.
   */
  constructor(data: Buffer) {
    if (data.length < 6) {
      throw new U2FError(
        `U2FDevice: data length is incorrect, got ${
          data.length
        }, expected more than 6 bytes`,
        U2FAPDU.STATUS_WRONG_LENGTH,
      );
    }

    this.counter = data.readUInt32BE(1);
    this.signature = data.slice(5);
    this.data = data;
  }
}

class U2FDevice {
  private device: HIDDevice;

  /**
   * Creates an instance of HIDDevice.
   */
  constructor(device: HIDDevice) {
    if (!(device instanceof HIDDevice)) {
      throw new Error('device is not an instance of HIDDevice');
    }
    this.device = device;
  }

  /**
   * Send U2F message to device
   * @return [data: Buffer, status: number]
   */
  public message(request: U2FRequest): [Buffer, number] {
    const buffer = Buffer.alloc(9 + request.data.length, 0);
    const dataLen = Buffer.alloc(4);

    // CL: 00
    buffer[1] = request.cmd; // IN
    buffer[2] = request.param1; // P1
    buffer[3] = request.param2; // P2

    dataLen.writeInt32BE(request.data.length, 0);
    dataLen.copy(buffer, 4, 1);

    request.data.copy(buffer, 7); // L0 L1 L2

    const response = this.device.message(buffer);
    if (response.length < 2) {
      throw new U2FError(
        `U2FDevice: response is too short, got ${response.length} bytes`,
        U2FAPDU.STATUS_WRONG_LENGTH,
      );
    }

    return [
      response.slice(0, response.length - 2),
      response.readUInt16BE(response.length - 2),
    ];
  }

  /**
   * Register
   */
  public register(request: U2FRequest): RegisterResponse {
    const [data, status] = this.message(request);

    if (status !== U2FAPDU.STATUS_NO_ERROR) {
      if (status === U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED) {
        throw new U2FError(
          'U2FDevice: user presence required',
          U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED,
        );
      }

      throw new U2FError(
        `U2FDevice: unexpected error ${status} during registration`,
        U2FAPDU.STATUS_UNKNOWN_ERROR,
      );
    }

    return new RegisterResponse(data);
  }

  /**
   * Authenticate
   */
  public authenticate(request: U2FRequest): AuthenticateResponse {
    const [data, status] = this.message(request);

    if (status !== U2FAPDU.STATUS_NO_ERROR) {
      if (status === U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED) {
        throw new U2FError(
          'U2FDevice: user presence required',
          U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED,
        );
      }

      throw new U2FError(
        `U2FDevice: unexpected error ${status} during authentication`,
        U2FAPDU.STATUS_UNKNOWN_ERROR,
      );
    }

    if (data.length < 6) {
      throw new U2FError(
        `U2FDevice: authenticate response is too short, got ${
          data.length
        } bytes`,
        U2FAPDU.STATUS_WRONG_LENGTH,
      );
    }

    return new AuthenticateResponse(data);
  }

  /**
   * Check key handle
   */
  public check(request: U2FRequest): void {
    request.param1 = U2FAPDU.AUTH_CHECK_ONLY;
    const [, status] = this.message(request);

    if (status !== U2FAPDU.STATUS_CONDITIONS_NOT_SATISFIED) {
      if (status === U2FAPDU.STATUS_WRONG_DATA) {
        throw new U2FError(
          'U2FDevice: unknown key handle',
          U2FAPDU.STATUS_WRONG_DATA,
        );
      }

      throw new U2FError(
        `U2FDevice: unexpected error ${status} during auth check`,
        U2FAPDU.STATUS_UNKNOWN_ERROR,
      );
    }
  }

  /**
   * Get U2F version
   * @return {string}
   * @memberof U2FDevice
   */
  public version() {
    const [data, status] = this.message(new U2FRequest(U2FAPDU.CMD_VERSION));

    if (status !== U2FAPDU.STATUS_NO_ERROR) {
      throw new U2FError(
        `U2FDevice: unexpected error ${status} during version request`,
        U2FAPDU.STATUS_UNKNOWN_ERROR,
      );
    }

    return data.toString();
  }

  /**
   * Close device
   * @memberof U2FDevice
   */
  public close() {
    this.device.close();
  }
}

export {
  U2FDevice,
  U2FRequest,
  RegisterRequest,
  RegisterResponse,
  AuthenticateRequest,
  AuthenticateResponse,
};
