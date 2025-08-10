type ValueOf<T> = T[keyof T]

export const ANIMAL_SPECIES_RECORDS = [
  {
    id: 1,
    name: 'Goldfish',
    class: 'Actinopterygii',
    diet: 'Omnivore',
    legs: 0,
  },
  {
    id: 2,
    name: 'Tiger',
    class: 'Mammalia',
    diet: 'Carnivore',
    legs: 4,
  },
  {
    id: 3,
    name: 'Eagle',
    class: 'Aves',
    diet: 'Carnivore',
    legs: 2,
  },
  {
    id: 4,
    name: 'Frog',
    class: 'Amphibia',
    diet: 'Carnivore',
    legs: 4,
  },
  {
    id: 5,
    name: 'Cow',
    class: 'Mammalia',
    diet: 'Herbivore',
    legs: 4,
  },
]

export const VEHICLE_RECORDS = [
  { id: 'rav', name: 'RAV4', classId: 'suv' },
  { id: 'cvc', name: 'Civic', classId: 'sed' },
  { id: 'f15', name: 'F-150', classId: 'trk' },
  { id: 'm3', name: 'Model 3', classId: 'sed' },
  { id: 'wrn', name: 'Wrangler', classId: 'suv' },
  { id: 'spr', name: 'Sprinter', classId: 'van' },
  { id: 'rch', name: 'Rancher ATV', classId: 'atv' },
]
export type Vehicle = ValueOf<typeof VEHICLE_RECORDS>

export const VEHICLE_CLASS_RECORDS = [
  {
    id: 'suv',
    name: 'SUV',
    segment: 'Passenger',
    terrains: ['urban', 'offroad'],
  },
  {
    id: 'sed',
    name: 'Sedan',
    segment: 'Passenger',
    terrains: ['urban', 'highway'],
  },
  {
    id: 'trk',
    name: 'Truck',
    segment: 'Utility',
    terrains: ['urban', 'offroad', 'highway'],
  },
  {
    id: 'van',
    name: 'Van',
    segment: 'Commercial',
    terrains: ['urban', 'highway'],
  },
  {
    id: 'atv',
    name: 'ATV',
    segment: 'Recreational',
    terrains: ['offroad'],
  },
]

export const VEHICLE_TERRAIN_RECORDS = [
  {
    id: 'urban',
    surfaces: ['asphalt', 'concrete'],
  },
  {
    id: 'offroad',
    surfaces: ['dirt', 'rock', 'mud'],
  },
  {
    id: 'highway',
    surfaces: ['asphalt', 'barrier'],
  },
]
