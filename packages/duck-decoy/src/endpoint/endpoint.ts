import {
  EndpointDeclaration,
  EndpointConfiguration,
  EndpointsConfiguration,
  EndpointResponseFormatter,
  EndpointHandlerFunction,
} from './types'
import { DynamicRouteDef } from '@src/route'
import { HttpMethod } from '@src/http'
import { ArrayCollection } from '@src/collection'
import { ResourceRouteBuilder } from './resource'
import { RouteDocumentation } from '@src/route/types'
import { RequestPreHandlerFunction } from '@src/types'

/**
 * Ensure that a route URI has a leading /
 */
export const formatUri = (uri: string) => {
  if (!uri.startsWith('/')) return `/${uri}`
  return uri
}

/**
 * Create basic CRUD routes for the supplied collection of `records` at `uri`.
 *
 * This will create the following routes:
 * - GET /uri - list all records
 * - GET /uri/:id - get a single record by id
 * - POST /uri - create a new record
 * - PUT /uri/:id - update a record by id
 * - DELETE /uri/:id - delete a record by id
 *
 * @param uri - The base URI for the routes
 * @param records - The collection of records to create routes for
 *
 * @return An array of route definitions for the CRUD operations
 */
const buildCRUDRoutes = <State = unknown>(
  uri: string,
  records: any[]
): DynamicRouteDef<State>[] => {
  const builder = new ResourceRouteBuilder(uri, new ArrayCollection(records), 'id')

  return builder.coreCrudRoutes().build<State>()
}

/**
 * Convenience function providing a shorthand for creating a `RouteDef`-instance`
 *
 * @param method - The HTTP method for the route
 * @param uri - The URI for the route
 * @param handler - The handler function for the route
 * @param opts - Optional parameters for the route, such as a response formatter
 * @param opts.responseFormatter - A function to format the response before sending it
 *
 * @return A `RouteDef` instance representing the route
 */
const makeEndpoint = <State>(
  method: HttpMethod,
  uri: string,
  handler: EndpointHandlerFunction<State>,
  opts: {
    preHandler?: RequestPreHandlerFunction<State>
    responseFormatter?: EndpointResponseFormatter<State>
    docs?: RouteDocumentation
  } = {}
): DynamicRouteDef<State> => {
  const { preHandler, responseFormatter, docs } = opts

  const route: DynamicRouteDef<State> = {
    routeId: `${uri}-${method}`,
    method: method,
    path: formatUri(uri),
    handler: handler,
  }

  if (preHandler) {
    route.preHandler = preHandler
  }

  if (responseFormatter) {
    route.responseFormatter = responseFormatter
  }

  if (docs) {
    route.docs = docs
  }

  return route
}

/**
 * Identify the type of endpoint configuration contained in `declaration`,
 * and dispatch to generate its corresponding `RouteDef` instances.
 *
 * @param uri - The URI for the endpoint
 * @param declaration - The endpoint configuration, which can be an array of records,
 * a function, or an object with a handler and optional method and formatter.
 *
 * @return An array of `RouteDef` instances representing the endpoint routes
 */
const buildDeclaredEndpointRoutes = <State>(
  uri: string,
  declaration: EndpointConfiguration<State>
): DynamicRouteDef<State>[] => {
  if (Array.isArray(declaration)) {
    return buildCRUDRoutes(uri, declaration)
  }

  if (typeof declaration === 'function') {
    return [makeEndpoint('GET', uri, declaration as EndpointHandlerFunction<State>)]
  }

  if (
    typeof declaration === 'object' &&
    Object.keys(declaration).includes('handler') &&
    typeof (declaration as EndpointDeclaration<State>).handler === 'function'
  ) {
    const decl = declaration as EndpointDeclaration<State>
    return [
      makeEndpoint<State>(decl.method ?? 'GET', uri, decl.handler, {
        preHandler: decl.preHandler,
        responseFormatter: decl.formatter,
        docs: decl.docs,
      }),
    ]
  }

  return [
    makeEndpoint('GET', uri, async ({ response }) => {
      response.status(200).body(declaration)
    }),
  ]
}

/**
 * Construct routes for all endpoint configurations
 *
 * @param endpoints - The configuration object containing endpoint declarations
 *
 * @return An array of `RouteDef` instances representing all routes
 */
export const buildRoutes = <State>(endpoints: EndpointsConfiguration<State>) => {
  const routes: DynamicRouteDef<State>[] = []
  for (const [uri, declaration] of Object.entries(endpoints)) {
    const declaredRoutes = buildDeclaredEndpointRoutes(uri, declaration)
    routes.push(...declaredRoutes)
  }

  return routes
}
