import { HTTP_ADAPTERS } from '../adapters'

import { DecoyServer, makeDecoyServer } from 'duck-decoy'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTestClient } from '../http-client-fixtures'

HTTP_ADAPTERS.forEach((transport) => {
  describe('Decoy Server', () => {
    describe.sequential('Simple Config', () => {
      let server!: DecoyServer<any>
      const simpleSuccessPayload = {
        status: 'success',
        message: 'This is a test message',
      }

      afterEach(async () => {
        if (server) {
          await server.shutdown()
        }
      })

      it('should start a server that responds to GET with preconfigured payload', async () => {
        // Given
        server = await makeDecoyServer({
          impl: new transport(),
          endpoints: {
            'success-message': simpleSuccessPayload,
          },
        })

        await server.start()

        // When
        const client = await makeTestClient(server)
        const getResponse = await client.get('success-message')

        // Then
        expect(getResponse.status).toBe(200)
        expect(getResponse.data).toEqual(simpleSuccessPayload)
      })

      it('should start a server that responds using a function handler', async () => {
        // Given
        server = await makeDecoyServer({
          impl: new transport(),
          endpoints: {
            'success-message': async ({ response }) => {
              response.status(200).body(simpleSuccessPayload)
            },
          },
        })
        await server.start()

        // When
        const client = await makeTestClient(server)
        const getResponse = await client.get('success-message')

        // Then
        expect(getResponse.status).toBe(200)
        expect(getResponse.data).toEqual(simpleSuccessPayload)
      })

      it('should start a server that responds using a function handler and response formatter', async () => {
        // Given
        server = await makeDecoyServer({
          impl: new transport(),
          autostart: true,
          endpoints: {
            'success-message': {
              formatter: async ({ payload }) => {
                return Object.entries(payload).reduce((result, [key, value]) => {
                  result[(key as string).toUpperCase()] = (value as string).toLowerCase()
                  return result
                }, {} as any)
              },
              handler: async ({ response }) => {
                response.status(200).body(simpleSuccessPayload)
              },
            },
          },
        })

        // When
        const client = await makeTestClient(server)
        const getResponse = await client.get('success-message')

        // Then
        expect(getResponse.status).toBe(200)
        expect(getResponse.data).toEqual({
          STATUS: 'success',
          MESSAGE: 'this is a test message',
        })
      })
    })
  })
})
