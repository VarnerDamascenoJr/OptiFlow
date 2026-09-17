import { performance } from "node:perf_hooks";

const DEFAULT_CONCURRENCY = 1;
const DEFAULT_MAX_ATTEMPTS = 1;
const DEFAULT_TIMEOUT_MS = 1000;

export function createOptimizationRunQueue(options) {
  const source = options || {};
  const repository = source.repository;
  const solve = source.solve;

  if (!repository) {
    throw new Error("optimization run queue requires a repository");
  }

  if (typeof solve !== "function") {
    throw new Error("optimization run queue requires a solve function");
  }

  const concurrency = readPositiveInteger(source.concurrency, DEFAULT_CONCURRENCY);
  const defaultMaxAttempts = readPositiveInteger(source.defaultMaxAttempts, DEFAULT_MAX_ATTEMPTS);
  const defaultTimeoutMs = readPositiveInteger(source.defaultTimeoutMs, DEFAULT_TIMEOUT_MS);
  const jobs = [];
  const idleResolvers = [];
  let activeCount = 0;
  let scheduled = false;

  return {
    enqueue: function enqueue(input) {
      const job = normalizeJob(input, {
        defaultMaxAttempts: defaultMaxAttempts,
        defaultTimeoutMs: defaultTimeoutMs
      });
      const persisted = repository.recordQueuedRun({
        attemptCount: 0,
        maxAttempts: job.maxAttempts,
        metadata: job.metadata,
        queuedAt: new Date(),
        scenario: job.scenario,
        solver: job.solver,
        strategy: job.strategy,
        timeoutMs: job.timeoutMs
      });

      jobs.push(job);
      schedule();
      return persisted;
    },
    getStats: function getStats() {
      return {
        activeCount: activeCount,
        concurrency: concurrency,
        queuedCount: jobs.length
      };
    },
    onIdle: function onIdle() {
      if (activeCount === 0 && jobs.length === 0) {
        return Promise.resolve();
      }

      return new Promise(function registerIdle(resolve) {
        idleResolvers.push(resolve);
      });
    }
  };

  function schedule() {
    if (scheduled) {
      return;
    }

    scheduled = true;
    setTimeout(function runScheduledJobs() {
      scheduled = false;
      pump();
    }, 0);
  }

  function pump() {
    while (activeCount < concurrency && jobs.length > 0) {
      const job = jobs.shift();
      activeCount += 1;

      Promise.resolve()
        .then(function processJob() {
          return runJob(job);
        })
        .finally(function finishJob() {
          activeCount -= 1;
          schedule();
          resolveIdleIfNeeded();
        });
    }

    resolveIdleIfNeeded();
  }

  function runJob(job) {
    job.attemptCount += 1;
    const startedAt = new Date();
    const started = performance.now();

    repository.recordRunningRun({
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      metadata: job.metadata,
      scenario: job.scenario,
      startedAt: startedAt,
      strategy: job.strategy,
      timeoutMs: job.timeoutMs
    });

    try {
      const result = solve(job.scenario, {
        metadata: job.metadata,
        solver: job.solver,
        strategy: job.strategy
      });
      const durationMs = performance.now() - started;

      if (durationMs > job.timeoutMs) {
        throw new Error("optimization run exceeded timeout of " + job.timeoutMs + "ms");
      }

      repository.recordCompletedRun({
        attemptCount: job.attemptCount,
        durationMs: durationMs,
        finishedAt: new Date(),
        maxAttempts: job.maxAttempts,
        result: result,
        scenario: job.scenario,
        startedAt: startedAt,
        timeoutMs: job.timeoutMs
      });
    } catch (error) {
      const durationMs = performance.now() - started;

      if (job.attemptCount < job.maxAttempts) {
        repository.recordQueuedRun({
          attemptCount: job.attemptCount,
          error: error,
          maxAttempts: job.maxAttempts,
          metadata: job.metadata,
          queuedAt: new Date(),
          scenario: job.scenario,
          strategy: job.strategy,
          timeoutMs: job.timeoutMs
        });
        jobs.push(job);
        return;
      }

      repository.recordFailedRun({
        attemptCount: job.attemptCount,
        durationMs: durationMs,
        error: error,
        finishedAt: new Date(),
        maxAttempts: job.maxAttempts,
        metadata: job.metadata,
        scenario: job.scenario,
        startedAt: startedAt,
        strategy: job.strategy,
        timeoutMs: job.timeoutMs
      });
    }
  }

  function resolveIdleIfNeeded() {
    if (activeCount !== 0 || jobs.length !== 0) {
      return;
    }

    while (idleResolvers.length > 0) {
      idleResolvers.shift()();
    }
  }
}

function normalizeJob(input, defaults) {
  if (!input || typeof input !== "object") {
    throw new Error("optimization run job must be an object");
  }

  return {
    attemptCount: 0,
    maxAttempts: readPositiveInteger(input.maxAttempts, defaults.defaultMaxAttempts),
    metadata: input.metadata,
    scenario: input.scenario,
    solver: input.solver || {},
    strategy: input.strategy || "nearest-neighbor-capacity",
    timeoutMs: readPositiveInteger(input.timeoutMs, defaults.defaultTimeoutMs)
  };
}

function readPositiveInteger(value, fallback) {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return fallback;
}
