import { ArrayCollection } from '@src/collection'
import { ANIMAL_SPECIES_RECORDS } from 'test/record-fixtures'
import { describe, expect, it } from 'vitest'

describe('ArrayCollection', () => {
  describe('construction', () => {
    it('should make a copy of the supplied array data so that modifications do not mutate original', async () => {
      // Given
      const array = [...ANIMAL_SPECIES_RECORDS]
      const coll = new ArrayCollection(array)

      // When
      array.splice(2, 2)

      // Then
      expect(array).toHaveLength(3)
      expect(await coll.find()).toHaveLength(5)
    })
  })

  describe('find', () => {
    it('should return all elements when no args are given', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      const result = await coll.find()

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS)
    })
  })

  describe('findOne', () => {
    it('should return the first element when no args are given', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      const result = await coll.findOne()

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS[0])
    })

    it('should return element matching the supplied identity, defaulting to `id`', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      const result = await coll.findOne(3)

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.id === 3))
    })

    it('should use type coercion when identity is supplied as string', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      const result = await coll.findOne('3')

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.id === 3))
    })

    it('should return element matching the supplied identity according to identity configuration', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS, { identity: 'name' })

      // When
      const result = await coll.findOne('Frog')

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.name === 'Frog'))
    })
  })

  describe('postOne', () => {
    it('should append a new record and assign a new identity according to id generator', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      const result = await coll.insert({
        name: 'Honey Badger',
        class: 'Mammalia',
        diet: 'Omnivore',
        legs: 4,
      })

      // Then
      expect(result?.id).toEqual(6)
      expect(await coll.count()).toEqual(6)
      expect((await coll.find()).at(-1)).toEqual({
        id: 6,
        name: 'Honey Badger',
        class: 'Mammalia',
        diet: 'Omnivore',
        legs: 4,
      })
    })
  })

  describe('putOne', () => {
    it('should replace existing record', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      await coll.updateOne(3, {
        name: 'Beagle',
        class: 'Mammalia',
        diet: 'Carnivore',
        legs: 4,
      })
      const result = await coll.findOne(3)

      // Then
      expect(result).toEqual({
        id: 3,
        name: 'Beagle',
        class: 'Mammalia',
        diet: 'Carnivore',
        legs: 4,
      })
    })
  })

  describe('deleteOne', () => {
    it('should delete the first matching element when called with identity', async () => {
      // Given
      const coll = new ArrayCollection(ANIMAL_SPECIES_RECORDS)

      // When
      const deleted = await coll.deleteOne(3)

      // Then
      expect(deleted).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.id === 3))
      expect((await coll.find()).map((r) => r.id)).toEqual([1, 2, 4, 5])
    })
  })
})
