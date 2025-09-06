import path from 'node:path'
import fs from 'node:fs/promises'
import { afterAll, afterEach, beforeAll, describe, expect, it, test } from 'vitest'

import { HTTP_ADAPTERS } from '../adapters'
import { DecoyServer, makeDecoyServer } from 'duck-decoy'
import { makeTestClient, TestHttpClient } from 'test/http-client-fixtures'

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '../../')

describe('Decoy Server', () => {
  HTTP_ADAPTERS.forEach((transport) => {
    describe(`${transport.name} - Static Endpoints`, () => {
      let server: DecoyServer<any>
      let client: TestHttpClient

      afterEach(async () => {
        await server.shutdown()
      })

      test('Static file endpoint', async () => {
        // Given
        server = await makeDecoyServer({
          impl: new transport(),
          autostart: true,
          routes: [
            {
              routeId: 'package.json',
              path: '/project/package.json',
              method: 'GET',
              staticRoot: PACKAGE_ROOT,
              filePattern: 'package.json',
            },
          ],
        })
        client = await makeTestClient(server)

        // When
        const response = await client.get('project/package.json')

        // Then
        expect(response.data).toEqual(
          JSON.parse(await fs.readFile(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
        )
      })
    })
  })
})
