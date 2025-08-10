import { createHmac } from 'node:crypto'

import { datesBetween, DuckDecoyHttpTransport, makeDecoyServer } from 'duck-decoy'

import { boitState, PSK } from './state'
import { BoITBooking, BoITResourceGroup, BoITTimeSlot } from './types'

export const generateHash = (psk: string, parts: string[]) => {
  const signature = createHmac('sha1', psk).update(parts.join('')).digest()

  const hash = signature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '*')

  return hash
}

export const makeBoITService = async (transport: DuckDecoyHttpTransport) => {
  return await makeDecoyServer({
    impl: transport,
    autostart: true,
    root: '/bookingservice/bookingservice.svc',
    state: boitState,
    preHandlers: [
      {
        exclude: ['/Login'],
        handler: async ({ request, response, state }) => {
          const { Token } = request.queryParameters
          const auth = Token ? await state.validTokens.findOne(Token) : null

          if (auth) {
            request.context['customerId'] = auth.customerId
            request.context['resources'] = (await state.customers.findOne(
              auth.customerId
            ))!.resources
          } else {
            await response.status(401).body().encode()
          }
        },
      },
    ],
    endpoints: {
      '/Login': async ({ request, response, state }) => {
        // FIXME: Validate hash
        const customerId = request.queryParameters.Customer
        const valid = await state.customers.findOne(customerId)
        if (valid) {
          response.status(200).body({
            Token: generateHash(PSK, [customerId, new Date().toLocaleString()]),
            ApiVersion: 1,
            CompatibilityVersion: 1,
          })
        } else {
          response.status(401).body()
        }
      },
      '/GetCustomerBookings': {
        formatter: async ({ payload, state }) => {
          const result: any[] = []
          for (const booking of payload as BoITBooking[]) {
            const resourceGroup = await state.resourceGroups.findOne(booking.resourceId)
            if (!resourceGroup) continue

            const location = await state.locations.findOne(resourceGroup.locationId)
            if (!location) continue

            const slotConfig = await state.timeSlotConfigs.findOne(
              resourceGroup.slotConfigId
            )
            if (!slotConfig) continue

            result.push({
              BookingId: booking.id,
              GroupName: resourceGroup.name,
              LocationName: location.name,
              LengthInMinutes: slotConfig.slots[booking.timeSlotIndex].duration,
              StartTimeStamp: `${booking.date}T${slotConfig.slots[booking.timeSlotIndex].StartTime}`,
              StartTime: slotConfig.slots[booking.timeSlotIndex].StartTime,
              StopTime: slotConfig.slots[booking.timeSlotIndex].StopTime,
              Unbookable: booking.isCancellable,
              IsReleased: booking.isReleased,
              IsUsed: booking.isUsed,
            })
          }
          return result
        },
        handler: async ({ request, response, state }) => {
          response
            .status(200)
            .body(await state.bookings.find({ customerId: request.context.customerId }))
        },
      },
      '/GetCustomerResources': {
        formatter: async ({ payload, state }) => {
          const categoryIds = (payload as BoITResourceGroup[]).reduce(
            (ids: number[], group: BoITResourceGroup) => {
              if (!ids.includes(group.categoryId)) ids.push(group.categoryId)
              return ids
            },
            []
          )

          const result: any[] = []
          for (const categoryId of categoryIds) {
            const category = await state.categories.findOne(categoryId)
            if (!category) continue

            const categoryEntry = {
              Name: category.Name,
              IconId: category.IconId,
              Locations: [] as any[],
            }

            const categoryResources = payload.filter(
              (r: BoITResourceGroup) => r.categoryId === categoryId
            )
            const locationIds = categoryResources.reduce(
              (ids: number[], resource: BoITResourceGroup) => {
                if (!ids.includes(resource.locationId)) ids.push(resource.locationId)
                return ids
              },
              [] as number[]
            )

            for (const locationId of locationIds) {
              const location = await state.locations.findOne(locationId)
              if (!location) continue
              const locationEntry = {
                Name: location.name,
                Groups: [] as any[],
              }

              const locationGroups = categoryResources.filter(
                (r: BoITResourceGroup) => r.locationId === locationId
              )
              for (const group of locationGroups) {
                locationEntry.Groups.push({
                  Id: group.id,
                  LastBookableTimeStamp: '2025-12-30T23:59:59',
                  Name: group.name,
                })
              }

              categoryEntry.Locations.push(locationEntry)
            }

            result.push(categoryEntry)
          }

          return result
        },
        handler: async ({ request, response, state }) => {
          response.status(200).body(
            await state.resourceGroups.find({
              id: { in: request.context.resources },
            })
          )
        },
      },
      '/GetCalendarData': {
        handler: async ({ request, response, state }) => {
          const { DateFrom, DateTo, Groups } = request.queryParameters
          const groupIds = JSON.parse(Groups).map((id: string) => parseInt(id))

          const groups = await state.resourceGroups.find({ id: { in: groupIds } })

          const slotConfigIds = groups.reduce(
            (ids: number[], group: BoITResourceGroup) => {
              if (!ids.includes(group.slotConfigId)) ids.push(group.slotConfigId)
              return ids
            },
            []
          )

          const intervalPatterns = [] as any[]
          for (let i = 0; i < slotConfigIds.length; i++) {
            const slotConfigId = slotConfigIds[i]
            const slotConfig = await state.timeSlotConfigs.findOne(slotConfigId)
            intervalPatterns.push({
              Id: slotConfig.id,
              Intervals: slotConfig.slots.map((s: BoITTimeSlot, i: number) => ({
                PassNo: i,
                StartTime: s.StartTime,
                LengthInMinutes: s.duration,
              })),
            })
          }

          const days = [] as any[]
          for (const date of datesBetween(DateFrom, DateTo)) {
            const day = {
              Date: date,
              NumberOfCustomerBookings: 0,
              DayGroups: [] as any[],
            }

            for (const group of groups) {
              const slotConfig = await state.timeSlotConfigs.findOne(group.slotConfigId)
              day.DayGroups.push({
                GroupId: group.id,
                IntervalPatternId: group.slotConfigId,
                BookablePasses: slotConfig.slots.map((_: any, i: number) => ({
                  No: i,
                })),
                CustomerBookings: [],
              })
            }

            days.push(day)
          }

          response.status(200).body({
            IntervalPatterns: intervalPatterns,
            Days: days,
          })
        },
      },
      '/Book': {
        handler: async ({ request, response, state }) => {
          const { customerId, GroupId, StartTimeStamp } = request.queryParameters

          const error = () => response.status(500).body()

          let [date, time] = StartTimeStamp.split('T')
          time = time.substring(0, 5)

          const group: BoITResourceGroup = await state.resourceGroups.findOne(GroupId)
          if (!group) return error()

          const slotConfig = await state.timeSlotConfigs.findOne(group.slotConfigId)
          if (!slotConfig) return error()

          const slotIndex = slotConfig.slots.find(
            (slot: BoITTimeSlot) => slot.StartTime === time
          )
          if (slotIndex === undefined) return error()

          const existing = await state.bookings.findOne({
            customerId: customerId,
            resourceId: GroupId,
            date: date,
            timeSlotIndex: slotIndex,
          })
          if (existing) return error()

          const booking = await state.bookings.insert({
            customerId,
            date,
            resourceId: group.id,
            timeSlotIndex: slotIndex,
            isReleased: false,
            isUsed: false,
            isCancellable: true,
          })

          response.status(200).body({
            BookingId: String(booking.id),
            ObjectName: group.name,
            UnBookable: true,
          })
        },
      },
    },
  })
}
