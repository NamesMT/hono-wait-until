# hono-wait-until ![TypeScript heart icon](https://img.shields.io/badge/♡-%23007ACC.svg?logo=typescript&logoColor=white)

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![Bundlejs][bundlejs-src]][bundlejs-href]
[![jsDocs.io][jsDocs-src]][jsDocs-href]

**hono-wait-until** is a simple wrapper for [`wait-until-generalized`](https://github.com/bubblydoo/wait-until-generalized), which "`Fake waitUntil in AWS Lambda and other platforms that don't support it.`".

It basically waits for all async tasks to complete before returning the response, so the platform won't kill your app with uncompleted async tasks.

## Usage
### Install package:
```sh
# npm
npm install hono-wait-until

# yarn
yarn add hono-wait-until

# pnpm (recommended)
pnpm install hono-wait-until
```

### Import:
```ts
import type { WaitUntilList } from 'hono-wait-until'
import {
  waitUntil, // Optional helper function instead of accessing via context
  waitUntilMiddleware,
} from 'hono-wait-until'

const app = new Hono<{ Variables: { waitUntilList: WaitUntilList } }>()
  // Preferably, use the waitUntilMiddleware as early as you can.
  .use(waitUntilMiddleware())
  .get('/context', async (c) => {
    const waitUntilList = c.get('waitUntilList')
    waitUntilList.waitUntil(sleep(300))

    return c.text(`Using waitUntil via context variable`)
  })
  .get('/helper', async (c) => {
    waitUntil(sleep(300), c)

    return c.text(`Using waitUntil via helper function`)
  })
```

## Roadmap
- [ ] Become the legendary 10000x developer

## License [![License][license-src]][license-href]
[MIT](./LICENSE) License © 2025 [NamesMT](https://github.com/NamesMT)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/hono-wait-until?labelColor=18181B&color=F0DB4F
[npm-version-href]: https://npmjs.com/package/hono-wait-until
[npm-downloads-src]: https://img.shields.io/npm/dm/hono-wait-until?labelColor=18181B&color=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/hono-wait-until
[codecov-src]: https://img.shields.io/codecov/c/gh/namesmt/hono-wait-until/main?labelColor=18181B&color=F0DB4F
[codecov-href]: https://codecov.io/gh/namesmt/hono-wait-until
[license-src]: https://img.shields.io/github/license/namesmt/hono-wait-until.svg?labelColor=18181B&color=F0DB4F
[license-href]: https://github.com/namesmt/hono-wait-until/blob/main/LICENSE
[bundlejs-src]: https://img.shields.io/bundlejs/size/hono-wait-until?labelColor=18181B&color=F0DB4F
[bundlejs-href]: https://bundlejs.com/?q=hono-wait-until
[jsDocs-src]: https://img.shields.io/badge/Check_out-jsDocs.io---?labelColor=18181B&color=F0DB4F
[jsDocs-href]: https://www.jsdocs.io/package/hono-wait-until
