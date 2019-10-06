import * as NodeHID from 'node-hid';

import { U2FError } from './definition';

export const CMD_PING = 0x80 | 0x01;
export const CMD_MSG = 0x80 | 0x03;
export const CMD_LOCK = 0x80 | 0x04;
export const CMD_INIT = 0x80 | 0x06;
export const CMD_WINK = 0x80 | 0x08;
export const CMD_SYNC = 0x80 | 0x3c;
export const CMD_ERROR = 0x80 | 0x3f;
export const BROADCAST_CHANNEL = 0xffffffff;
export const MIN_MSG_LEN = 7;
export const MAX_MSG_LEN = 7609;
export const MIN_INIT_RESP_LEN = 17;

export const RESP_TIMEOUT = 3000;

export const FIDO_USAGE_PAGE = 0xf1d0;
export const U2F_USAGE = 1;

const errorMessages: { [index: number]: string } = {
  1: 'invalid command',
  2: 'invalid parameter',
  3: 'invalid message length',
  4: 'invalid message sequencing',
  5: 'message timed out',
  6: 'channel busy',
  7: 'command requires channel lock',
  8: 'sync command failed',
};

const buffer2array = (buffer: Buffer): number[] => {
  return Array.prototype.slice.call(buffer, 0);
};

export class HIDDevice {
  protected device: NodeHID.HID;
  protected channel: number;

  /**
   * Creates an instance of HIDDevice.
   */
  constructor(device: NodeHID.HID) {
    this.device = device;
    this.channel = BROADCAST_CHANNEL;
  }

  /**
   * Send data to device
   */
  public send(channel: number, cmd: number, data: Buffer): void {
    if (data.length > MAX_MSG_LEN) {
      throw new U2FError('U2FHID: message is too long', 3);
    }

    const buffer = Buffer.alloc(65, 0);

    buffer.writeUInt32BE(channel, 1);
    buffer[5] = cmd;
    buffer.writeUInt16BE(data.length, 6);
    let len = data.copy(buffer, 8);
    let remainData = data.slice(len);

    // console.log(`W:${buffer.toString('hex')}`);
    this.device.write([...buffer2array(buffer)]);

    let seq = 0;
    while (remainData.length > 0) {
      buffer.fill(0);
      buffer.writeUInt32BE(channel, 1);
      buffer[5] = seq;
      seq += 1;
      len = remainData.copy(buffer, 6);
      remainData = remainData.slice(len);

      // console.log(`W:${buffer.toString('hex')}`);
      this.device.write([...buffer2array(buffer)]);
    }
  }

  /**
   * Read data from device
   */
  public read(channel: number, cmd: number): Buffer {
    /**
     * @type {Buffer}
     */
    let buffer = Buffer.alloc(0);

    let haveFirst = false;
    let expectedLen = 0;

    while (true) {
      let data = Buffer.from(this.device.readSync());
      // console.log(`R:${data.toString('hex')}`);
      if (data.length < MIN_MSG_LEN) {
        throw new U2FError(
          `U2FHID: message is too short, only received ${data.length} bytes`,
          3,
        );
      }

      if (channel === data.readUInt32BE(0)) {
        if (data[4] === CMD_ERROR) {
          const code = data[7];
          const errMsg = errorMessages[code];
          if (errMsg) {
            throw new U2FError(errMsg, code);
          } else {
            throw new U2FError(
              `U2FHID: received unknown error response ${data[7]}`,
              9,
            );
          }
        }

        if (!haveFirst) {
          if (data[4] !== cmd) {
            throw new U2FError(
              `U2FHID: error reading response, unexpected command ${
                data[4]
              }, wanted ${cmd}`,
              1,
            );
          }

          haveFirst = true;
          expectedLen = data.readUInt16BE(5);
          data = data.slice(7);
          if (data.length > expectedLen) {
            data = data.slice(0, expectedLen);
          }

          buffer = Buffer.concat([buffer, data]);
        } else {
          if ((data[4] & 0x80) !== 0) {
            throw new U2FError(
              `U2FHID: error reading response, unexpected command ${
                data[4]
              }, wanted continuation`,
              1,
            );
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

  /**
   * Init device
   */
  public init(): HIDDevice {
    const nonce = Buffer.from(
      Math.random()
        .toString(16)
        .substring(2, 10) +
        Math.random()
          .toString(16)
          .substring(2, 10),
      'hex',
    );

    this.send(BROADCAST_CHANNEL, CMD_INIT, nonce);

    while (true) {
      const response = this.read(BROADCAST_CHANNEL, CMD_INIT);
      if (response.length < MIN_INIT_RESP_LEN) {
        throw new U2FError(
          `U2FHID: init response is short, wanted ${MIN_INIT_RESP_LEN}, got ${
            response.length
          } bytes`,
          3,
        );
      }

      if (nonce.compare(response.slice(0, 8)) === 0) {
        this.channel = response.readUInt32BE(8);
        break;
      }
    }

    return this;
  }

  /**
   * Send U2F hid command to device
   */
  public command(cmd: number, data = Buffer.alloc(0)): Buffer {
    this.send(this.channel, cmd, data);

    return this.read(this.channel, cmd);
  }

  /**
   * Send PING command to device
   */
  public ping(data: Buffer): Buffer {
    return this.command(CMD_PING, data);
  }

  /**
   * Send WINK command to device
   */
  public wink(): Buffer {
    return this.command(CMD_WINK);
  }

  /**
   * Send MESSAGE command to device
   */
  public message(data: Buffer): Buffer {
    return this.command(CMD_MSG, data);
  }

  /**
   * Close device
   */
  public close(): void {
    this.device.close();
  }
}

/**
 * Enumrate devices
 */
export function devices(): NodeHID.Device[] {
  return NodeHID.devices().filter(
    (dev) =>
      dev &&
      dev.usage === U2F_USAGE &&
      dev.usagePage &&
      (dev.usagePage & FIDO_USAGE_PAGE) === FIDO_USAGE_PAGE,
  );
}

/**
 * Open and init device
 */
export function open(deviceInfo: NodeHID.Device): HIDDevice {
  if (deviceInfo.path) {
    const device = new HIDDevice(new NodeHID.HID(deviceInfo.path));
    return device.init();
  }

  throw new U2FError('');
}
