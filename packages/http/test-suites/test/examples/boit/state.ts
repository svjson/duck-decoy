import { ArrayCollection } from 'duck-decoy'
import {
  BoITAuthToken,
  BoITBooking,
  BoITCustomer,
  BoITLocation,
  BoITResourceCategory,
  BoITResourceGroup,
  BoITTimeSlotConfiguration,
} from './types'

export const PSK = 'f2d4e4a7b3c5e9f6a1b8c2d6e4b7f3c1'
export const CUSTOMER_ID_1 = '835-004-1-001'
export const CUSTOMER_ID_2 = '111-001-1-004'
export const CUSTOMER_ID_3 = '220-001-1-001'

/**
 * Categories of bookable resources.
 */
const CATEGORIES: BoITResourceCategory[] = [
  {
    id: 1,
    Name: 'Tvätt',
    IconId: 15,
  },
  {
    id: 2,
    Name: 'Bastu',
    IconId: 4,
  },
]

/**
 * System users (customers) and references to the bookable resources
 * they have access to.
 */
const CUSTOMERS: BoITCustomer[] = [
  {
    customerId: CUSTOMER_ID_1,
    resources: [432],
  },
  {
    customerId: CUSTOMER_ID_2,
    resources: [120, 122],
  },
  {
    customerId: CUSTOMER_ID_3,
    resources: [],
  },
]

/**
 * Physical locations that may contain bookable resources.
 */
const LOCATIONS: BoITLocation[] = [
  {
    id: 19,
    name: 'Tallkottev. 19',
  },
  {
    id: 30,
    name: 'Granrisv. 22',
  },
  {
    id: 31,
    name: 'Kopparv. 119',
  },
]

/**
 * Bookable resources
 */
const RESOURCE_GROUPS: BoITResourceGroup[] = [
  {
    id: 120,
    name: 'Tvätt',
    categoryId: 1,
    locationId: 19,
    slotConfigId: 1,
  },
  {
    id: 122,
    name: 'Bastu',
    categoryId: 2,
    locationId: 30,
    slotConfigId: 1,
  },
  {
    id: 432,
    name: 'Tvätt',
    categoryId: 1,
    locationId: 31,
    slotConfigId: 1,
  },
]

/**
 * Re-usable configuration of time slots at which a bookable resource
 * can be reserved.
 */
const TIME_SLOT_CONFIGURATIONS: BoITTimeSlotConfiguration[] = [
  {
    id: 1,
    slots: [
      { StartTime: '07:00', StopTime: '10:00', duration: 180 },
      { StartTime: '10:00', StopTime: '13:00', duration: 180 },
      { StartTime: '13:00', StopTime: '16:00', duration: 180 },
      { StartTime: '16:00', StopTime: '19:00', duration: 180 },
      { StartTime: '19:00', StopTime: '22:00', duration: 180 },
    ],
  },
]

/**
 * The initial state of the BoIT service
 */
export const initialBoITState = () => ({
  psk: PSK,
  bookings: new ArrayCollection<BoITBooking>(),
  categories: new ArrayCollection<BoITResourceCategory>(CATEGORIES),
  customers: new ArrayCollection<BoITCustomer, 'customerId'>(CUSTOMERS, {
    identity: 'customerId',
  }),
  locations: new ArrayCollection<BoITLocation>(LOCATIONS),
  resourceGroups: new ArrayCollection<BoITResourceGroup>(RESOURCE_GROUPS),
  timeSlotConfigs: new ArrayCollection<BoITTimeSlotConfiguration>(
    TIME_SLOT_CONFIGURATIONS
  ),
  validTokens: new ArrayCollection<BoITAuthToken, 'token'>([], {
    identity: 'token',
  }),
})
