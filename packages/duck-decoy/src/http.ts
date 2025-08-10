import { DecoyServer } from './server'
import { RouteDef } from './types'

class NoImplementationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export interface HttpServerStartOptions {
  port: number
}

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

export abstract class DuckDecoyRequest {
  abstract get body(): any
  abstract get pathParameters(): Record<string, string>
  abstract get queryParameters(): Record<string, string>
  abstract get url(): string
}

export abstract class DuckDecoyResponse {
  _code: number | undefined
  _body: any | undefined

  status(code: number): DuckDecoyResponse {
    this._code = code
    return this
  }

  body(body?: any): DuckDecoyResponse {
    this._body = body
    return this
  }

  abstract encode(): Promise<void>
}

const isHttpTransportInstance = (candidate: any) => {
  if (typeof candidate === 'object') return true

  return false
}

const isHttpTransportClass = (candidate: any) => {
  if (typeof candidate === 'function') return true
  return false
}

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
