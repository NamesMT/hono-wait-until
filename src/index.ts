import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { WaitUntilList } from 'wait-until-generalized'

export type { WaitUntilList }

export interface waitUntilMiddlewareOptions {
  /**
   * This options could be used to response immediately without blocking until all async tasks are settled. (basically, it disables the middleware)
   * 
   * This is useful if you have migrated to a platform that support background async tasks and want a test run without commiting code changes to remove the waitUntil wrappers.
   */
  continueWithoutSettled?: boolean
}
export function waitUntilMiddleware(options?: waitUntilMiddlewareOptions) {
  return createMiddleware(async (c, next) => {
    if (options?.continueWithoutSettled)
      return await next()

    const waitUntilList = new WaitUntilList()
    c.set('waitUntilList', waitUntilList)

    await next()

    await waitUntilList.waitUntilSettled()
  })
}

export function waitUntil(promise: Promise<any>, c: Context) {
  const waitUntilList: WaitUntilList = c.get('waitUntilList')
  if (!waitUntilList)
    throw new Error('waitUntilList not found in context')

  waitUntilList.waitUntil(promise)
}
