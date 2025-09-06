import { describe, expect, it } from 'vitest'
import { makeDecoyServer } from '@src/index'
import { EndpointsConfiguration, EndpointHandlerParams } from '@src/endpoint'
import { TestHttpTransport } from '../transport-fixtures'

describe('makeDecoyServer', () => {
  it('should expose configured endpoints as routes after construction', async () => {
    // Given
    const transport = new TestHttpTransport()

    // When
    const server = await makeDecoyServer({
      impl: transport,
      endpoints: {
        '/auth/session': {
          method: 'POST',
          handler: async ({ request, response, state }: EndpointHandlerParams) => {
            response.encode()
          },
        },
      } satisfies EndpointsConfiguration<any>,
    })

    // Then
    expect(server.routes).toEqual([
      {
        routeId: '/auth/session-POST',
        method: 'POST',
        path: '/auth/session',
        handler: expect.any(Function),
        responseFormatter: undefined,
      },
    ])
  })

  it('should expose configured routes after construction', async () => {
    // Given
    const transport = new TestHttpTransport()

    // When
    const server = await makeDecoyServer({
      impl: transport,
      routes: [
        {
          routeId: '/auth/session-POST',
          method: 'POST',
          path: '/auth/session',
          handler: async ({ response }: EndpointHandlerParams) => {
            response.encode()
          },
          responseFormatter: undefined,
        },
      ],
    })

    // Then
    expect(server.routes).toEqual([
      {
        routeId: '/auth/session-POST',
        method: 'POST',
        path: '/auth/session',
        handler: expect.any(Function),
        responseFormatter: undefined,
      },
    ])
  })
})
