export {
  createFakeServer,
  makeDecoyServer,
  DecoyServer,
  preHandlerEnabled,
} from './server'
export {
  isDynamicRoute,
  isStaticDirectoryRoute,
  isStaticFileRoute,
  urlpath,
} from './route'
export { RequestLog } from './log'
export { ArrayCollection, RecordCollection } from './collection'
export { DuckDecoyResponse, DuckDecoyRequest } from './http'
export { datesBetween } from './types'
export { each, from } from './state'

export type {
  EndpointDeclaration,
  EndpointConfiguration,
  EndpointsConfiguration,
  EndpointHandlerFunction,
  EndpointResponseFormatter,
} from './endpoint'
export type { DuckDecoyPlugin } from './plugin'
export type {
  DynamicRouteDef,
  StaticDirectoryRouteDef,
  StaticFileRouteDef,
  RouteDef,
  RouteDocumentation,
} from './route'
export type { RequestPreHandler, RequestPreHandlerFunction } from './types'
export type { RequestLogEntry } from './log'
export type { DuckDecoyHttpTransport, HttpServerStartOptions } from './http'
export type { DefaultRecordKey, RecordCriteria, WithoutIdentity } from './collection'
