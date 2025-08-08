import { FastifyRequest, FastifyReply } from 'fastify'
import { EndpointConfiguration, StateEndpointsConfiguration } from './state'
import { RouteDef } from './types'
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

const buildDeclaredEndpointRoutes = (
  uri: string,
  declaration: EndpointConfiguration
): RouteDef<any>[] => {
  if (Array.isArray(declaration)) {
    return buildCRUDRoutes(uri, declaration)
  }

  return [
    {
      routeId: `${uri}-GET`,
      method: 'GET',
      path: formatUri(uri),
      handler: async ({ reply }) => {
        reply.code(200).send(declaration)
      },
    },
  ]
}

export const buildRoutes = (endpoints: StateEndpointsConfiguration) => {
  const routes: RouteDef<any>[] = []
  for (const [uri, declaration] of Object.entries(endpoints)) {
    const declaredRoutes = buildDeclaredEndpointRoutes(uri, declaration)
    routes.push(...declaredRoutes)
  }

  return routes
}
