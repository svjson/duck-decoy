import { createHmac } from 'node:crypto'

import {
  datesBetween,
  DuckDecoyHttpTransport,
  DuckDecoyPlugin,
  each,
  from,
  makeDecoyServer,
} from 'duck-decoy'

import { initialBoITState, PSK } from './state'
import { BoITTimeSlot } from './types'
import { HTTP_ADAPTERS } from '../../adapters'
import path from 'node:path'
import { duckDecoySwaggerPlugin } from '@duck-decoy/swagger'

export const generateHash = (psk: string, parts: string[]) => {
  const signature = createHmac('sha1', psk).update(parts.join('')).digest()

  const hash = signature
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '*')

  return hash
}

export const makeBoITService = async (
  transport: DuckDecoyHttpTransport,
  plugins: DuckDecoyPlugin[] = []
) => {
  return await makeDecoyServer({
    impl: transport,
    autostart: true,
    root: '/bookingservice/bookingservice.svc',
    state: initialBoITState(),
    plugins,
    preHandlers: [
      {
        exclude: ['/Login', '/docs/*'],
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
        const { Customer, Timestamp, Hash } = request.queryParameters

        const recomputedHash = generateHash(PSK, [Customer, Timestamp])
        if (Hash !== recomputedHash) {
          console.log(Hash, 'vs', recomputedHash)
          response.status(401).body()
          return
        }
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
      '/GetCustomerBookings': async ({ request, response, state }) => {
        const bookings = await each('booking')
          .from(state.bookings.find({ customerId: request.context.customerId }))
          .with('group', ({ booking }) =>
            state.resourceGroups.findOne(booking.resourceId)
          )
          .with('location', ({ group }) => state.locations.findOne(group.locationId))
          .with('slotConfig', ({ group }) =>
            state.timeSlotConfigs.findOne(group.slotConfigId)
          )
          .with(
            'slot',
            ({ slotConfig, booking }) => slotConfig.slots[booking.timeSlotIndex]
          )
          .select(({ booking, group, location, slot }) => ({
            BookingId: booking.id,
            GroupName: group.name,
            LocationName: location.name,
            LengthInMinutes: slot.duration,
            StartTimeStamp: `${booking.date}T${slot.StartTime}`,
            StartTime: slot.StartTime,
            StopTime: slot.StopTime,
            Unbookable: booking.isCancellable,
            IsReleased: booking.isReleased,
            IsUsed: booking.isUsed,
          }))

        response.status(200).body(bookings)
      },
      '/GetCustomerResources': async ({ request, response, state }) => {
        const categories = await from(
          await state.resourceGroups.find({
            id: { in: request.context.resources },
          })
        )
          .groupBy(['categoryId', 'resources'], (resource) => resource.categoryId)
          .with('category', ({ categoryId }) => state.categories.findOne(categoryId))
          .select(async ({ resources, category }) => ({
            IconId: category.IconId,
            Name: category.Name,
            Locations: await from(resources)
              .groupBy(
                ['locationId', 'Groups'],
                (resource) => resource.locationId,
                (resource) => ({
                  Id: resource.id,
                  Name: resource.name,
                  LastBookableTimeStamp: '2025-12-30T23:59:59',
                })
              )
              .with('location', ({ locationId }) => state.locations.findOne(locationId))
              .select(({ location, Groups }) => ({
                Name: location.name,
                Groups,
              })),
          }))

        response.status(200).body(categories)
      },
      '/GetCalendarData': async ({ request, response, state }) => {
        const { DateFrom, DateTo, Groups } = request.queryParameters
        const groupIds = JSON.parse(Groups).map((id: string) => parseInt(id))
        const resources = await state.resourceGroups.find({ id: { in: groupIds } })

        response.status(200).body({
          IntervalPatterns: await each('resource')
            .from(resources)
            .groupBy(['slotConfigId', '_resources'], (resource) => resource.slotConfigId)
            .with('slotConfig', ({ slotConfigId }) =>
              state.timeSlotConfigs.findOne(slotConfigId)
            )
            .select(({ slotConfig }) => ({
              Id: slotConfig.id,
              Intervals: slotConfig.slots.map((slot, i) => ({
                PassNo: i,
                StartTime: slot.StartTime,
                LengthInMinutes: slot.duration,
              })),
            })),
          Days: await each('date')
            .from(datesBetween(DateFrom, DateTo))
            .with('bookings', ({ date }) => state.bookings.find({ date }))
            .select(async ({ date, bookings }) => ({
              Date: date,
              NumberOfCustomerBookings: bookings.length,
              DayGroups: await each('resource')
                .from(resources)
                .with('slotConfig', ({ resource }) =>
                  state.timeSlotConfigs.findOne(resource.slotConfigId)
                )
                .with('bookings', ({ resource }) =>
                  bookings.filter((b) => b.resourceId === resource.id)
                )
                .select(({ resource, slotConfig, bookings }) => ({
                  GroupId: resource.id,
                  IntervalPatternId: slotConfig.id,
                  BookablePasses: slotConfig.slots.map((_, i) => ({ No: i })),
                  CustomerBookings: bookings.map((b) => ({
                    BookingId: b.id,
                    PassNo: b.timeSlotIndex,
                    Unbookable: b.isCancellable,
                  })),
                })),
            })),
        })
      },
      '/Book': {
        handler: async ({ request, response, state }) => {
          const { customerId, GroupId, StartTimeStamp } = request.queryParameters

          const error = () => response.status(500).body()

          let [date, time] = StartTimeStamp.split('T')
          time = time.substring(0, 5)

          const group = await state.resourceGroups.findOne(GroupId)
          if (!group) return error()

          const slotConfig = await state.timeSlotConfigs.findOne(group.slotConfigId)
          if (!slotConfig) return error()

          const slotIndex = slotConfig.slots.findIndex(
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

const startStandalone = async () => {
  const plugins: DuckDecoyPlugin[] = []
  if (process.argv[2] === '--swagger') {
    plugins.push(duckDecoySwaggerPlugin())
  }
  const server = await makeBoITService(new HTTP_ADAPTERS[0](), plugins)
  console.log(server.port)
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__dirname, 'service.ts')
) {
  startStandalone()
}
