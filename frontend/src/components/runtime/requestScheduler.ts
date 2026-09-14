type RequestTask<T> = (signal: AbortSignal) => Promise<T>;

interface ScheduledRequest<T> {
  key: string;
  controller: AbortController;
  task: RequestTask<T>;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  started: boolean;
}

function createAbortError(): Error {
  const error = new Error('运行时请求已取消');
  error.name = 'AbortError';
  return error;
}

/** 限流并合并相同请求的运行时取数队列。 */
export class RuntimeRequestScheduler {
  private readonly queue: ScheduledRequest<unknown>[] = [];
  private readonly requests = new Map<string, ScheduledRequest<unknown>>();
  private activeCount = 0;

  constructor(private readonly maxConcurrency: number) {}

  request<T>(key: string, task: RequestTask<T>): Promise<T> {
    const existing = this.requests.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((nextResolve, nextReject) => {
      resolve = nextResolve;
      reject = nextReject;
    });
    const request: ScheduledRequest<T> = {
      key,
      controller: new AbortController(),
      task,
      promise,
      resolve,
      reject,
      started: false,
    };
    this.requests.set(key, request as ScheduledRequest<unknown>);
    this.queue.push(request as ScheduledRequest<unknown>);
    this.pump();
    return promise;
  }

  cancel(key: string): void {
    const request = this.requests.get(key);
    if (!request) {
      return;
    }
    request.controller.abort();
    this.requests.delete(key);
    if (!request.started) {
      const index = this.queue.indexOf(request);
      if (index >= 0) {
        this.queue.splice(index, 1);
      }
      request.reject(createAbortError());
    }
  }

  cancelAll(): void {
    [...this.requests.keys()].forEach((key) => this.cancel(key));
  }

  private pump(): void {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request || request.controller.signal.aborted) {
        continue;
      }
      request.started = true;
      this.activeCount += 1;
      void request
        .task(request.controller.signal)
        .then(request.resolve, request.reject)
        .finally(() => {
          this.activeCount -= 1;
          if (this.requests.get(request.key) === request) {
            this.requests.delete(request.key);
          }
          this.pump();
        });
    }
  }
}
