import {
  EndpointDeclaration,
  EndpointConfiguration,
  StateEndpointsConfiguration,
  EndpointResponseFormatter,
} from './state'
import { EndpointHandler, HttpMethod, RouteDef } from './types'
import { ArrayCollection, RecordCollection } from './collection'
import { ResourceRouteBuilder } from './resource'

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
const buildCRUDRoutes = (uri: string, records: any[]): RouteDef<any>[] => {
  const builder = new ResourceRouteBuilder(uri, new ArrayCollection(records), 'id')

  return builder.coreCrudRoutes().build()
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
  handler: EndpointHandler,
  opts: {
    responseFormatter?: EndpointResponseFormatter<State>
  } = {}
): RouteDef<State> => {
  const { responseFormatter } = opts

  const route: RouteDef<State> = {
    routeId: `${uri}-${method}`,
    method: method,
    path: formatUri(uri),
    handler: handler,
  }

  if (responseFormatter) {
    route.responseFormatter = responseFormatter
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
): RouteDef<any>[] => {
  if (Array.isArray(declaration)) {
    return buildCRUDRoutes(uri, declaration)
  }

  if (typeof declaration === 'function') {
    return [makeEndpoint('GET', uri, declaration as EndpointHandler)]
  }

  if (
    typeof declaration === 'object' &&
    Object.keys(declaration).includes('handler') &&
    typeof (declaration as EndpointDeclaration<State>).handler === 'function'
  ) {
    const decl = declaration as EndpointDeclaration<State>
    return [
      makeEndpoint(decl.method ?? 'GET', uri, decl.handler, {
        responseFormatter: decl.formatter,
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
export const buildRoutes = <State>(endpoints: StateEndpointsConfiguration<State>) => {
  const routes: RouteDef<any>[] = []
  for (const [uri, declaration] of Object.entries(endpoints)) {
    const declaredRoutes = buildDeclaredEndpointRoutes(uri, declaration)
    routes.push(...declaredRoutes)
  }

  return routes
}
