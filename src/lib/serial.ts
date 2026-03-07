/**
 * serial.ts — singleton SerialPort connection to the MAX78002.
 *
 * The port is opened once on first use and kept open for the lifetime
 * of the Next.js server process.  Set the COM port via BIRDSPEC_PORT
 * (e.g. COM3 on Windows, /dev/tty.usbmodem… on macOS/Linux).
 */

import { SerialPort } from "serialport";
import { ReadlineParser } from "serialport";

const PORT_PATH = process.env.BIRDSPEC_PORT ?? "COM3";
const BAUD_RATE = 921_600;

let _port: SerialPort | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _parser: any = null;

// Callbacks waiting for the next complete line from the device
const _lineListeners: Array<(line: string) => void> = [];

function getPort(): SerialPort {
  if (_port && _port.isOpen) return _port;

  _port = new SerialPort({ path: PORT_PATH, baudRate: BAUD_RATE });
  const parser = new ReadlineParser({ delimiter: "\n" });
  _port.pipe(parser as never);
  _parser = parser;

  _parser.on("data", (line: string) => {
    const cb = _lineListeners.shift();
    if (cb) cb(line.trim());
  });

  _port.on("error", (err: Error) => {
    console.error("[serial] port error:", err.message);
  });

  return _port;
}

/** Wait for the next newline-terminated response from the device. */
function readLine(timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = _lineListeners.indexOf(cb);
      if (idx !== -1) _lineListeners.splice(idx, 1);
      reject(new Error("Serial read timeout"));
    }, timeoutMs);

    const cb = (line: string) => {
      clearTimeout(timer);
      resolve(line);
    };
    _lineListeners.push(cb);
  });
}

/** Write a text command followed by a newline. */
export function sendCommand(cmd: string): void {
  getPort().write(cmd + "\n");
}

/** Send STATUS and return the parsed JSON response. */
export async function queryStatus(): Promise<Record<string, unknown>> {
  sendCommand("STATUS");
  const line = await readLine(5_000);
  return JSON.parse(line) as Record<string, unknown>;
}

/**
 * Stream raw int16-LE PCM to the device via LOAD_PCM, then collect the
 * inference result JSON.
 *
 * @param pcmBuffer  96 000 bytes — 48 000 int16 samples, 16 kHz mono, 3 s
 */
export async function loadPcmAndInfer(
  pcmBuffer: Buffer
): Promise<Record<string, unknown>> {
  const port = getPort();

  // Send header, wait for receiving_pcm ack
  sendCommand(`LOAD_PCM ${pcmBuffer.byteLength}`);
  const ack = await readLine(5_000);
  const ackJson = JSON.parse(ack) as { status: string };
  if (ackJson.status !== "ok") throw new Error("LOAD_PCM rejected: " + ack);

  // Stream bytes
  port.write(pcmBuffer);

  // Three status lines follow; the last is the result
  await readLine(10_000); // computing_spectrogram
  await readLine(10_000); // inferring
  const result = await readLine(15_000);
  return JSON.parse(result) as Record<string, unknown>;
}
