import { RecordCollection } from './collection'
import { EndpointsConfiguration } from './endpoint'
import { buildRoutes } from './endpoint/endpoint'
import { DuckDecoyHttpTransport, resolveHttpTransport } from './http'
import { RequestLog } from './log'
import { DuckDecoyPlugin } from './plugin'
import { RouteDef } from './route'
import { DefaultState, ExtendMethods, RequestPreHandler } from './types'

/**
 * Configuration type specifying the the behavior, state and shape of
 * of a DuckDecoy instance.
 */
interface DuckDecoyServerConfigParams<State extends DefaultState> {
  impl: DuckDecoyHttpTransport
  root: string
  state: State
  preHandlers: RequestPreHandler<State>[]
  endpoints: EndpointsConfiguration<State>
  routes: RouteDef<State>[]
  plugins: DuckDecoyPlugin[]
  port: number
}

/**
 * Configuration type specifying the the behavior, state and shape of
 * of a DuckDecoy instance with optional properties.
 *
 * @template State Type of the mock/fake state object
 * @template E Additional extension properties/methods to add to
 *             the DecoyServer instance
 */
type DuckDecoyServerConfig<
  State extends DefaultState = DefaultState,
  E extends Record<string, any> = {},
> = {
  impl?: string | DuckDecoyHttpTransport
  root?: string
  state?: State
  preHandlers?: RequestPreHandler<State>[]
  endpoints?: EndpointsConfiguration<State>
  routes?: RouteDef<State>[]
  plugins?: DuckDecoyPlugin[]
  port?: number
  autostart?: boolean
  extend?: ExtendMethods<DecoyServer<State> & E> & E
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
const materializeConfiguration = async <State extends DefaultState>(
  config: DuckDecoyServerConfig<State>
): Promise<DuckDecoyServerConfigParams<State>> => {
  return {
    impl: await resolveHttpTransport(config.impl),
    root: config.root ?? '',
    state: config.state ?? ({} as State),
    preHandlers: config.preHandlers ?? [],
    endpoints: config.endpoints ?? {},
    routes: config.routes ?? [],
    plugins: config.plugins ?? [],
    port: typeof config.port === 'number' ? config.port : 0,
  }
}

const configureRoutes = <State extends DefaultState>(
  instance: DecoyServer<State>,
  routes: RouteDef<State>[]
): RouteDef<State>[] => {
  const { impl } = instance
  for (const route of routes) {
    impl.registerRoute(route, instance)
  }
  return routes
}

const configureEndpoints = <State extends DefaultState>(
  instance: DecoyServer<State>,
  endpoints: EndpointsConfiguration<State>
) => {
  const routes = buildRoutes(endpoints)
  return configureRoutes(instance, routes)
}

const configurePlugins = <State extends DefaultState>(
  instance: DecoyServer<State>,
  plugins: DuckDecoyPlugin[]
) => {
  const routes = []
  for (const plugin of plugins) {
    routes.push(...configureRoutes(instance, plugin.makePluginRoutes(instance)))
  }
  return routes
}

export const preHandlerEnabled = (preHandler: RequestPreHandler<any>, uri: string) => {
  if (Array.isArray(preHandler.include) && !preHandler.include.includes(uri)) {
    return false
  }

  if (Array.isArray(preHandler.exclude)) {
    for (const pattern of preHandler.exclude) {
      if (pattern === uri) return false
      if (pattern.endsWith('*')) {
        if (uri.startsWith(pattern.substring(0, pattern.indexOf('*')))) {
          return false
        }
      }
    }
  }

  return true
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
export class DecoyServer<State extends DefaultState> {
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
   * List of preHandlers, or middleware, that an incoming request will be
   * sequentially filtered through before any endpoint handler is invoked.
   */
  preHandlers: RequestPreHandler<State>[]

  /**
   * Log containing received and handled requests, globally and per
   * endpoint.
   */
  requestLog: RequestLog

  #routes: RouteDef<State>[] = []

  constructor(config: DuckDecoyServerConfigParams<State>) {
    this.impl = config.impl
    this.port = config.port ?? 0
    this.root = config.root
    this.requestLog = new RequestLog()
    this.state = config.state
    this.preHandlers = config.preHandlers
    this.url = ''
    this.#routes.push(...configureEndpoints(this, config.endpoints))
    this.#routes.push(...configureRoutes(this, config.routes ?? []))
    this.#routes.push(...configurePlugins(this, config.plugins ?? []))
  }

  /**
   * Block until all RecordCollection instances in State have finished
   * their initialization process.
   */
  async #initializationComplete(): Promise<void> {
    await Promise.all(
      Object.values(this.state)
        .filter((stateVal) => stateVal instanceof RecordCollection)
        .map((stateVal) => stateVal.isInitialized())
    )
  }

  /**
   * The configured routes of this instance
   */
  get routes() {
    return this.#routes
  }

  /**
   * Reset/clear the request log of this instance
   */
  async reset(selection?: {
    log?: boolean
    state?: Record<string, boolean>
  }): Promise<void> {
    if (!selection) {
      selection = {
        log: true,
        state: Object.keys(this.state).reduce(
          (collState, stateKey) => {
            if (
              Object.hasOwn(this.state, stateKey) &&
              this.state[stateKey] instanceof RecordCollection
            ) {
              collState[stateKey] = true
            }
            return collState
          },
          {} as Record<string, boolean>
        ),
      }
    }

    if (selection.log) {
      this.requestLog.reset()
    }

    if (selection.state) {
      await Promise.all(
        Object.entries(selection.state)
          .filter(
            ([stateKey, stateVal]) =>
              stateVal && this.state[stateKey] instanceof RecordCollection
          )
          .map(([stateKey, _]) => (this.state[stateKey] as RecordCollection).reset())
      )
    }
  }

  /**
   * Start the Duck Decoy service.
   *
   * The `url` and `port` properties of the server instance will have
   * been set when this method exits.
   */
  async start() {
    await this.impl.start({ port: this.port })
    this.url = `http://localhost:${this.impl.port()}`
    this.port = this.impl.port()
    await this.#initializationComplete()
  }

  /**
   * Shut down the HTTP listener
   */
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
export const createFakeServer = async <
  E extends ExtendMethods<DecoyServer<State> & any> = {},
  State extends DefaultState = DefaultState,
  ServerType = DecoyServer<State> & E,
>(
  config: DuckDecoyServerConfig<State, E> = {}
): Promise<ServerType> => {
  const serverConfig = await materializeConfiguration(config)
  const server = new DecoyServer(serverConfig)

  if (config.extend) {
    for (const [k, v] of Object.entries(config.extend)) {
      ; (server as any)[k] = typeof v === 'function' ? (v as Function).bind(server) : v
    }
  }

  if (config.autostart) {
    await server.start()
  }
  return server as ServerType
}

export const makeDecoyServer = createFakeServer

export type FakeServer = Awaited<ReturnType<typeof createFakeServer>>
