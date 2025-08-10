import { RequestLog, RequestLogEntry, RouteDef } from './types'
import { StateEndpointsConfiguration } from './state'
import { buildRoutes } from './endpoint'
import { DuckDecoyHttpTransport, DuckDecoyRequest, resolveHttpTransport } from './http'

/**
 * Configuration type specifying the the behavior, state and shape of
 * of a DuckDecoy instance.
 */
interface DuckDecoyServerConfigParams<State extends Object> {
  impl: DuckDecoyHttpTransport
  root: string
  state: State
  endpoints: StateEndpointsConfiguration<State>
  routes: RouteDef<State>[]
  port: number
}

/**
 * Configuration type specifying the the behavior, state and shape of
 * of a DuckDecoy instance with optional properties.
 */
type DuckDecoyServerConfig<State extends Object> = {
  impl?: string | DuckDecoyHttpTransport
  root?: string
  state?: State
  endpoints?: StateEndpointsConfiguration<State>
  routes?: RouteDef<State>[]
  port?: number
  autostart?: boolean
}

/**
 * Log an incoming request to the `requestLog` of a DecoyServer
 * instance.
 *
 * Returns the logged entry, allowing the logging handler to encode
 * response information once the response has been handled.
 *
 * @param dd - The DecoyServer instance to log the request to
 * @param route - The RouteDef that the request is being logged for
 * @param req - The DuckDecoyRequest that is being logged
 *
 * @return The logged RequestLogEntry
 */
export const logRequest = (
  dd: DecoyServer<any>,
  route: RouteDef<any>,
  req: DuckDecoyRequest
): RequestLogEntry => {
  const logEntry: RequestLogEntry = {
    routeId: route.routeId,
    path: req.url,
    queryParams: { ...req.queryParameters },
  }
  dd.requestLog.all.push(logEntry)
  const byRoute = (dd.requestLog.byRouteId[route.routeId] ??= [])
  byRoute.push(logEntry)

  return logEntry
}

/**
 * Re-shape a `DuckDecoyServerConfig`, which allows most configuration
 * properties to be omitted, into an instance of
 * `DuckDecoyServerConfigParams` with concrete values for all properties.
 *
 * This is used to ensure that the server can be constructed
 * with all required properties and keep ifs and buts to a minimum when
 * DecoyServer inspects its configuration.
 *
 * @param config - The DuckDecoyServerConfig to materialize
 *
 * @return A DuckDecoyServerConfigParams with all properties set
 * with concrete values.
 */
const materializeConfiguration = async <State extends Object>(
  config: DuckDecoyServerConfig<State>
): Promise<DuckDecoyServerConfigParams<State>> => {
  return {
    impl: await resolveHttpTransport(config.impl),
    root: config.root ?? '',
    state: config.state ?? ({} as State),
    endpoints: config.endpoints ?? {},
    routes: config.routes ?? [],
    port: typeof config.port === 'number' ? config.port : 0,
  }
}

const configureRoutes = <State extends Object>(
  instance: DecoyServer<State>,
  routes: RouteDef<State>[]
) => {
  const { impl } = instance
  for (const route of routes) {
    impl.registerRoute(route, instance)
  }
}

const configureEndpoints = <State>(
  instance: DecoyServer<any>,
  endpoints: StateEndpointsConfiguration<State>
) => {
  const routes = buildRoutes(endpoints)
  configureRoutes(instance, routes)
}

/**
 * Public interface of a Duck Decoy Server.
 *
 * This class wires up a configuration of routes and state over
 * the supplied HTTP transport implementation.
 *
 * Routes are registered and assembled from the configuration object
 * upon construction.
 *
 * It also maintains a request log for inspection and verification of
 * interactions.
 */
export class DecoyServer<State extends Object> {
  /**
   * The HTTP transport implementation, e.g, Fastify or Koa
   */
  impl: DuckDecoyHttpTransport
  /**
   * The port number that the server runs on.
   */
  port: number
  /**
   * The URI root where the API consisting of the configured endpoints
   * is exposed. e.g '/api'.
   */
  root: string
  /**
   * The server URL
   */
  url: string
  /**
   * The mock/fake state
   */
  state: State
  /**
   * Log containing received and handled requests, globally and per
   * endpoint.
   */
  requestLog: RequestLog

  constructor(config: DuckDecoyServerConfigParams<State>) {
    this.impl = config.impl
    this.port = config.port
    this.root = config.root
    this.requestLog = { all: [], byRouteId: {} }
    this.state = config.state
    this.url = ''
    configureEndpoints(this, config.endpoints)
    configureRoutes(this, config.routes ?? [])
  }

  reset() {
    this.requestLog = { all: [], byRouteId: {} }
  }

  async start() {
    await this.impl.start({ port: 0 })
    this.url = `http://localhost:${this.impl.port()}`
  }

  async shutdown() {
    await this.impl.shutdown()
  }
}

/**
 * Create a "fake" HTTP service and start it on a specific or randomly
 * selected available port.
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
  const serverConfig = await materializeConfiguration(config)
  const server = new DecoyServer(serverConfig)

  if (config.autostart) {
    await server.start()
  }
  return server
}

export const makeDecoyServer = createFakeServer

export type FakeServer = Awaited<ReturnType<typeof createFakeServer>>
