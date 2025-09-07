/// <reference lib="dom" />
import { DecoyServer, DuckDecoyPlugin, RouteDef } from 'duck-decoy'
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
