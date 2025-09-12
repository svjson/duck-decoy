import { OpenAPIV3 } from 'openapi-types'
import { DecoyServer, RouteDef } from 'duck-decoy'
import { RouteDocumentation } from '../../duck-decoy/dist/src/route/types'

/**
 * Generate an OpenAPI json description of the API exposed by DecoyServer
 * instance `server`.
 *
 * This function is used by the `duckDecoySwaggerPlugin` to generate the
 * `openapi.json` endpoint.
 *
 * @param server The DecoyServer instance to generate the OpenAPI description for
 *
 * @return An OpenAPI v3.1 Document object
 */
export const makeOpenAPIDoc = (server: DecoyServer<any>) => {
  return {
    openapi: '3.1.0',
    info: {
      title: '',
      description: '',
      version: '0.1.0',
    },
    ...makeOpenAPIServersEntry(server),
    components: {
      schemas: {},
    },
    paths: makeOpenAPIPathConfig(server),
  } satisfies OpenAPIV3.Document
}

/**
 * Determine if a route should be included in the OpenAPI documentation.
 * Routes with `docs.ignore` set to `true` are excluded.
 *
 * This can be used to avoid listing endpoints that are not part of the
 * DecoyServer API in the generated openapi.json. For example, the
 * swagger/openapi endpoints themselves use this.
 *
 * @param route The route definition to check
 * @return `true` if the route should be included, `false` otherwise
 */
const shouldInclude = (route: RouteDef<any>) => {
  return route.docs?.ignore !== true
}

/**
 * Generate an object container the root-level `servers` entry of
 * openapi.json.
 *
 * This is required for any DecoyServer instance that is configured
 * with a `root` url.
 *
 * @param server The DecoyServer instance to generate the servers entry for
 *
 * @return An object containing the `servers` entry if the server has a
 *         `root` url, or an empty object otherwise.
 */
const makeOpenAPIServersEntry = (server: DecoyServer<any>) => {
  if (server.root) {
    return {
      servers: [
        {
          url: server.root,
        },
      ] satisfies OpenAPIV3.ServerObject[],
    }
  }
  return {}
}

/**
 * Generate the `paths` section of the openapi.json document.
 *
 * This function iterates over all routes defined in the DecoyServer
 * instance and constructs a corresponding OpenAPI PathItemObject for
 * each route.
 *
 * Routes with `docs.ignore` set to `true` are excluded.
 *
 * @param server The DecoyServer instance to generate the paths for
 * @return An object mapping path strings to OpenAPI PathItemObjects
 */
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

/**
 * Generate a collection of OpenAPI ParameterObjects for the
 * `parameters` entry of an OpenAPI OperationObject.
 *
 * This function inspects the `docs.queryParameters` entry of
 * the supplied RouteDocumentation object and generates
 * a ParameterObject for each entry.
 *
 * @param docs The RouteDocumentation object to extract query parameters from
 * @return An array of OpenAPI ParameterObjects
 */
const makePathParameterCollection = (docs?: RouteDocumentation) => {
  const params: OpenAPIV3.ParameterObject[] = []

  for (const [param, _paramCfg] of Object.entries(docs?.queryParameters ?? {})) {
    params.push({ name: param, in: 'query' })
  }

  return params
}
