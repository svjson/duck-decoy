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
          },
        },
      },
    } satisfies OpenAPIV3.Document<any>)
  })
})
