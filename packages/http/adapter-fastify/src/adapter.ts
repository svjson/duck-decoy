import '@fastify/static'
import fastifyStatic, { FastifyStaticOptions } from '@fastify/static'
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
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import path from 'node:path'

/**
 * Fastify-implementation of `DuckDecoyHttpTransport`
 *
 * Uses @fastify/static to serve static files and directories, and relies
 * on Fastify's route handling for dynamic routes, which are served using
 * the base implementation of handleDynamicRequest from
 * BaseDuckDecoyHttpTransport.
 *
 * @see DuckDecoyHttpTransport
 */
export class DuckDecoyFastify extends BaseDuckDecoyHttpTransport {
  fastify: FastifyInstance

  constructor() {
    super('fastify')
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

  /**
   * Register a static file route using `@fastify/static`
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
    this.fastify.get(routePath, (_req, reply) => {
      reply.sendFile(path.basename(routePath) as string, path.dirname(route.staticFile))
    })
  }

  /**
   * Register a static directory route using `@fastify/static`
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

    this.fastify.register(fastifyStatic, {
      root: route.staticRoot,
      prefix: urlpath.trailingSlash(routePath),
      index,
      decorateReply: false,
    })
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
    this.fastify.route({
      method: route.method,
      exposeHeadRoute: false,
      url: `${dd.root}${route.path}`,
      handler: async (req, reply) => {
        const ddRequest = new FastifyDDRequest(req)
        const ddResponse = new FastifyDDResponse(reply)
        await this.handleDynamicRequest(route, dd, ddRequest, ddResponse)
      },
    })
  }
}

/**
 * DuckDecoyRequest adapter for FastifyRequest
 *
 * @see DuckDecoyRequest
 */
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

/**
 * DuckDecoyResponse adapter for FastifyReply
 *
 * @see DuckDecoyResponse
 */
export class FastifyDDResponse extends DuckDecoyResponse {
  constructor(private reply: FastifyReply) {
    super()
  }

  async encode() {
    this.reply.code(this._code ?? 200).send(this._body)
    this.encoded = true
  }
}
