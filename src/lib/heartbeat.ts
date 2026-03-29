/**
 * heartbeat.ts — background STATUS ping to the MAX78002.
 *
 * Sends a STATUS command every INTERVAL_MS.  The device is considered
 * online if it responded successfully within the last TIMEOUT_MS.
 * A module-level singleton ensures only one interval runs per process.
 */

import { queryStatus } from "./api";

const INTERVAL_MS = 30_000; // ping every 30 s
const TIMEOUT_MS  = 90_000; // offline after 90 s without a response

interface DeviceHealth {
  online: boolean;
  lastSeenMs: number | null; // epoch ms of last successful response
  lastError: string | null;
}

const _health: DeviceHealth = {
  online: false,
  lastSeenMs: null,
  lastError: null,
};

let _started = false;

async function ping() {
  try {
    await queryStatus();
    _health.online = true;
    _health.lastSeenMs = Date.now();
    _health.lastError = null;
  } catch (err) {
    _health.lastError = err instanceof Error ? err.message : String(err);
    if (
      _health.lastSeenMs === null ||
      Date.now() - _health.lastSeenMs > TIMEOUT_MS
    ) {
      _health.online = false;
    }
  }
}

export function startHeartbeat() {
  if (_started) return;
  _started = true;
  ping(); // immediate first ping
  setInterval(ping, INTERVAL_MS);
}

export function getHealth(): DeviceHealth {
  // Also mark offline if last seen was too long ago
  if (
    _health.lastSeenMs !== null &&
    Date.now() - _health.lastSeenMs > TIMEOUT_MS
  ) {
    _health.online = false;
  }
  return { ..._health };
}
