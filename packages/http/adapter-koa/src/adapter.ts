import {
  DecoyServer,
  DuckDecoyHttpTransport,
  DuckDecoyRequest,
  DuckDecoyResponse,
  DynamicRouteDef,
  HttpServerStartOptions,
  isDynamicRoute,
  isStaticDirectoryRoute,
  isStaticFileRoute,
  preHandlerEnabled,
  RouteDef,
  StaticDirectoryRouteDef,
  StaticFileRouteDef,
  urlpath,
} from 'duck-decoy'
import Koa, { Context } from 'koa'
import KoaRouter from '@koa/router'
import bodyParser from '@koa/bodyparser'
import send from 'koa-send'
import mount from 'koa-mount'
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

export class DuckDecoyKoa implements DuckDecoyHttpTransport {
  name = 'koa'
  koa: Koa
  router: KoaRouter = new KoaRouter()
  server: Server | undefined

  constructor() {
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

  registerRoute<State extends Object>(route: RouteDef<State>, dd: DecoyServer<State>) {
    if (isDynamicRoute(route)) {
      this.registerDynamicRoute(route, dd)
    } else if (isStaticFileRoute(route)) {
      this.registerStaticFileRoute(route, dd)
    } else if (isStaticDirectoryRoute(route)) {
      this.registerStaticDirectoryRoute(route, dd)
    }
  }

  registerStaticFileRoute<State extends Object>(
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

  registerStaticDirectoryRoute<State extends Object>(
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

  registerDynamicRoute<State extends Object>(
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
        const logEntry = dd.requestLog.logRequest(ddRequest, route)
        try {
          for (const preHandler of dd.preHandlers) {
            if (preHandlerEnabled(preHandler, route.path)) {
              await preHandler.handler({
                request: ddRequest,
                response: ddResponse,
                state: dd.state,
              })

              if (ddResponse.isEncoded()) {
                return
              }
            }
          }

          await route.handler({
            request: ddRequest,
            response: ddResponse,
            state: dd.state,
          })
          logEntry.statusCode = ddResponse.statusCode
        } catch (e) {
          logEntry.error = `${e}`
          logEntry.statusCode = 500
          ddResponse.status(500).body({ error: String(e) })
        }

        if (route.responseFormatter) {
          const formatted = await route.responseFormatter({
            payload: ddResponse._body,
            request: ddRequest,
            response: ddResponse,
            state: dd.state,
          })
          ddResponse.body(formatted)
        }

        ddResponse.encode()
      }
    )
    stripHead(this.router)
  }
}

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
