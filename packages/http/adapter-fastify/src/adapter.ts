import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  DecoyServer,
  DuckDecoyRequest,
  DuckDecoyResponse,
  DuckDecoyHttpTransport,
  RouteDef,
  preHandlerEnabled,
  HttpServerStartOptions,
} from 'duck-decoy'

/**
 * Fastify-implementation of `DuckDecoyHttpTransport`
 */
export class DuckDecoyFastify implements DuckDecoyHttpTransport {
  name = 'fastify'
  fastify: FastifyInstance

  constructor() {
    this.fastify = Fastify()
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
