import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

/**
 * A self-contained `waitUntil` shim for runtimes that don't expose a native
 * execution-context `waitUntil` (Node, AWS Lambda, ...).
 *
 * It collects promises so the caller can await them before returning the response,
 * preventing the platform from killing yet-unfinished async work.
 */
export class WaitUntilList {
  private settled = false

  private promises: Promise<unknown>[] = []

  /**
   * Add a promise to the list.
   * @throws if the list has already been settled.
   */
  waitUntil = (promise: Promise<unknown>): void => {
    if (this.settled)
      throw new Error('WaitUntilList is already settled')

    this.promises.push(promise)
  }

  /**
   * Returns a promise that resolves once all added promises are settled.
   * Handles promises added while settling (mutable list).
   */
  waitUntilSettled = async (): Promise<PromiseSettledResult<unknown>[]> => {
    let results: PromiseSettledResult<unknown>[]
    do {
      results = await Promise.allSettled(this.promises)
    } while (results.length !== this.promises.length)

    this.settled = true
    return results
  }
}

export interface waitUntilMiddlewareOptions {
  /**
   * Respond immediately without blocking until all async tasks are settled
   * (basically, disables the middleware's blocking behavior).
   */
  continueWithoutSettled?: boolean
}

type WaitUntilFn = (promise: Promise<unknown>) => void

/**
 * Resolve the runtime's native `waitUntil` when available (Cloudflare Workers, Deno,
 * Bun, Netlify, Vercel Edge, ...) via `c.executionCtx.waitUntil`.
 *
 * Returns `undefined` when the runtime exposes no execution context (Node, AWS Lambda),
 * so callers can fall back to a blocking shim.
 */
function resolveNativeWaitUntil(c: Context): WaitUntilFn | undefined {
  try {
    const executionCtx = c.executionCtx
    const waitUntil = executionCtx?.waitUntil
    return typeof waitUntil === 'function' ? waitUntil.bind(executionCtx) : undefined
  }
  catch {
    return undefined
  }
}

export function waitUntilMiddleware(options?: waitUntilMiddlewareOptions) {
  return createMiddleware(async (c, next) => {
    if (options?.continueWithoutSettled)
      return await next()

    // If the platform already supports native `waitUntil`, fall through to it and
    // skip our blocking shim entirely — the runtime keeps execution alive for us.
    if (resolveNativeWaitUntil(c))
      return await next()

    const waitUntilList = new WaitUntilList()
    c.set('waitUntilList', waitUntilList)

    await next()

    const errorsFound = (await waitUntilList.waitUntilSettled()).filter(e => e.status === 'rejected').map(e => e.reason)
    if (errorsFound.length > 0) {
      console.error(errorsFound)
      throw new HTTPException(500, { message: 'Some async tasks were rejected', cause: errorsFound })
    }
  })
}

export function waitUntil(promise: Promise<any>, c: Context) {
  // Prefer the platform's native `waitUntil` when available, regardless of whether the
  // middleware is applied, so usage is portable across edge and serverless runtimes.
  const nativeWaitUntil = resolveNativeWaitUntil(c)
  if (nativeWaitUntil) {
    nativeWaitUntil(promise)
    return
  }

  const waitUntilList = c.get('waitUntilList') as WaitUntilList | undefined
  if (!waitUntilList)
    throw new Error('waitUntilList not found in context: ensure `waitUntilMiddleware` is applied, or run on a platform with native `waitUntil`')

  waitUntilList.waitUntil(promise)
}
