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

      describe('request logging', async () => {
        it('requests are logged and can be retrieved by key', async () => {
          // Given
          server = await makeDecoyServer({
            impl: new transport(),
            endpoints: {
              'success-message': simpleSuccessPayload,
            },
          })
          await server.start()
          const client = await makeTestClient(server)

          // When
          await client.get('success-message')

          // Then
          const expectedLogEntry = {
            path: '/success-message',
            pattern: '/success-message',
            queryParams: {},
            routeId: 'success-message-GET',
            statusCode: 200,
          }

          expect(server.requestLog.entries.length).toBe(1)
          expect(server.requestLog.byRouteId('success-message-GET')).toEqual([
            expectedLogEntry,
          ])
          expect(server.requestLog.statusCodes()).toEqual([200])
        })
      })

      describe('reset', () => {
        it('should clear request log entries on no-arg invocation', async () => {
          // Given
          server = await makeDecoyServer({
            impl: new transport(),
            endpoints: {
              'success-message': simpleSuccessPayload,
            },
          })
          await server.start()
          const client = await makeTestClient(server)
          await client.get('success-message')

          // When
          await server.reset()

          // Then
          expect(server.requestLog.entries.length).toBe(0)
        })

        it('should clear request log entries on { log: true } invocation', async () => {
          // Given
          server = await makeDecoyServer({
            impl: new transport(),
            endpoints: {
              'success-message': simpleSuccessPayload,
            },
          })
          await server.start()
          const client = await makeTestClient(server)
          await client.get('success-message')

          // When
          await server.reset({ log: true })

          // Then
          expect(server.requestLog.entries.length).toBe(0)
        })

        it('should not clear request log entries on { log: false } invocation', async () => {
          // Given
          server = await makeDecoyServer({
            impl: new transport(),
            endpoints: {
              'success-message': simpleSuccessPayload,
            },
          })
          await server.start()
          const client = await makeTestClient(server)
          await client.get('success-message')

          // When
          await server.reset({ log: false })

          // Then
          expect(server.requestLog.entries.length).toBe(1)
        })

        it('should not clear request log entries on state-only invocation', async () => {
          // Given
          server = await makeDecoyServer({
            impl: new transport(),
            endpoints: {
              'success-message': simpleSuccessPayload,
            },
          })
          await server.start()
          const client = await makeTestClient(server)
          await client.get('success-message')

          // When
          await server.reset({ state: { someKey: true } })

          // Then
          expect(server.requestLog.entries.length).toBe(1)
        })
      })
    })
  })
})
