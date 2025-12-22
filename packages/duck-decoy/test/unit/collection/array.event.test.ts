import { ArrayCollection, InsertEvent, UpdateEvent } from '@src/collection'
import {
  BeforeDeleteEvent,
  BeforeInsertEvent,
  BeforeUpdateEvent,
  DeleteEvent,
} from '@src/collection/event'
import { ANIMAL_SPECIES_RECORDS, AnimalSpecies } from 'test/record-fixtures'
import { describe, expect, it } from 'vitest'

describe('ArrayCollection', () => {
  describe('Events', () => {
    describe('insert', () => {
      it('should invoke event handler registered with onInsert()', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let insertEvent: InsertEvent<AnimalSpecies> | undefined
        coll.onInsert((event) => {
          insertEvent = event
        })

        // When
        const result = await coll.insert({
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })

        // Then
        expect(insertEvent).toEqual({
          record: result,
        })
        expect(result.id).toEqual(6)
      })

      it('should invoke event handler registered with on("insert")', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let insertEvent: InsertEvent<AnimalSpecies> | undefined
        coll.on('insert', (event: InsertEvent<AnimalSpecies>) => {
          insertEvent = event
        })

        // When
        const result = await coll.insert({
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })

        // Then
        expect(insertEvent).toEqual({
          record: result,
        })
        expect(result.id).toEqual(6)
      })
    })

    describe('beforeInsert', () => {
      it('should invoke event handler registered with onBeforeInsert()', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent: BeforeInsertEvent<AnimalSpecies, 'id'> | undefined
        coll.onBeforeInsert((event) => {
          beforeEvent = event
          return true
        })

        // When
        const result = await coll.insert({
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })

        // Then
        expect(beforeEvent).toEqual({
          record: {
            name: 'Honey Badger',
            class: 'Mammalia',
            diet: 'Omnivore',
            legs: 4,
          },
        })
        expect(result).toEqual({
          id: 6,
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })
      })

      it('should cancel insert when onBeforeInsert() returns false', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let inserted: AnimalSpecies | undefined
        let beforeEvent: BeforeInsertEvent<AnimalSpecies, 'id'> | undefined
        coll.onBeforeInsert((event) => {
          beforeEvent = event
          return false
        })
        coll.onInsert((event) => {
          inserted = event.record
        })

        // When
        const result = await coll.insert({
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })

        // Then
        expect(result).toBeUndefined()
        expect(inserted).toBeUndefined()
        expect(beforeEvent).toEqual({
          record: {
            name: 'Honey Badger',
            class: 'Mammalia',
            diet: 'Omnivore',
            legs: 4,
          },
        })
      })

      it('should invoke event handler registered with on("beforeInsert")', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent: BeforeInsertEvent<AnimalSpecies, 'id'> | undefined
        coll.on('beforeInsert', (event: BeforeInsertEvent<AnimalSpecies, 'id'>) => {
          beforeEvent = event
          return true
        })

        // When
        const result = await coll.insert({
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })

        // Then
        expect(beforeEvent).toEqual({
          record: {
            name: 'Honey Badger',
            class: 'Mammalia',
            diet: 'Omnivore',
            legs: 4,
          },
        })
        expect(result).toEqual({
          id: 6,
          name: 'Honey Badger',
          class: 'Mammalia',
          diet: 'Omnivore',
          legs: 4,
        })
      })
    })

    describe('update', () => {
      it('should invoke event handler registered with onUpdate()', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let updateEvent: UpdateEvent<AnimalSpecies> | undefined
        coll.onUpdate((event) => {
          updateEvent = event
        })

        // When
        const result = await coll.updateOne(1, {
          ...ANIMAL_SPECIES_RECORDS[0],
          legs: 4,
        })

        // Then
        expect(updateEvent).toEqual({
          record: result,
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual({ ...ANIMAL_SPECIES_RECORDS[0], legs: 4 })
      })

      it('should invoke event handler registered with on("update")', async () => {
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let updateEvent: UpdateEvent<AnimalSpecies> | undefined
        coll.on('update', (event: UpdateEvent<AnimalSpecies>) => {
          updateEvent = event
        })

        // When
        const result = await coll.updateOne(1, {
          ...ANIMAL_SPECIES_RECORDS[0],
          legs: 4,
        })

        // Then
        expect(updateEvent).toEqual({
          record: result,
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual({ ...ANIMAL_SPECIES_RECORDS[0], legs: 4 })
      })
    })

    describe('beforeUpdate', () => {
      it('should invoke event handler registered with onBeforeUpdate()', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent:
          | BeforeUpdateEvent<AnimalSpecies, number, 'id', undefined>
          | undefined
        let updateEvent: UpdateEvent<AnimalSpecies> | undefined
        coll.onBeforeUpdate((event) => {
          beforeEvent = event
          return true
        })
        coll.onUpdate((event) => {
          updateEvent = event
        })

        // When
        const result = await coll.updateOne(1, {
          ...ANIMAL_SPECIES_RECORDS[0],
          legs: 4,
        })

        // Then
        expect(beforeEvent).toEqual({
          record: {
            ...ANIMAL_SPECIES_RECORDS[0],
            legs: 4,
          },
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })

        expect(updateEvent).toEqual({
          record: result,
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual({ ...ANIMAL_SPECIES_RECORDS[0], legs: 4 })
      })

      it('should invoke event handler registered with on("beforeUpdate")', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent:
          | BeforeUpdateEvent<AnimalSpecies, number, 'id', undefined>
          | undefined
        let updateEvent: UpdateEvent<AnimalSpecies> | undefined
        coll.on(
          'beforeUpdate',
          (event: BeforeUpdateEvent<AnimalSpecies, number, 'id', undefined>) => {
            beforeEvent = event
            return true
          }
        )
        coll.onUpdate((event) => {
          updateEvent = event
        })

        // When
        const result = await coll.updateOne(1, {
          ...ANIMAL_SPECIES_RECORDS[0],
          legs: 4,
        })

        // Then
        expect(beforeEvent).toEqual({
          record: {
            ...ANIMAL_SPECIES_RECORDS[0],
            legs: 4,
          },
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })

        expect(updateEvent).toEqual({
          record: result,
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual({ ...ANIMAL_SPECIES_RECORDS[0], legs: 4 })
      })

      it('should cancel update when listener returns false', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent:
          | BeforeUpdateEvent<AnimalSpecies, number, 'id', undefined>
          | undefined
        let updateEvent: UpdateEvent<AnimalSpecies> | undefined
        coll.onBeforeUpdate((event) => {
          beforeEvent = event
          return false
        })
        coll.onUpdate((event) => {
          updateEvent = event
        })

        // When
        const result = await coll.updateOne(1, {
          ...ANIMAL_SPECIES_RECORDS[0],
          legs: 4,
        })

        // Then
        expect(beforeEvent).toEqual({
          record: {
            ...ANIMAL_SPECIES_RECORDS[0],
            legs: 4,
          },
          original: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })

        expect(updateEvent).toBeUndefined()
        expect(result).toEqual(undefined)
      })
    })

    describe('delete', () => {
      it('should invoke event handler registered with onDelete()', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let deleteEvent: DeleteEvent<AnimalSpecies, 'id'> | undefined
        coll.onDelete((event) => {
          deleteEvent = event
        })

        // When
        const result = await coll.deleteOne(1)

        // Then
        expect(deleteEvent).toEqual({
          record: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual(ANIMAL_SPECIES_RECORDS[0])
      })

      it('should invoke event handler registered with on("delete")', async () => {
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let deleteEvent: UpdateEvent<AnimalSpecies> | undefined
        coll.on('delete', (event: UpdateEvent<AnimalSpecies>) => {
          deleteEvent = event
        })

        // When
        const result = await coll.deleteOne(1)

        // Then
        expect(deleteEvent).toEqual({
          record: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual(ANIMAL_SPECIES_RECORDS[0])
      })
    })

    describe('beforeDelete', () => {
      it('should invoke event handler registered with onBeforeDelete()', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent: BeforeDeleteEvent<AnimalSpecies, 'id', undefined> | undefined
        let deleteEvent: DeleteEvent<AnimalSpecies, 'id'> | undefined
        coll.onBeforeDelete((event) => {
          beforeEvent = event
          return true
        })
        coll.onDelete((event) => {
          deleteEvent = event
        })

        // When
        const result = await coll.deleteOne(1)

        // Then
        expect(beforeEvent).toEqual({
          record: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })

        expect(deleteEvent).toEqual({
          record: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })
        expect(result).toEqual(ANIMAL_SPECIES_RECORDS[0])
      })

      it('should invoke event handler registered with on("beforeDelete")', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent: BeforeDeleteEvent<AnimalSpecies, 'id', undefined> | undefined
        let deleteEvent: DeleteEvent<AnimalSpecies, 'id'> | undefined
        coll.onBeforeDelete(
          (event: BeforeDeleteEvent<AnimalSpecies, 'id', undefined>) => {
            beforeEvent = event
            return true
          }
        )
        coll.onDelete((event) => {
          deleteEvent = event
        })

        // When
        const result = await coll.deleteOne(1)

        // Then
        expect(beforeEvent).toEqual({
          record: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })

        expect(deleteEvent).toEqual({
          record: result,
          criteria: 1,
        })
        expect(result).toEqual(ANIMAL_SPECIES_RECORDS[0])
      })

      it('should cancel delete when listener returns false', async () => {
        // Given
        const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)
        let beforeEvent: BeforeDeleteEvent<AnimalSpecies, 'id', undefined> | undefined
        let deleteEvent: DeleteEvent<AnimalSpecies, 'id'> | undefined
        coll.onBeforeDelete((event) => {
          beforeEvent = event
          return false
        })
        coll.onDelete((event) => {
          deleteEvent = event
        })

        // When
        const result = await coll.deleteOne(1)

        // Then
        expect(beforeEvent).toEqual({
          record: ANIMAL_SPECIES_RECORDS[0],
          criteria: 1,
        })

        expect(deleteEvent).toBeUndefined()
        expect(result).toEqual(undefined)
      })
    })
  })
})
