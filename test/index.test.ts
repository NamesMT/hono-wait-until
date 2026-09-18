import type { WaitUntilList } from '#src/index.js'
import { waitUntil, waitUntilMiddleware } from '#src/index.js'
import { sleep } from '@namesmt/utils'
import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

const flags: Record<string, any> = {}
// Note: the tests are running optimistically, in hope that the shim and `hono`'s middleware system and latency work correctly,
describe('basic runs should work', () => {
  const app = new Hono<{ Variables: { waitUntilList: WaitUntilList } }>()
    .use(waitUntilMiddleware())
    .get('/context', async (c) => {
      flags.context = false

      const waitUntilList = c.get('waitUntilList')
      waitUntilList.waitUntil(sleep(150).then(() => flags.context = true))

      return c.text(`Hello - ${flags.context}`)
    })
    .get('/helper', async (c) => {
      flags.helper = false

      waitUntil(sleep(150).then(() => flags.helper = true), c)

      return c.text(`Hello - ${flags.helper}`)
    })
    .get('/error', async (c) => {
      const throwErr = async () => {
        throw new Error('Sample error')
      }
      waitUntil(throwErr(), c)

      return c.text('OK')
    })

  it('using waitUntil via context variable', async () => {
    const start = performance.now()
    const context = await app.request('/context')
    const time = performance.now() - start

    // The request should take at least 150ms due to the waitList blocking
    expect(time).toBeGreaterThanOrEqual(150)
    //   The flag should be false here
    expect(await context.text()).toBe('Hello - false')
    // The flag should be true
    expect(flags.context).toBe(true)
  })

  it('using waitUntil via helper function', async () => {
    const start = performance.now()
    const context = await app.request('/helper')
    const time = performance.now() - start

    // The request should take at least 150ms due to the waitList blocking
    expect(time).toBeGreaterThanOrEqual(150)
    //   The flag should be false here
    expect(await context.text()).toBe('Hello - false')
    // The flag should be true
    expect(flags.helper).toBe(true)
  })

  it('error thrown in .waitUntilSettled()', async () => {
    const context = await app.request('/error')

    expect(await context.text()).toBe('Some async tasks were rejected')
  })
})

describe('native waitUntil fallthrough', () => {
  it('delegates to the native executionCtx.waitUntil when available', async () => {
    const nativeWaitUntil = vi.fn()
    const executionCtx = {
      waitUntil: nativeWaitUntil,
      passThroughOnException: () => {},
      props: {},
    }

    const app = new Hono()
      .use(waitUntilMiddleware())
      .get('/native', async (c) => {
        waitUntil(Promise.resolve('done'), c)
        return c.text('OK')
      })

    const res = await app.request('/native', {}, {}, executionCtx as any)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK')
    expect(nativeWaitUntil).toHaveBeenCalledTimes(1)
  })

  it('does not block when native waitUntil is available', async () => {
    const nativeWaitUntil = vi.fn()
    const executionCtx = {
      waitUntil: nativeWaitUntil,
      passThroughOnException: () => {},
      props: {},
    }

    const app = new Hono()
      .use(waitUntilMiddleware())
      .get('/native', async (c) => {
        waitUntil(sleep(150), c)
        return c.text('OK')
      })

    const start = performance.now()
    await app.request('/native', {}, {}, executionCtx as any)
    const time = performance.now() - start

    // Native waitUntil is fire-and-forget: the request must NOT block for 150ms.
    expect(time).toBeLessThan(150)
    expect(nativeWaitUntil).toHaveBeenCalledTimes(1)
  })
})
