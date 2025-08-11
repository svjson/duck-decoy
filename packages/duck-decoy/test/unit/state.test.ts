import { describe, expect, it } from 'vitest'
import { each, from } from '@src/state'
import {
  VEHICLE_CLASS_RECORDS,
  VEHICLE_RECORDS,
  VEHICLE_TERRAIN_RECORDS,
} from 'test/record-fixtures'

describe('PayloadBuilder', () => {
  describe('Single Source', () => {
    it('should construct a result from an array of objects using `from` with `select`', async () => {
      // When
      const payload = await from(VEHICLE_RECORDS)
        .where(({ record }) => ['rav', 'cvc'].includes(record.id))
        .select(({ record }) => {
          return {
            VehicleId: record.id.toUpperCase(),
            VehicleName: record.name,
          }
        })

      // Then
      expect(payload).toEqual([
        {
          VehicleId: 'RAV',
          VehicleName: 'RAV4',
        },
        {
          VehicleId: 'CVC',
          VehicleName: 'Civic',
        },
      ])
    })

    it('should construct a result from an array of named objects using `each` with `from` and `select`', async () => {
      // When
      const payload = await each('vehicle')
        .from(VEHICLE_RECORDS)
        .where(({ vehicle }) => ['rav', 'cvc'].includes(vehicle.id))
        .select(({ vehicle }) => {
          return {
            VehicleId: vehicle.id.toUpperCase(),
            VehicleName: vehicle.name,
          }
        })

      // Then
      expect(payload).toEqual([
        {
          VehicleId: 'RAV',
          VehicleName: 'RAV4',
        },
        {
          VehicleId: 'CVC',
          VehicleName: 'Civic',
        },
      ])
    })
  })

  describe('Auxiliary Sources', () => {
    it('should pick relations according to `with` clauses', async () => {
      const result = await each('vehicle')
        .from(VEHICLE_RECORDS)
        .where((v) => ['rav', 'cvc'].includes(v.vehicle.id))
        .with('category', ({ vehicle }) =>
          VEHICLE_CLASS_RECORDS.find((c) => c.id === vehicle.classId)
        )
        .with('terrains', ({ category }) =>
          VEHICLE_TERRAIN_RECORDS.filter((t) => category.terrains.includes(t.id))
        )
        .select(({ vehicle, category, terrains }) => {
          return {
            Id: vehicle.id.toUpperCase(),
            Name: vehicle.name,
            Class: category.name,
            Segment: category.segment,
            SurfaceTypes: terrains.flatMap((h) => h.surfaces),
          }
        })

      // Then
      expect(result).toEqual([
        {
          Id: 'RAV',
          Name: 'RAV4',
          Class: 'SUV',
          Segment: 'Passenger',
          SurfaceTypes: ['asphalt', 'concrete', 'dirt', 'rock', 'mud'],
        },
        {
          Id: 'CVC',
          Name: 'Civic',
          Class: 'Sedan',
          Segment: 'Passenger',
          SurfaceTypes: ['asphalt', 'concrete', 'asphalt', 'barrier'],
        },
      ])
    })
  })

  describe('grouping by a distinct property of the initial array', () => {
    it('should group vehicles by occurring classes', async () => {
      // When
      const result = await from(VEHICLE_RECORDS)
        .groupBy((vehicle) => vehicle.classId)
        .select(({ group, records }) => {
          return {
            category: group,
            vehicles: records.map((v) => v.name),
          }
        })

      // Then
      expect(result).toEqual([
        { category: 'suv', vehicles: ['RAV4', 'Wrangler'] },
        { category: 'sed', vehicles: ['Civic', 'Model 3'] },
        { category: 'trk', vehicles: ['F-150'] },
        { category: 'van', vehicles: ['Sprinter'] },
        { category: 'atv', vehicles: ['Rancher ATV'] },
      ])
    })

    it('should group vehicles by occurring class, named in context', async () => {
      // When
      const result = await from(VEHICLE_RECORDS)
        .groupBy(['classId', 'vehicles'], (vehicle) => vehicle.classId)
        .select(({ classId, vehicles }) => {
          return {
            category: classId,
            vehicles: vehicles.map((v) => v.name),
          }
        })

      // Then
      expect(result).toEqual([
        { category: 'suv', vehicles: ['RAV4', 'Wrangler'] },
        { category: 'sed', vehicles: ['Civic', 'Model 3'] },
        { category: 'trk', vehicles: ['F-150'] },
        { category: 'van', vehicles: ['Sprinter'] },
        { category: 'atv', vehicles: ['Rancher ATV'] },
      ])
    })
  })
})
