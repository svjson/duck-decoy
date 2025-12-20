import bodyParser from '@koa/bodyparser'
import KoaRouter from '@koa/router'
import {
  BaseDuckDecoyHttpTransport,
  DecoyServer,
  DefaultState,
  DuckDecoyRequest,
  DuckDecoyResponse,
  DynamicRouteDef,
  HttpServerStartOptions,
  StaticDirectoryRouteDef,
  StaticFileRouteDef,
  urlpath,
} from 'duck-decoy'
import Koa, { Context } from 'koa'
import mount from 'koa-mount'
import send from 'koa-send'
import serve from 'koa-static'
import { Server } from 'node:net'
import path from 'node:path'

const stripHead = (router: any) => {
  router.stack = router.stack.filter((layer: any) => {
    if (layer.methods.length === 1 && layer.methods[0] === 'HEAD') return false

    if (layer.methods.includes('HEAD') && layer.methods.includes('GET')) {
      layer.methods = layer.methods.filter((m: string) => m !== 'HEAD')
    }
    return true
  })
}

/**
 * Koa-implementation of `DuckDecoyHttpTransport`
 *
 * Uses `koa-static` to serve static files and directories, and relies
 * on the route handling and body parsing of `@koa/router` and `@koa/bodyparser`
 * for dynamic routes, which are served using the base implementation of
 * handleDynamicRequest from BaseDuckDecoyHttpTransport.
 *
 * @see DuckDecoyHttpTransport
 */
export class DuckDecoyKoa extends BaseDuckDecoyHttpTransport {
  koa: Koa
  router: KoaRouter = new KoaRouter()
  server: Server | undefined

  constructor() {
    super('koa')
    this.koa = new Koa()
    this.koa.use(
      bodyParser({
        jsonStrict: false,
        parsedMethods: ['POST', 'PUT', 'PATCH'],
      })
    )
  }

  async start(opts: HttpServerStartOptions) {
    if (!this.server) {
      this.koa.use(this.router.routes())
      this.server = this.koa.listen({ port: opts.port })
    }
  }

  async shutdown(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.server = undefined
    }
  }

  port(): number {
    return (this.server?.address() as any).port
  }

  /**
   * Register a static file route using `koa-send`
   *
   * @param route The static file route definition
   * @param dd The DecoyServer instance
   *
   * @see BaseDuckDecoyHttpTransport.registerStaticFileRoute
   */
  registerStaticFileRoute<State extends DefaultState>(
    route: StaticFileRouteDef,
    dd: DecoyServer<State>
  ) {
    const routePath = urlpath.join(dd.root, route.path)
    this.router.get(routePath, async (ctx) => {
      await send(ctx, path.basename(routePath) as string, {
        root: path.dirname(route.staticFile),
      })
    })
  }

  /**
   * Register a static directory route using `koa-static`
   *
   * @param route The static directory route definition
   * @param dd The DecoyServer instance
   *
   * @see BaseDuckDecoyHttpTransport.registerStaticDirectoryRoute
   */
  registerStaticDirectoryRoute<State extends DefaultState>(
    route: StaticDirectoryRouteDef,
    dd: DecoyServer<State>
  ) {
    const routePath = urlpath.trailingSlashJoin(dd.root, route.path)
    const index =
      typeof route.index === 'string'
        ? route.index
        : route.index === true
          ? 'index.html'
          : undefined
    this.koa.use(mount(routePath, serve(route.staticRoot, { index })))
  }

  /**
   * Register a dynamic route
   *
   * @param route The dynamic route definition
   * @param dd The DecoyServer instance
   *
   * @see BaseDuckDecoyHttpTransport.registerDynamicRoute
   */
  registerDynamicRoute<State extends DefaultState>(
    route: DynamicRouteDef<State>,
    dd: DecoyServer<State>
  ) {
    const fn = (this.router as any)[route.method.toLowerCase()] as Function
    if (!fn) throw new Error(`Unsupported method: ${route.method}`)

    fn.call(
      this.router,
      route.routeId,
      `${dd.root}${route.path}`,
      async (ctx: Context) => {
        const ddRequest = new KoaDDRequest(ctx)
        const ddResponse = new KoaDDResponse(ctx)
        await this.handleDynamicRequest(route, dd, ddRequest, ddResponse)
      }
    )
    stripHead(this.router)
  }
}

/**
 * DuckDecoyRequest adapter for Koa's Context
 *
 * @see DuckDecoyRequest
 */
export class KoaDDRequest extends DuckDecoyRequest {
  constructor(private ctx: Context) {
    super()
  }

  get body() {
    return this.ctx.request.body
  }

  get pathParameters() {
    return this.ctx.params
  }

  get queryParameters() {
    return this.ctx.query as Record<string, string>
  }

  get url() {
    return this.ctx.url
  }
}

/**
 * DuckDecoyResponse adapter for Koa's Context
 *
 * @see DuckDecoyResponse
 */
export class KoaDDResponse extends DuckDecoyResponse {
  constructor(private ctx: Context) {
    super()
  }

  async encode() {
    this.ctx.body = this._body
    if (this._code !== 204 && (this.ctx.body === null || this.ctx.body === undefined)) {
      this.ctx.body = ''
    }
    this.ctx.status = this._code ?? 200

    this.encoded = true
  }
}
