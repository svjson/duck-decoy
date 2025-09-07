import { EndpointHandlerFunction, EndpointResponseFormatter } from '@src/endpoint'
import { HttpMethod } from '@src/http'

export const isDynamicRoute = <State>(
  r: RouteDef<State>
): r is DynamicRouteDef<State> => {
  return 'handler' in r
}

export const isStaticFileRoute = <State>(r: RouteDef<State>): r is StaticFileRouteDef => {
  return 'staticFile' in r
}

export const isStaticDirectoryRoute = <State>(
  r: RouteDef<State>
): r is StaticDirectoryRouteDef => {
  return 'staticRoot' in r
}

export interface BaseRouteDef {
  routeId: string
  method: HttpMethod
  path: string
  docs?: RouteDocumentation
}

export type ParameterType = 'string'

/**
 * Used to define a route in the fake server
 */
export interface DynamicRouteDef<State = unknown> extends BaseRouteDef {
  handler: EndpointHandlerFunction<State>
  responseFormatter?: EndpointResponseFormatter<State>
}

export interface StaticFileRouteDef extends BaseRouteDef {
  staticFile: string
}

export interface StaticDirectoryRouteDef extends BaseRouteDef {
  staticRoot: string
  index?: string | boolean
  filePattern?: string
}

export type RouteDef<State = unknown> =
  | DynamicRouteDef<State>
  | StaticFileRouteDef
  | StaticDirectoryRouteDef

export interface RouteDocumentation {
  ignore?: boolean
  queryParameters?: Record<string, ParameterType>
}
