import { HTTP_ADAPTERS } from '../../adapters'

import { beforeAll, describe, it, expect } from 'vitest'

import { DecoyServer } from 'duck-decoy'
import { makeTestClient, TestHttpClient } from '../../http-client-fixtures'
import { PSK, CUSTOMER_ID_1, CUSTOMER_ID_2, CUSTOMER_ID_3 } from './state'
import { generateHash, makeBoITService } from './service'

HTTP_ADAPTERS.forEach((transport) => {
  describe.sequential(`${transport.name} - BoIT Service Example`, () => {
    let service: DecoyServer<any>
    let client: TestHttpClient

    const authenticatedTokenFor = async (customerId: string) => {
      const token = generateHash(PSK, [customerId, new Date().toLocaleString()])
      await service.state.validTokens.insert({
        customerId,
        token,
      })
      return token
    }

    beforeAll(async () => {
      service = await makeBoITService(new transport())
      client = await makeTestClient(service)
    })

    describe('/Login - Authentication', () => {
      it('should respond with 200 and a token on a successful attempt at /Login', async () => {
        // Given
        const customerId = CUSTOMER_ID_1
        const timestamp = new Date().toLocaleString('sv-SE')

        // When
        const authResponse = await client.get('/Login', {
          params: {
            Customer: customerId,
            Timestamp: timestamp,
            Hash: generateHash(PSK, [customerId, timestamp]),
          },
        })

        // Then
        expect(authResponse.status).toBe(200)
        expect(authResponse.data).toEqual({
          Token: expect.stringMatching(/[a-zA-Z0-9_\-\*]{28,32}/),
          ApiVersion: 1,
          CompatibilityVersion: 1,
        })
      })

      it('should respond with 401 and no body on a failed attempt at /Login', async () => {
        // Given
        const customerId = 'urban-spaceman-dont-exist'
        const timestamp = new Date().toLocaleString('sv-SE')

        // When
        const authResponse = await client.get('/Login', {
          params: {
            Customer: customerId,
            Timestamp: timestamp,
            Hash: generateHash(PSK, [customerId, timestamp]),
          },
        })

        // Then
        expect(authResponse.status).toBe(401)
        expect(authResponse.data).toEqual('')
      })
    })

    describe('/GetCustomerBookings - List customer bookings', () => {
      it('should respond with an empty list at /GetCustomerBookings if customer has no bookings', async () => {
        // Given
        const authenticatedToken = await authenticatedTokenFor(CUSTOMER_ID_1)

        // When
        const bookingsResponse = await client.get('/GetCustomerBookings', {
          params: {
            Token: authenticatedToken,
          },
        })

        // Then
        expect(bookingsResponse.status).toBe(200)
        expect(bookingsResponse.data).toEqual([])
      })

      it('should respond with a list of bookings filtered by user ownership at /GetCustomerBookings', async () => {
        // Given
        const customer1BookingA = {
          id: 15,
          customerId: CUSTOMER_ID_1,
          date: '2025-08-10',
          resourceId: 432,
          timeSlotIndex: 2,
          isReleased: false,
          isUsed: false,
          isCancellable: true,
        }

        const customer2BookingA = {
          id: 19,
          customerId: CUSTOMER_ID_2,
          date: '2025-08-13',
          resourceId: 120,
          timeSlotIndex: 4,
          isReleased: false,
          isUsed: false,
          isCancellable: true,
        }

        const customer2BookingB = {
          id: 20,
          customerId: CUSTOMER_ID_2,
          date: '2025-08-16',
          resourceId: 122,
          timeSlotIndex: 1,
          isReleased: false,
          isUsed: false,
          isCancellable: true,
        }

        await service.state.bookings.insert(customer1BookingA)
        await service.state.bookings.insert(customer2BookingA)
        await service.state.bookings.insert(customer2BookingB)
        const customer1Token = await authenticatedTokenFor(CUSTOMER_ID_1)
        const customer2Token = await authenticatedTokenFor(CUSTOMER_ID_2)

        // When
        const bookingsResponseCustomer1 = await client.get('/GetCustomerBookings', {
          params: {
            Token: customer1Token,
          },
        })
        const bookingsResponseCustomer2 = await client.get('/GetCustomerBookings', {
          params: {
            Token: customer2Token,
          },
        })

        // Then
        expect(bookingsResponseCustomer1.status).toBe(200)
        expect(bookingsResponseCustomer1.data).toEqual([
          {
            BookingId: 15,
            GroupName: 'Tvätt',
            LocationName: 'Kopparv. 119',
            IsReleased: false,
            IsUsed: false,
            Unbookable: true,
            LengthInMinutes: 180,
            StartTime: '13:00',
            StopTime: '16:00',
            StartTimeStamp: '2025-08-10T13:00',
          },
        ])

        expect(bookingsResponseCustomer2.status).toBe(200)
        expect(bookingsResponseCustomer2.data).toEqual([
          {
            BookingId: 19,
            GroupName: 'Tvätt',
            LocationName: 'Tallkottev. 19',
            IsReleased: false,
            IsUsed: false,
            Unbookable: true,
            LengthInMinutes: 180,
            StartTime: '19:00',
            StopTime: '22:00',
            StartTimeStamp: '2025-08-13T19:00',
          },
          {
            BookingId: 20,
            GroupName: 'Bastu',
            LocationName: 'Granrisv. 22',
            IsReleased: false,
            IsUsed: false,
            Unbookable: true,
            LengthInMinutes: 180,
            StartTime: '10:00',
            StopTime: '13:00',
            StartTimeStamp: '2025-08-16T10:00',
          },
        ])
      })
    })

    describe('/GetCustomerResources - List bookable resources for a customer', () => {
      it('should respond with an empty array at /GetCustomerResources when customer does not have access to any bookable objects', async () => {
        // Given
        const authenticatedToken = await authenticatedTokenFor(CUSTOMER_ID_3)

        // When
        const resourcesResponse = await client.get('/GetCustomerResources', {
          params: {
            Token: authenticatedToken,
          },
        })

        // Then
        expect(resourcesResponse.status).toBe(200)
        expect(resourcesResponse.data).toEqual([])
      })

      it('should respond with array of single resource at /GetCustomerResources when customer has access to one bookable object', async () => {
        // Given
        const authenticatedToken = await authenticatedTokenFor(CUSTOMER_ID_1)

        // When
        const resourcesResponse = await client.get('/GetCustomerResources', {
          params: {
            Token: authenticatedToken,
          },
        })

        // Then
        expect(resourcesResponse.status).toBe(200)
        expect(resourcesResponse.data).toEqual([
          {
            Name: 'Tvätt',
            IconId: 15,
            Locations: [
              {
                Name: 'Kopparv. 119',
                Groups: [
                  {
                    Id: 432,
                    Name: 'Tvätt',
                    LastBookableTimeStamp: '2025-12-30T23:59:59',
                  },
                ],
              },
            ],
          },
        ])
      })

      it('should respond with array of two resources at /GetCustomerResources when customer has access to two bookable objects', async () => {
        // Given
        const authenticatedToken = await authenticatedTokenFor(CUSTOMER_ID_2)

        // When
        const resourcesResponse = await client.get('/GetCustomerResources', {
          params: {
            Token: authenticatedToken,
          },
        })

        // Then
        expect(resourcesResponse.status).toBe(200)
        expect(resourcesResponse.data).toEqual([
          {
            Name: 'Tvätt',
            IconId: 15,
            Locations: [
              {
                Name: 'Tallkottev. 19',
                Groups: [
                  {
                    Id: 120,
                    Name: 'Tvätt',
                    LastBookableTimeStamp: '2025-12-30T23:59:59',
                  },
                ],
              },
            ],
          },
          {
            Name: 'Bastu',
            IconId: 4,
            Locations: [
              {
                Name: 'Granrisv. 22',
                Groups: [
                  {
                    Id: 122,
                    Name: 'Bastu',
                    LastBookableTimeStamp: '2025-12-30T23:59:59',
                  },
                ],
              },
            ],
          },
        ])
      })
    })
    describe('/GetCalendarData - Get resource calendar availability for groups', () => {
      it('should respond with calendar availability between DateFrom and DateTo for a single group.', async () => {
        // Given
        const authenticatedToken = await authenticatedTokenFor(CUSTOMER_ID_1)

        // When
        const calendarResponse = await client.get('/GetCalendarData', {
          params: {
            Token: authenticatedToken,
            DateFrom: '2025-08-10',
            DateTo: '2025-08-12',
            Groups: '["432"]',
          },
        })

        // Then
        expect(calendarResponse.status).toBe(200)
        expect(calendarResponse.data).toEqual({
          IntervalPatterns: [
            {
              Id: 1,
              Intervals: [
                {
                  PassNo: 0,
                  StartTime: '07:00',
                  LengthInMinutes: 180,
                },
                {
                  PassNo: 1,
                  StartTime: '10:00',
                  LengthInMinutes: 180,
                },
                {
                  PassNo: 2,
                  StartTime: '13:00',
                  LengthInMinutes: 180,
                },
                {
                  PassNo: 3,
                  StartTime: '16:00',
                  LengthInMinutes: 180,
                },
                {
                  PassNo: 4,
                  StartTime: '19:00',
                  LengthInMinutes: 180,
                },
              ],
            },
          ],
          Days: [
            {
              Date: '2025-08-10',
              NumberOfCustomerBookings: 1,
              DayGroups: [
                {
                  GroupId: 432,
                  IntervalPatternId: 1,
                  BookablePasses: [
                    {
                      No: 0,
                    },
                    {
                      No: 1,
                    },
                    {
                      No: 2,
                    },
                    {
                      No: 3,
                    },
                    {
                      No: 4,
                    },
                  ],
                  CustomerBookings: [
                    {
                      BookingId: 15,
                      PassNo: 2,
                      Unbookable: true,
                    },
                  ],
                },
              ],
            },

            {
              Date: '2025-08-11',
              NumberOfCustomerBookings: 0,
              DayGroups: [
                {
                  GroupId: 432,
                  IntervalPatternId: 1,
                  BookablePasses: [
                    {
                      No: 0,
                    },
                    {
                      No: 1,
                    },
                    {
                      No: 2,
                    },
                    {
                      No: 3,
                    },
                    {
                      No: 4,
                    },
                  ],
                  CustomerBookings: [],
                },
              ],
            },

            {
              Date: '2025-08-12',
              NumberOfCustomerBookings: 0,
              DayGroups: [
                {
                  GroupId: 432,
                  IntervalPatternId: 1,
                  BookablePasses: [
                    {
                      No: 0,
                    },
                    {
                      No: 1,
                    },
                    {
                      No: 2,
                    },
                    {
                      No: 3,
                    },
                    {
                      No: 4,
                    },
                  ],
                  CustomerBookings: [],
                },
              ],
            },
          ],
        })
      })
    })

    describe('/Book', () => {
      it('should respond with booking details when a valid booking is made', async () => {
        // Given
        const authenticatedToken = await authenticatedTokenFor(CUSTOMER_ID_1)

        // When
        const bookResponse = await client.get('/Book', {
          params: {
            Token: authenticatedToken,
            customerId: CUSTOMER_ID_1,
            MaxWaitSeconds: 10,
            StartTimeStamp: '2025-08-10T10:00:00',
            LengthInMinutes: 180,
          },
        })

        // Then
        expect(bookResponse.status).toBe(200)
        expect(bookResponse.data).toEqual({
          BookingId: '1',
          ObjectName: 'Tvätt',
          UnBookable: true,
        })
      })
    })
  })
})
