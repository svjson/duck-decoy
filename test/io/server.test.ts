import { afterEach, describe, expect, it } from 'vitest'
import { DecoyServer, makeDecoyServer } from '@src/server'
import { makeTestClient } from '../http-client-fixtures'

describe('Decoy Server', () => {
  describe('Simple Config', () => {
    let server: DecoyServer<any> | null

    afterEach(async () => {
      if (server) {
        server.shutdown()
      }
    })

    it('should start a server that responds to GET with preconfigured payload', async () => {
      // Given
      const successPayload = {
        status: 'success',
        message: 'This is a test message',
      }

      server = await makeDecoyServer({
        endpoints: {
          'success-message': successPayload,
        },
      })

      // When
      await server.start()
      const client = await makeTestClient(server)
      const getResponse = await client.get('success-message')

      // Then
      expect(getResponse.status).toBe(200)
      expect(getResponse.data).toEqual(successPayload)
    })
  })
})
