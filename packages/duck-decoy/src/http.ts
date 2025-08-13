import { DecoyServer } from './server'
import { RouteDef } from './types'

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
  name: string
  registerRoute<State extends Object>(
    route: RouteDef<State>,
    dd: DecoyServer<State>
  ): void
  start(opts: HttpServerStartOptions): Promise<void>
  shutdown(): Promise<void>
  port(): number
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
  configValue: string | undefined | DuckDecoyHttpTransport | Function
): Promise<DuckDecoyHttpTransport> => {
  if (isHttpTransportInstance(configValue)) {
    return configValue as DuckDecoyHttpTransport
  }

  if (configValue && typeof configValue === 'function') {
    return Reflect.construct(configValue, [])
  }

  throw new NoImplementationError(`Implementation not available: ${configValue}`)
}
