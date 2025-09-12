import { DuckDecoyHttpTransport, makeDecoyServer } from 'duck-decoy'
import { describe, it, expect } from 'vitest'
import { EndpointHandlerParams } from '../../duck-decoy/dist/src/endpoint'
import { makeOpenAPIDoc } from '@src/index'
import { OpenAPIV3 } from 'openapi-types'

describe('makeOpenAPIDoc', () => {
  it('should generate an openapi.json data structure from DuckDecoy instance', async () => {
    // Given
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
    const openApiDoc = makeOpenAPIDoc(server)

    // Then
    expect(openApiDoc).toEqual({
      openapi: '3.1.0',
      components: {
        schemas: {},
      },
      info: {
        description: '',
        title: '',
        version: '0.1.0',
      },
      paths: {
        '/auth/session': {
          post: {
            description: '',
            responses: {},
            summary: '',
            tags: [],
            parameters: [],
          },
        },
      },
    } satisfies OpenAPIV3.Document<any>)
  })

  it('should add server-section if the DuckDecoy instance has defined a root url', async () => {
    // Given
    const server = await makeDecoyServer({
      impl: { registerRoute: () => null } as unknown as DuckDecoyHttpTransport,
      root: '/secret/service',
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
    const openApiDoc = makeOpenAPIDoc(server)

    // Then
    expect(openApiDoc).toEqual({
      openapi: '3.1.0',
      components: {
        schemas: {},
      },
      servers: [
        {
          url: '/secret/service',
        },
      ],
      info: {
        description: '',
        title: '',
        version: '0.1.0',
      },
      paths: {
        '/auth/session': {
          post: {
            description: '',
            responses: {},
            summary: '',
            tags: [],
            parameters: [],
          },
        },
      },
    } satisfies OpenAPIV3.Document<any>)
  })

  describe('Query Parameters', () => {
    it('should generate paremeter entries for queryParameters', async () => {
      // Given
      const server = await makeDecoyServer({
        impl: { registerRoute: () => null } as unknown as DuckDecoyHttpTransport,
        endpoints: {
          '/auth/session': {
            method: 'GET',
            docs: {
              queryParameters: {
                ID: 'string',
                hash: 'string',
              },
            },
            handler: async ({ response }: EndpointHandlerParams) => {
              response.encode()
            },
          },
        },
      })

      // When
      const openApiDoc = makeOpenAPIDoc(server)

      // Then
      expect(openApiDoc).toEqual({
        openapi: '3.1.0',
        components: {
          schemas: {},
        },
        info: {
          description: '',
          title: '',
          version: '0.1.0',
        },
        paths: {
          '/auth/session': {
            get: {
              description: '',
              parameters: [
                {
                  name: 'ID',
                  in: 'query',
                },
                {
                  name: 'hash',
                  in: 'query',
                },
              ],
              responses: {},
              summary: '',
              tags: [],
            },
          },
        },
      } satisfies OpenAPIV3.Document<any>)
    })
  })
})
