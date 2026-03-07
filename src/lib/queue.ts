/**
 * queue.ts — single-concurrency inference queue.
 *
 * The MAX78002 handles one LOAD_PCM inference at a time (~3-5 s).
 * This module serialises all requests so they run one-by-one.
 * If more than MAX_PENDING jobs are already waiting, new requests are
 * rejected immediately with a 429.
 */

const MAX_PENDING = 5;

type Job<T> = () => Promise<T>;

let _active = false;
let _pending = 0;
const _queue: Array<() => void> = [];

export function getQueueDepth(): number {
  return _pending + (_active ? 1 : 0);
}

export function isDeviceBusy(): boolean {
  return _active;
}

/**
 * Enqueue a job.  Resolves when the job completes, rejects if the
 * queue is full or the job throws.
 */
export function enqueue<T>(job: Job<T>): Promise<T> {
  if (_pending >= MAX_PENDING) {
    return Promise.reject(
      Object.assign(new Error("Queue full — try again in a moment"), {
        status: 429,
      })
    );
  }

  _pending++;

  return new Promise<T>((resolve, reject) => {
    _queue.push(async () => {
      _pending--;
      _active = true;
      try {
        resolve(await job());
      } catch (err) {
        reject(err);
      } finally {
        _active = false;
        if (_queue.length > 0) {
          const next = _queue.shift()!;
          next();
        }
      }
    });

    // Kick off immediately if nothing is running
    if (!_active && _queue.length === 1) {
      const next = _queue.shift()!;
      next();
    }
  });
}
