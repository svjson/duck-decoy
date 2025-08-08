import { FastifyReply, FastifyRequest } from 'fastify'
import { RecordCollection } from './collection/collection'

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

export interface EndpointHandlerParams {
  req: FastifyRequest
  reply: FastifyReply
  collection?: RecordCollection
}

export type EndpointHandler = (params: EndpointHandlerParams) => Promise<void>

/**
 * Used to define a route in the fake server
 */
export type RouteDef<State = unknown> = {
  routeId: string
  method: HttpMethod
  path: string
  handler: EndpointHandler
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
