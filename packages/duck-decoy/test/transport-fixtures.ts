import {
  DecoyServer,
  DuckDecoyHttpTransport,
  DuckDecoyRequest,
  DuckDecoyResponse,
  HttpServerStartOptions,
  RouteDef,
} from '@src/index'
import { DefaultState } from './types'

/**
 * Programmatic fake http transport implementation
 */
export class TestHttpTransport implements DuckDecoyHttpTransport {
  name = 'test'
  opts: HttpServerStartOptions | undefined
  routes: RouteDef<any>[] = []

  async start(opts: HttpServerStartOptions) {
    this.opts = opts
  }

  async shutdown(): Promise<void> {}

  port(): number {
    return this.opts?.port || 0
  }

  registerRoute<State extends DefaultState>(
    route: RouteDef<State>,
    _dd: DecoyServer<State>
  ) {
    this.routes.push(route)
  }
}

export class TestRequest extends DuckDecoyRequest {
  #url
  #body?: string | Buffer
  #params: Record<string, string>
  #query: Record<string, string>

  constructor(
    url: string,
    {
      body,
      params = {},
      query = {},
    }: {
      body?: string | Buffer
      params?: Record<string, string>
      query?: Record<string, string>
    } = {}
  ) {
    super()
    this.#url = url
    this.#body = body
    this.#params = params
    this.#query = query
  }

  get body() {
    return this.#body
  }

  get pathParameters() {
    return this.#params
  }

  get queryParameters() {
    return this.#query
  }

  get url() {
    return this.#url
  }
}

export class TestResponse extends DuckDecoyResponse {
  #statusCode?: number

  async encode() {
    this.#statusCode = this.#statusCode ?? 200
    this.encoded = true
  }
}
