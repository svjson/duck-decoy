import path from 'node:path'
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import '@fastify/static'
import {
  DecoyServer,
  DuckDecoyRequest,
  DuckDecoyResponse,
  DuckDecoyHttpTransport,
  RouteDef,
  preHandlerEnabled,
  HttpServerStartOptions,
  isDynamicRoute,
  DynamicRouteDef,
  urlpath,
  isStaticFileRoute,
  isStaticDirectoryRoute,
  StaticFileRouteDef,
  StaticDirectoryRouteDef,
} from 'duck-decoy'
import fastifyStatic, { FastifyStaticOptions } from '@fastify/static'

/**
 * Fastify-implementation of `DuckDecoyHttpTransport`
 */
export class DuckDecoyFastify implements DuckDecoyHttpTransport {
  name = 'fastify'
  fastify: FastifyInstance

  constructor() {
    this.fastify = Fastify()
    this.fastify.register(fastifyStatic, {
      root: path.resolve(import.meta.url),
      serve: false,
    } as FastifyStaticOptions)
  }

  async start(opts: HttpServerStartOptions) {
    await this.fastify.listen({ host: '0.0.0.0', port: opts.port })
  }

  async shutdown(): Promise<void> {
    await this.fastify.close()
  }

  port(): number {
    return (this.fastify.server.address() as any).port
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
    this.fastify.get(routePath, (_req, reply) => {
      reply.sendFile(path.basename(routePath) as string, path.dirname(route.staticFile))
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

    this.fastify.register(fastifyStatic, {
      root: route.staticRoot,
      prefix: urlpath.trailingSlash(routePath),
      index,
      decorateReply: false,
    })
  }

  registerDynamicRoute<State extends Object>(
    route: DynamicRouteDef<State>,
    dd: DecoyServer<State>
  ) {
    this.fastify.route({
      method: route.method,
      exposeHeadRoute: false,
      url: `${dd.root}${route.path}`,
      handler: async (req, reply) => {
        const ddRequest = new FastifyDDRequest(req)
        const ddResponse = new FastifyDDResponse(reply)
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
      },
    })
  }
}

export class FastifyDDRequest extends DuckDecoyRequest {
  constructor(private req: FastifyRequest) {
    super()
  }

  get body() {
    return this.req.body
  }

  get pathParameters() {
    return this.req.params as Record<string, string>
  }

  get queryParameters() {
    return this.req.query as Record<string, string>
  }

  get url() {
    return this.req.url
  }
}

export class FastifyDDResponse extends DuckDecoyResponse {
  constructor(private reply: FastifyReply) {
    super()
  }

  async encode() {
    this.reply.code(this._code ?? 200).send(this._body)
    this.encoded = true
  }
}
