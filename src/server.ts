import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { RequestLog, RequestLogEntry, RouteDef } from './types'
import { StateEndpointsConfiguration } from './state'
import { buildRoutes } from './endpoint'

/**
 * Configuration type specifying the the behavior, state and shape of
 * of a DuckDecoy instance.
 */
type DuckDecoyServerConfig<State extends Object> = {
  apiRoot?: string
  state?: State
  endpoints?: StateEndpointsConfiguration
  routes?: RouteDef<State>[]
  port?: number
  autostart?: boolean
}

const configureRoutes = <State extends Object>(
  instance: DecoyServer<State>,
  routes: RouteDef<State>[]
) => {
  const { fastify, root, requestLog, state } = instance
  for (const route of routes) {
    fastify.route({
      method: route.method,
      exposeHeadRoute: false,
      url: `${root}${route.path}`,
      handler: async (req, reply) => {
        const logEntry: RequestLogEntry = {
          routeId: route.routeId,
          path: req.url,
          queryParams: { ...(req.query as Record<string, string>) },
        }
        requestLog.all.push(logEntry)
        const byRoute = (requestLog.byRouteId[route.routeId] ??= [])
        byRoute.push(logEntry)
        try {
          await route.handler({ req, reply })
          logEntry.statusCode = reply.statusCode
        } catch (e) {
          logEntry.error = `${e}`
          logEntry.statusCode = 500
          reply.status(500).send({ error: String(e) })
        }
      },
    })
  }
}

const configureEndpoints = (
  instance: DecoyServer<any>,
  endpoints: StateEndpointsConfiguration
) => {
  const routes = buildRoutes(endpoints)
  configureRoutes(instance, routes)
}

export class DecoyServer<State extends Object> {
  fastify: FastifyInstance = Fastify()
  port: number
  root: string
  url: string
  state: State
  requestLog: RequestLog

  constructor(config: DuckDecoyServerConfig<State>) {
    this.port = config.port ?? 0
    this.root = config.apiRoot ?? ''
    this.requestLog = { all: [], byRouteId: {} }
    this.state = config.state ?? ({} as State)
    this.url = ''
    configureEndpoints(this, config.endpoints ?? ({} as StateEndpointsConfiguration))
    configureRoutes(this, config.routes ?? [])
  }

  reset() {
    this.requestLog = { all: [], byRouteId: {} }
  }

  async start() {
    await this.fastify.listen({ port: 0 })
    const address = this.fastify.server.address()
    this.url = `http://localhost:${(address as any).port}`
  }

  async shutdown() {
    await this.fastify.close()
  }
}

/**
 * Create a "fake" HTTP service and start it on a random available
 * port.
 *
 * Allows simple definition of fake and mock endpoints by providing
 * any number of `RouteDef` endpoints.
 *
 * The service accumulates incoming requests and their results in
 * a `RequestLog` for inspection and verification of interactions
 *
 * fakeServerInstance.reset() should be called after each test to
 * clear all logged requests.
 */
export const createFakeServer = async <State extends Object>(
  config: DuckDecoyServerConfig<State> = {}
) => {
  const server = new DecoyServer(config)

  if (config.autostart) {
    await server.start()
  }

  return server
}

export const makeDecoyServer = createFakeServer

export type FakeServer = Awaited<ReturnType<typeof createFakeServer>>
