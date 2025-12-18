import { duckDecoySwaggerPlugin } from '@src/index'
import {
  DuckDecoyHttpTransport,
  EndpointHandlerParams,
  makeDecoyServer,
} from 'duck-decoy'
import { existsSync } from 'node:fs'
import path from 'node:path'
import swaggerUiDist from 'swagger-ui-dist'
import { describe, expect, it } from 'vitest'

describe('makePluginRoutes', () => {
  it('should generate routes for openapi.json and Swagger UI', async () => {
    // Given
    const distRoot = swaggerUiDist.getAbsoluteFSPath()
    const server = await makeDecoyServer({
      impl: { registerRoute: () => null } as unknown as DuckDecoyHttpTransport,
      endpoints: {
        '/auth/session': {
          method: 'POST',
          handler: async ({ response }: EndpointHandlerParams) => {
            response.encode()
          },
        },
      },
    })

    // When
    const plugin = duckDecoySwaggerPlugin()
    const swaggerRoutes = plugin.makePluginRoutes(server)

    // Then
    expect(swaggerRoutes).toEqual([
      {
        routeId: 'openapi.json-GET',
        path: '/docs/json',
        method: 'GET',
        docs: { ignore: true },
        handler: expect.any(Function),
      },
      {
        routeId: 'swagger-initializer.js-GET',
        path: '/docs/swagger-initializer.js',
        method: 'GET',
        docs: { ignore: true },
        handler: expect.any(Function),
      },
      {
        routeId: 'swagger',
        path: '/docs',
        method: 'GET',
        docs: { ignore: true },
        staticRoot: distRoot,
        index: true,
      },
    ])
    expect(existsSync(path.join(distRoot, 'index.js')))
  })
})
