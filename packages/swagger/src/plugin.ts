/// <reference lib="dom" />
import { DecoyServer, DuckDecoyPlugin, RouteDef, urlpath } from 'duck-decoy'
import { makeOpenAPIDoc } from './openapi'
import { OpenAPIV3 } from 'openapi-types'
import swaggerUiDist from 'swagger-ui-dist'

export interface SwaggerPluginParams {
  rootPath?: string
}

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

export interface DuckDecoySwagger extends DuckDecoyPlugin {}
