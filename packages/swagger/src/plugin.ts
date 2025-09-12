/// <reference lib="dom" />
import { DecoyServer, DuckDecoyPlugin, RouteDef, urlpath } from 'duck-decoy'
import { makeOpenAPIDoc } from './openapi'
import { OpenAPIV3 } from 'openapi-types'
import swaggerUiDist from 'swagger-ui-dist'

/**
 * Configuration options for the `duckDecoySwaggerPlugin`.
 */
export interface SwaggerPluginParams {
  rootPath?: string
}

/**
 * A DuckDecoy plugin that adds routes to serve the OpenAPI json description
 * of the API as well as a Swagger UI to explore and interact with the API.
 *
 * The plugin adds the following routes:
 * - `{rootPath}/json`: Serves the OpenAPI json document
 * - `{rootPath}/swagger-initializer.js`: Serves the Swagger UI initializer script
 * - `{rootPath}/`: Serves the Swagger UI static files
 *
 * By default, the Swagger UI is served at `/docs`. This can be changed by
 * providing a different `rootPath` when initializing the plugin.
 *
 * Example usage:
 * ```ts
 * import { DecoyServer, duckDecoySwaggerPlugin } from 'duck-decoy'
 *
 * const server = new DecoyServer({
 *   ...,
 *   plugins: [duckDecoySwaggerPlugin({ rootPath: '/api-docs' })],
 *   ...
 * })
 * ```
 *
 * @param params Configuration options for the plugin
 * @return A DuckDecoy plugin instance
 */
export const duckDecoySwaggerPlugin = ({
  rootPath = '/docs',
}: SwaggerPluginParams = {}) => {
  let openApiJSON: OpenAPIV3.Document

  return {
    makePluginRoutes: (server: DecoyServer<any>): RouteDef<any>[] => {
      return [
        {
          routeId: 'openapi.json-GET',
          method: 'GET',
          path: `${rootPath}/json`,
          docs: {
            ignore: true,
          },
          handler: async ({ response }) => {
            if (!openApiJSON) {
              openApiJSON = makeOpenAPIDoc(server)
            }
            response.status(200).body(openApiJSON).encode()
          },
        },
        {
          routeId: 'swagger-initializer.js-GET',
          method: 'GET',
          path: `${rootPath}/swagger-initializer.js`,
          docs: {
            ignore: true,
          },
          handler: async ({ response }) => {
            const initializerBody = [
              'window.onload = () => {',
              '  window.ui = SwaggerUIBundle({',
              `    url: '${urlpath.join(server.root, rootPath, 'json')}',`,
              "    dom_id: '#swagger-ui',",
              '    deepLinking: true',
              '  });',
              '};',
            ].join('\n')

            response.status(200).body(initializerBody).encode()
          },
        },
        {
          routeId: 'swagger',
          path: rootPath,
          docs: {
            ignore: true,
          },
          method: 'GET',
          index: true,
          staticRoot: swaggerUiDist.getAbsoluteFSPath(),
        },
      ]
    },
  }
}

/**
 * Type alias for a DuckDecoy plugin instance created by `duckDecoySwaggerPlugin`.
 */
export interface DuckDecoySwagger extends DuckDecoyPlugin {}
