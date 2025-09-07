import { describe, expect, it } from 'vitest'
import { makeDecoyServer, preHandlerEnabled, RequestPreHandler } from '@src/index'
import { EndpointsConfiguration, EndpointHandlerParams } from '@src/endpoint'
import { TestHttpTransport } from '../transport-fixtures'

describe('preHandlerEnabled', () => {
  describe('Single explicit Exclude-rule', () => {
    it.each([
      ['/api/Login', false],
      ['/api/Book', true],
      ['/', true],
      ['/api/', true],
    ])('%s should test %o', (uri, expected) => {
      // Given
      const preHandler: RequestPreHandler<any> = {
        exclude: ['/api/Login'],
        handler: async (_params) => {},
      }

      // Then
      expect(preHandlerEnabled(preHandler, uri)).toBe(expected)
    })
  })

  describe('Single pattern/wildcard Exclude-rule', () => {
    it.each([
      ['/api/docs/', false],
      ['/api/docs/index.html', false],
      ['/', true],
      ['/docs/', true],
      ['/docs/index.html', true],
    ])('%s should test %o', (uri, expected) => {
      // Given
      const preHandler: RequestPreHandler<any> = {
        exclude: ['/api/docs/*'],
        handler: async (_params) => {},
      }

      // Then
      expect(preHandlerEnabled(preHandler, uri)).toBe(expected)
    })
  })
})

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
          handler: async ({ response }: EndpointHandlerParams) => {
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
