import { HTTP_ADAPTERS } from '../../adapters'

import { beforeAll, describe, it, expect } from 'vitest'

import { DecoyServer } from 'duck-decoy'
import { makeTestClient, TestHttpClient } from '../../http-client-fixtures'
import { makeBoITService } from './service'
import { duckDecoySwaggerPlugin } from '@duck-decoy/swagger'

HTTP_ADAPTERS.forEach((transport) => {
  describe.sequential(`${transport.name} - BoIT Service Example with Swagger`, () => {
    let service: DecoyServer<any>
    let client: TestHttpClient

    beforeAll(async () => {
      service = await makeBoITService(new transport(), [duckDecoySwaggerPlugin()])
      client = await makeTestClient(service)
    })

    describe('Swagger UI', () => {
      it('should expose swagger UI index.html at /docs/', async () => {
        // When
        const response = await client.get('docs/')

        // Then
        expect(response.status).toEqual(200)
      })

      it('should expose swagger UI index.js at /docs/index.js', async () => {
        // When
        const response = await client.get('docs/index.js')

        // Then
        expect(response.status).toEqual(200)
      })
    })

    describe('openapi.json', () => {
      it('should generate and expose an openapi.json containing all BoIT endpoints', async () => {
        // When
        const response = await client.get('docs/json')

        // Then
        expect(response.status).toEqual(200)
        expect(response.data).toEqual({
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
            '/Book': {
              get: {
                description: '',
                responses: {},
                summary: '',
                tags: [],
                parameters: [],
              },
            },
            '/GetCalendarData': {
              get: {
                description: '',
                responses: {},
                summary: '',
                tags: [],
                parameters: [],
              },
            },
            '/GetCustomerBookings': {
              get: {
                description: '',
                responses: {},
                summary: '',
                tags: [],
                parameters: [],
              },
            },
            '/GetCustomerResources': {
              get: {
                description: '',
                responses: {},
                summary: '',
                tags: [],
                parameters: [],
              },
            },
            '/Login': {
              get: {
                description: '',
                responses: {},
                summary: '',
                tags: [],
                parameters: [
                  {
                    name: 'Customer',
                    in: 'query',
                  },
                  {
                    name: 'Timestamp',
                    in: 'query',
                  },
                  {
                    name: 'Hash',
                    in: 'query',
                  },
                ],
              },
            },
          },
        })
      })
    })
  })
})
