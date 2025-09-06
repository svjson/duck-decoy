import { EndpointHandlerFunction, EndpointResponseFormatter } from '@src/endpoint'
import { HttpMethod } from '@src/http'

export const isDynamicRoute = <State>(
  r: RouteDef<State>
): r is DynamicRouteDef<State> => {
  return 'handler' in r
}
export const isStaticRoute = <State>(r: RouteDef<State>): r is StaticRouteDef => {
  return 'staticRoot' in r
}

export interface BaseRouteDef {
  routeId: string
  method: HttpMethod
  path: string
}

/**
 * Used to define a route in the fake server
 */
export interface DynamicRouteDef<State = unknown> extends BaseRouteDef {
  handler: EndpointHandlerFunction<State>
  responseFormatter?: EndpointResponseFormatter<State>
}

export interface StaticRouteDef extends BaseRouteDef {
  staticRoot: string
  filePattern?: string
}

export type RouteDef<State = unknown> = DynamicRouteDef<State> | StaticRouteDef
