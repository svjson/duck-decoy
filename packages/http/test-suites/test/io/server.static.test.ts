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

      it('should serve a full static root directory when no file pattern is provided', async () => {
        // Given
        server = await makeDecoyServer({
          impl: new transport(),
          autostart: true,
          routes: [
            {
              routeId: 'static',
              path: '/project/',
              method: 'GET',
              staticRoot: PACKAGE_ROOT,
            },
          ],
        })
        client = await makeTestClient(server)

        // When
        const responses: Record<string, any> = {}
        for (const file of ['package.json', 'tsconfig.json', 'test/adapters.ts']) {
          const { data, status, headers } = await client.get(`project/${file}`)
          responses[file] = {
            status,
            data,
            headers,
          }
        }

        // Then
        expect(responses).toEqual({
          'package.json': expect.objectContaining({
            status: 200,
            data: JSON.parse(
              await fs.readFile(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')
            ),
          }),
          'tsconfig.json': expect.objectContaining({
            status: 200,
            data: JSON.parse(
              await fs.readFile(path.join(PACKAGE_ROOT, 'tsconfig.json'), 'utf8')
            ),
          }),
          'test/adapters.ts': expect.objectContaining({
            status: 200,
            data: await fs.readFile(
              path.join(PACKAGE_ROOT, 'test', 'adapters.ts'),
              'utf8'
            ),
          }),
        })
      })
    })
  })
})
