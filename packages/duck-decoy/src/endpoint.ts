import {
  EndpointDeclaration,
  EndpointConfiguration,
  StateEndpointsConfiguration,
  EndpointResponseFormatter,
} from './state'
import { EndpointHandler, HttpMethod, RouteDef } from './types'
import { ArrayCollection, RecordCollection } from './collection'
import { ResourceRouteBuilder } from './resource'

export const formatUri = (uri: string) => {
  if (!uri.startsWith('/')) return `/${uri}`
  return uri
}

const buildCRUDRoutes = (uri: string, records: any[]): RouteDef<any>[] => {
  const builder = new ResourceRouteBuilder(uri, new ArrayCollection(records), 'id')

  return builder.coreCrudRoutes().build()
}

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

export const buildRoutes = <State>(endpoints: StateEndpointsConfiguration<State>) => {
  const routes: RouteDef<any>[] = []
  for (const [uri, declaration] of Object.entries(endpoints)) {
    const declaredRoutes = buildDeclaredEndpointRoutes(uri, declaration)
    routes.push(...declaredRoutes)
  }

  return routes
}
