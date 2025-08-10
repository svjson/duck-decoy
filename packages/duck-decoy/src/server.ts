import { RequestLog, RequestLogEntry, RouteDef } from './types'
import { StateEndpointsConfiguration } from './state'
import { buildRoutes } from './endpoint'
import { DuckDecoyHttpTransport, DuckDecoyRequest, resolveHttpTransport } from './http'

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
 * of a DuckDecoy instance.
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
  const { impl, root, requestLog, state } = instance
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

export class DecoyServer<State extends Object> {
  impl: DuckDecoyHttpTransport
  port: number
  root: string
  url: string
  state: State
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
  const serverConfig = await materializeConfiguration(config)
  const server = new DecoyServer(serverConfig)

  if (config.autostart) {
    await server.start()
  }
  return server
}

export const makeDecoyServer = createFakeServer

export type FakeServer = Awaited<ReturnType<typeof createFakeServer>>
