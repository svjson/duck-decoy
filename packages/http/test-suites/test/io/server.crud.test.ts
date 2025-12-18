import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { HTTP_ADAPTERS } from '../adapters'

import { DecoyServer, makeDecoyServer } from 'duck-decoy'
import { makeTestClient, TestHttpClient } from '../http-client-fixtures'
import { ANIMAL_SPECIES_RECORDS } from '../record-fixtures'

describe('Decoy Server', () => {
  HTTP_ADAPTERS.forEach((transport) => {
    describe(`${transport.name} - CRUD Endpoints`, () => {
      describe('Zero Config CRUD Endpoint', { sequential: true }, () => {
        let server: DecoyServer<any>
        let client: TestHttpClient

        beforeAll(async () => {
          server = await makeDecoyServer({
            impl: new transport(),
            autostart: true,
            endpoints: {
              species: ANIMAL_SPECIES_RECORDS,
            },
          })
          client = await makeTestClient(server)
        })

        afterAll(async () => {
          await server.shutdown()
        })

        afterEach(async () => {
          await server.reset({ log: true })
        })

        ANIMAL_SPECIES_RECORDS.forEach((record) => {
          it(`should respond with record with ID=${record.id}("${record.name}") at GET /species/${record.id}`, async () => {
            // When
            const response = await client!.get(`species/${record.id}`)

            // Then
            expect(response.status).toBe(200)
            expect(response.data).toEqual(record)

            expect(server.requestLog.statusCodes()).toEqual([200])
            expect(server.requestLog.byRouteId('species-GET(id)')).toHaveLength(1)
          })
        })

        it('should respond with 404 at GET /species/10', async () => {
          // When
          const response = await client!.get(`species/10`)

          // Then
          expect(response.status).toBe(404)
          expect(response.data).toBeFalsy()

          expect(server.requestLog.statusCodes()).toEqual([404])
          expect(server.requestLog.byRouteId('species-GET(id)')).toHaveLength(1)
        })

        it('should accept a POST to create a new record at /species', async () => {
          // Given
          const payload = {
            name: 'Zebra',
            class: 'Mammalia',
            diet: 'Herbivore',
            legs: 4,
          }

          // When
          const response = await client!.post(`species`, payload)

          // Then
          expect(response.status).toBe(201)
          expect(response.data).toEqual({
            ...payload,
            id: 6,
          })

          expect(server.requestLog.statusCodes()).toEqual([201])
          expect(server.requestLog.byRouteId('species-POST')).toHaveLength(1)
        })

        it('should accept a PUT to update a record at /species/4', async () => {
          // Given
          const payload = {
            name: 'Three-legged Ribbet-Ribbet Sound Maker',
            class: 'Amphibia',
            diet: 'Carnivore',
            legs: 3,
          }

          // When
          const response = await client!.put(`species/4`, payload)

          // Then
          expect(response.status).toBe(200)
          expect(response.data).toEqual({
            ...payload,
            id: 4,
          })

          expect(server.requestLog.statusCodes()).toEqual([200])
          expect(server.requestLog.byRouteId('species-PUT(id)')).toHaveLength(1)
        })

        it('should accept a request to DELETE a record at /species/2', async () => {
          // When
          const response = await client!.delete('species/2')

          // Then
          expect(response.status).toBe(204)

          expect(server.requestLog.statusCodes()).toEqual([204])
          expect(server.requestLog.byRouteId('species-DELETE(id)')).toHaveLength(1)
        })

        it('should now serve the created, updated and remaining records at /species', async () => {
          // When
          const response = await client!.get('species')

          // Then
          expect(response.status).toBe(200)
          expect(response.data).toEqual([
            ANIMAL_SPECIES_RECORDS[0],
            // ANIMAL_SPECIES_RECORDS[1] was DELETED
            ANIMAL_SPECIES_RECORDS[2],
            {
              id: 4,
              name: 'Three-legged Ribbet-Ribbet Sound Maker',
              class: 'Amphibia',
              diet: 'Carnivore',
              legs: 3,
            },
            ANIMAL_SPECIES_RECORDS[4],
            {
              id: 6,
              name: 'Zebra',
              class: 'Mammalia',
              diet: 'Herbivore',
              legs: 4,
            },
          ])

          expect(server.requestLog.statusCodes()).toEqual([200])
          expect(server.requestLog.byRouteId('species-GET')).toHaveLength(1)
        })
      })
    })
  })
})
