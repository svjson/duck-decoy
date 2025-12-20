import {
  DynamicRouteDef,
  isDynamicRoute,
  isStaticDirectoryRoute,
  isStaticFileRoute,
  RouteDef,
  StaticDirectoryRouteDef,
  StaticFileRouteDef,
} from './route'
import { DecoyServer, preHandlerEnabled } from './server'
import { DefaultState } from './types'

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH'

export const METHODS: HttpMethod[] = [
  'GET',
  'PUT',
  'POST',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'PATCH',
]

/**
 * HttpTransport interface implemented by adapters for actual
 * HTTP libraries, e.g, Fastify
 */
export interface DuckDecoyHttpTransport {
  /**
   * The HTTP transport implementation
   */
  name: string

  /**
   * Register a logical DuckDecoy RouteDef onto the HTTP transport
   * implementation.
   *
   * @param route - The RouteDef to register
   * @param dd - The DecoyServer instance the route is being registered onto
   */
  registerRoute<State extends DefaultState>(
    route: RouteDef<State>,
    dd: DecoyServer<State>
  ): void

  /**
   * Start the HTTP server
   */
  start(opts: HttpServerStartOptions): Promise<void>

  /**
   * Shutdown the HTTP server
   */
  shutdown(): Promise<void>

  /**
   * Get the port the HTTP server is listening on
   */
  port(): number
}

/**
 * Abstract base class serving as the abstraction of an Http Transport with
 * default implementations of common methods
 *
 * If viable for an HTTP transport implementation, it should extend this class
 * rather than implementing the DuckDecoyHttpTransport interface directly.
 */
export abstract class BaseDuckDecoyHttpTransport implements DuckDecoyHttpTransport {
  constructor(public name: string) {}

  /**
   * Register a logical DuckDecoy RouteDef onto the HTTP transport
   */
  registerRoute<State extends DefaultState>(
    route: RouteDef<State>,
    dd: DecoyServer<State>
  ) {
    if (isDynamicRoute(route)) {
      this.registerDynamicRoute(route, dd)
    } else if (isStaticFileRoute(route)) {
      this.registerStaticFileRoute(route, dd)
    } else if (isStaticDirectoryRoute(route)) {
      this.registerStaticDirectoryRoute(route, dd)
    }
  }

  /**
   * Template method to register a dynamic route
   */
  protected abstract registerDynamicRoute<State extends DefaultState>(
    route: DynamicRouteDef<State>,
    dd: DecoyServer<State>
  ): void

  /**
   * Template method to register a static file route
   */
  protected abstract registerStaticFileRoute<State extends DefaultState>(
    route: StaticFileRouteDef,
    dd: DecoyServer<State>
  ): void

  /**
   * Template method to register a static directory route
   */
  protected abstract registerStaticDirectoryRoute<State extends DefaultState>(
    route: StaticDirectoryRouteDef,
    dd: DecoyServer<State>
  ): void

  /**
   * Default implementation of a dynamic route handler.
   *
   * A HTTP transport implementation may call this after constructing
   * its request/response adapters.
   *
   * Usage across implementations guarantees consistent request
   * handlig logic.
   *
   * @param route - The DynamicRouteDef being handled
   * @param dd - The DecoyServer instance the route is being handled on
   * @param request - The DuckDecoyRequest instance
   * @param response - The DuckDecoyResponse instance
   */
  protected async handleDynamicRequest<State extends DefaultState>(
    route: DynamicRouteDef<State>,
    dd: DecoyServer<State>,
    request: DuckDecoyRequest,
    response: DuckDecoyResponse
  ): Promise<void> {
    const logEntry = dd.requestLog.logRequest(request, route)
    try {
      await this.runPreHandlers(route, dd, request, response)
      if (response.isEncoded()) return

      await route.handler({
        request,
        response,
        state: dd.state,
      })
    } catch (e) {
      logEntry.error = `${e}`
      response.status(500).body({ error: String(e) })
    } finally {
      logEntry.statusCode = response.statusCode
    }

    if (route.responseFormatter) {
      const formatted = await route.responseFormatter({
        payload: response._body,
        request,
        response,
        state: dd.state,
      })
      response.body(formatted)
    }

    response.encode()
  }

  async runPreHandlers<State extends DefaultState>(
    route: DynamicRouteDef<State>,
    dd: DecoyServer<State>,
    request: DuckDecoyRequest,
    response: DuckDecoyResponse
  ): Promise<void> {
    for (const preHandler of dd.preHandlers) {
      if (preHandlerEnabled(preHandler, route.path)) {
        await preHandler.handler({
          request,
          response,
          state: dd.state,
        })

        if (response.isEncoded()) {
          return
        }
      }
    }
  }

  start(_opts: HttpServerStartOptions): Promise<void> {
    throw new Error('Method not implemented.')
  }
  shutdown(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  port(): number {
    throw new Error('Method not implemented.')
  }
}

/**
 * Abstract base class serving as the abstraction of an HttpRequest
 * internally in DuckDecoy and as a translation layer against the request
 * abstraction of an actual Http library.
 *
 * Each Http Transport Provider is required to implement this class.
 */
export abstract class DuckDecoyRequest {
  context: Record<string, any> = {}

  abstract get body(): any
  abstract get pathParameters(): Record<string, string>
  abstract get queryParameters(): Record<string, string>
  abstract get url(): string
}

/**
 * Abstract base class serving as the abstraction of an HttpResponse
 * internally in DuckDecoy and as a translation layer against the
 * response abstraction of an actual Http library.
 *
 * Each Http Transport Provider is required to implement his class.
 */
export abstract class DuckDecoyResponse {
  _code: number | undefined
  _body: any | undefined
  protected encoded: boolean = false

  get statusCode(): number | undefined {
    return this._code
  }

  status(code: number): DuckDecoyResponse {
    this._code = code
    return this
  }

  body(body?: any): DuckDecoyResponse {
    this._body = body
    return this
  }

  isEncoded(): boolean {
    return this.encoded
  }

  abstract encode(): Promise<void>
}

/**
 * Error thrown when initialization of a Http Transport is attempted
 * but the implementation is not available.
 *
 * This can happen if the implementation is not installed or if the
 * implementation is not a class or an instance of DuckDecoyHttpTransport.
 */
class NoImplementationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export interface HttpServerStartOptions {
  port: number
}

const isHttpTransportInstance = (candidate: any) => {
  if (typeof candidate === 'object') return true

  return false
}

/**
 * Attempt to resolve the value provided for HttpTransport in a server
 * configuration to an actual Http Transport implementation.
 *
 * This can be an instance of DuckDecoyHttpTransport or a class
 * constructor function that can be instantiated to create an instance of
 * DuckDecoyHttpTransport.
 *
 * @param configValue - The value provided for HttpTransport in the server configuration
 *
 * @return A Promise that resolves to an instance of DuckDecoyHttpTransport
 *
 * @throws NoImplementationError if the provided value is not an instance
 */
export const resolveHttpTransport = async (
  configValue: string | DuckDecoyHttpTransport | Function | undefined
): Promise<DuckDecoyHttpTransport> => {
  if (isHttpTransportInstance(configValue)) {
    return configValue as DuckDecoyHttpTransport
  }

  if (configValue && typeof configValue === 'function') {
    return Reflect.construct(configValue, [])
  }

  throw new NoImplementationError(`Implementation not available: ${configValue}`)
}
