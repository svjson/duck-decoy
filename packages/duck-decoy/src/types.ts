import { RecordCollection } from './collection/collection'
import { EndpointResponseFormatter } from './state'
import { DuckDecoyRequest, DuckDecoyResponse } from './http'

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

export interface EndpointHandlerParams<State = any> {
  request: DuckDecoyRequest
  response: DuckDecoyResponse
  collection?: RecordCollection
  state: State
}

export type EndpointHandler<State = any> = (
  params: EndpointHandlerParams<State>
) => Promise<void>

/**
 * Used to define a route in the fake server
 */
export type RouteDef<State = unknown> = {
  routeId: string
  method: HttpMethod
  path: string
  handler: EndpointHandler<State>
  responseFormatter?: EndpointResponseFormatter<State>
}

export type RequestPreHandlerFunction<State> = (
  params: EndpointHandlerParams<State>
) => Promise<void>

export interface RequestPreHandler<State> {
  include?: string[]
  exclude?: string[]
  handler: RequestPreHandlerFunction<State>
}

/**
 * Request log for fake http servers. Stores recorded request entries
 * both in a flat array and grouped by routeId for easier access.
 */
export interface RequestLog {
  all: RequestLogEntry[]
  byRouteId: Record<string, RequestLogEntry[]>
}

/**
 * The format of logged/recorded requests in the `RequestLog` of
 * a fake server.
 */
export interface RequestLogEntry {
  routeId: string
  path: string
  queryParams: Record<string, string>
  error?: string
  statusCode?: number
}

export const datesBetween = (
  startYMD: string,
  endYMD: string,
  opts: { inclusive?: boolean } = {}
): string[] => {
  const inclusive = opts.inclusive ?? true

  const toUTC = (ymd: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
    if (!m) throw new Error(`Bad date: ${ymd}`)
    const [_, y, mo, d] = m
    return new Date(Date.UTC(+y, +mo - 1, +d))
  }

  let a = toUTC(startYMD)
  let b = toUTC(endYMD)
  if (a > b) [a, b] = [b, a]

  const cur = new Date(a)
  const stop = new Date(b)
  if (!inclusive) {
    cur.setUTCDate(cur.getUTCDate() + 1)
    stop.setUTCDate(stop.getUTCDate() - 1)
  }

  const out: string[] = []
  while (cur <= stop) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
