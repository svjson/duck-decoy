import { OpenAPIV3 } from 'openapi-types'
import { DecoyServer, RouteDef } from 'duck-decoy'
import { RouteDocumentation } from '../../duck-decoy/dist/src/route/types'

export const makeOpenAPIDoc = (server: DecoyServer<any>) => {
  return {
    openapi: '3.1.0',
    info: {
      title: '',
      description: '',
      version: '0.1.0',
    },
    components: {
      schemas: {},
    },
    paths: makeOpenAPIPathConfig(server),
  } satisfies OpenAPIV3.Document
}

const shouldInclude = (route: RouteDef<any>) => {
  return route.docs?.ignore !== true
}

const makeOpenAPIPathConfig = (server: DecoyServer<any>) => {
  return server.routes.reduce(
    (paths, route) => {
      if (shouldInclude(route)) {
        ;(paths[route.path] ??= {} as OpenAPIV3.PathItemObject)[
          OpenAPIV3.HttpMethods[route.method]
        ] = {
          summary: '',
          tags: [],
          description: '',
          responses: {} as OpenAPIV3.ResponsesObject,
          parameters: makePathParameterCollection(route.docs),
        } as OpenAPIV3.OperationObject
      }
      return paths
    },
    {} as Record<string, OpenAPIV3.PathItemObject>
  )
}

const makePathParameterCollection = (docs?: RouteDocumentation) => {
  const params: OpenAPIV3.ParameterObject[] = []

  for (const [param, paramCfg] of Object.entries(docs?.queryParameters ?? {})) {
    params.push({ name: param, in: 'query' })
  }

  return params
}
