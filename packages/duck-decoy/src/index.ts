export {
  createFakeServer,
  makeDecoyServer,
  DecoyServer,
  logRequest,
  preHandlerEnabled,
} from './server'
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
export type {
  RequestPreHandler,
  RequestPreHandlerFunction,
  RouteDef,
  RequestLog,
  RequestLogEntry,
} from './types'
export type { DuckDecoyHttpTransport, HttpServerStartOptions } from './http'
