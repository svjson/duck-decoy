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
  StaticRouteDef,
  isDynamicRoute,
  isStaticRoute,
  DynamicRouteDef,
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
    } else if (isStaticRoute(route)) {
      this.registerStaticRoute(route, dd)
    }
  }

  registerStaticRoute<State extends Object>(
    route: StaticRouteDef,
    dd: DecoyServer<State>
  ) {
    if (route.filePattern) {
      this.fastify.get(`${dd.root}${route.path}`, (req, reply) => {
        reply.sendFile(route.filePattern as string, route.staticRoot)
      })
    } else {
      this.fastify.register(fastifyStatic, {
        root: route.staticRoot,
        prefix: route.path.endsWith('/') ? route.path : `${route.path}/`,
        index: false,
        decorateReply: false,
      })
    }
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
