import { EndpointHandlerFunction, EndpointResponseFormatter } from '@src/endpoint'
import { HttpMethod } from '@src/http'
import { RequestPreHandlerFunction } from '@src/types'

/**
 * Type guard to check if a RouteDef is a DynamicRouteDef.
 *
 * @template State - The type of the state object passed to the handler.
 * @param r - The RouteDef to check.
 * @returns True if the RouteDef is a DynamicRouteDef, false otherwise.
 */
export const isDynamicRoute = <State>(
  r: RouteDef<State>
): r is DynamicRouteDef<State> => {
  return 'handler' in r
}

/**
 * Type guard to check if a RouteDef is a StaticFileRouteDef.
 *
 * @template State - The type of the state object passed to the handler.
 * @param r - The RouteDef to check.
 * @returns True if the RouteDef is a StaticFileRouteDef, false otherwise.
 */
export const isStaticFileRoute = <State>(r: RouteDef<State>): r is StaticFileRouteDef => {
  return 'staticFile' in r
}

/**
 * Type guard to check if a RouteDef is a StaticDirectoryRouteDef.
 *
 * @template State - The type of the state object passed to the handler.
 * @param r - The RouteDef to check.
 * @returns True if the RouteDef is a StaticDirectoryRouteDef, false otherwise.
 */
export const isStaticDirectoryRoute = <State>(
  r: RouteDef<State>
): r is StaticDirectoryRouteDef => {
  return 'staticRoot' in r
}

/**
 * Base Route definition for all Duck Decoy routes.
 */
export interface BaseRouteDef {
  /**
   * Unique identifier for the route
   */
  routeId: string
  /**
   * HTTP method for the route (GET, POST, etc.)
   */
  method: HttpMethod
  /**
   * URL path for the route (e.g., /api/users/:id)
   */
  path: string
  /**
   * Optional documentation for the route
   */
  docs?: RouteDocumentation
}

export type ParameterType = 'string'

/**
 * Route definition type for dynamic routes that use handler logic
 * to process requests.
 *
 * @template State - The type of the state object passed to the handler.
 */
export interface DynamicRouteDef<State = unknown> extends BaseRouteDef {
  /**
   * Handler function to process requests for this route.
   */
  handler: EndpointHandlerFunction<State>
  /**
   * Optional request pre-handler that may modify the request before it
   * is passed to the route handler for processing.
   *
   * This RequestPreHandler runs after any global pre-handlers.
   */
  preHandler?: RequestPreHandlerFunction<State>
  /**
   * Optional response formatter that may modify customize the response
   * after it has been encoded by the route handler
   */
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

/**
 * Union type representing all possible route definition types.
 */
export type RouteDef<State = unknown> =
  | DynamicRouteDef<State>
  | StaticFileRouteDef
  | StaticDirectoryRouteDef

export interface RouteDocumentation {
  ignore?: boolean
  queryParameters?: Record<string, ParameterType>
}
