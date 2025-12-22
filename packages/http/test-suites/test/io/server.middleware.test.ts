import { HTTP_ADAPTERS } from '../adapters'

import { DecoyServer, makeDecoyServer } from 'duck-decoy'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTestClient } from '../http-client-fixtures'

HTTP_ADAPTERS.forEach((transport) => {
  describe('Decoy Server', () => {
    describe.sequential('Middleware (preHandler/responseFormatter)', () => {
      describe('Execution order', () => {
        let server!: DecoyServer<any>

        afterEach(async () => {
          if (server) {
            await server.shutdown()
          }
        })

        it('should execute handler methods in the correct order', async () => {
          // Given
          server = await makeDecoyServer({
            impl: new transport(),
            preHandlers: [
              {
                handler: async ({ request }) => {
                  ;(request.context.applied ??= []).push('global prehandler')
                },
              },
            ],
            endpoints: {
              'test-endpoint': {
                preHandler: async ({ request }) => {
                  ;(request.context.applied ??= []).push('local prehandler')
                },
                formatter: async ({ payload, response }) => {
                  payload.applied.push('response formatter')
                  return payload
                },
                handler: async ({ request, response }) => {
                  response.status(200).body({
                    applied: [...request.context.applied, 'route handler'],
                  })
                },
              },
            },
          })

          await server.start()

          // When
          const client = await makeTestClient(server)
          const getResponse = await client.get('test-endpoint')

          // Then
          expect(getResponse.data).toEqual({
            applied: [
              'global prehandler',
              'local prehandler',
              'route handler',
              'response formatter',
            ],
          })
        })
      })
    })
  })
})
