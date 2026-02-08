import type { BackgroundTaskConfig } from "../../config/schema"

/**
 * Queue entry with settled-flag pattern to prevent double-resolution.
 */
interface QueueEntry {
  resolve: () => void
  rawReject: (error: Error) => void
  settled: boolean
}

export class ConcurrencyManager {
  private config?: BackgroundTaskConfig
  private counts: Map<string, number> = new Map()
  private queues: Map<string, QueueEntry[]> = new Map()

  constructor(config?: BackgroundTaskConfig) {
    this.config = config
  }

  getConcurrencyLimit(model: string): number {
    const modelLimit = this.config?.max_tasks_per_model?.[model]
    if (modelLimit !== undefined) {
      return modelLimit === 0 ? Infinity : modelLimit
    }
    // Provider concurrency not supported in current schema, skipping
    const defaultLimit = this.config?.max_concurrent_tasks
    if (defaultLimit !== undefined) {
      return defaultLimit === 0 ? Infinity : defaultLimit
    }
    return 5
  }

  async acquire(model: string): Promise<void> {
    const limit = this.getConcurrencyLimit(model)
    if (limit === Infinity) {
      return
    }

    const current = this.counts.get(model) ?? 0
    if (current < limit) {
      this.counts.set(model, current + 1)
      return
    }

    return new Promise<void>((resolve, reject) => {
      const queue = this.queues.get(model) ?? []

      const entry: QueueEntry = {
        resolve: () => {
          if (entry.settled) return
          entry.settled = true
          resolve()
        },
        rawReject: reject,
        settled: false,
      }

      queue.push(entry)
      this.queues.set(model, queue)
    })
  }

  release(model: string): void {
    const limit = this.getConcurrencyLimit(model)
    if (limit === Infinity) {
      return
    }

    const queue = this.queues.get(model)

    while (queue && queue.length > 0) {
      const next = queue.shift()!
      if (!next.settled) {
        next.resolve()
        return
      }
    }

    const current = this.counts.get(model) ?? 0
    if (current > 0) {
      this.counts.set(model, current - 1)
    }
  }

  cancelWaiters(model: string): void {
    const queue = this.queues.get(model)
    if (queue) {
      for (const entry of queue) {
        if (!entry.settled) {
          entry.settled = true
          entry.rawReject(new Error(`Concurrency queue cancelled for model: ${model}`))
        }
      }
      this.queues.delete(model)
    }
  }

  clear(): void {
    for (const [model] of this.queues) {
      this.cancelWaiters(model)
    }
    this.counts.clear()
    this.queues.clear()
  }

  getCount(model: string): number {
    return this.counts.get(model) ?? 0
  }

  getQueueLength(model: string): number {
    return this.queues.get(model)?.length ?? 0
  }
}
