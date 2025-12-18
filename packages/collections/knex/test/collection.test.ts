import { KnexCollection } from '@src/collection'
import { beforeAll, describe, expect, it } from 'vitest'

import { ANIMAL_SPECIES_RECORDS } from './fixtures/record-fixtures'
import { ensureTable, getTestDB } from './fixtures/sql-server'

describe('KnexCollection', () => {
  beforeAll(async () => {
    const db = await getTestDB()
    await ensureTable(db, 'species', (t) => {
      t.integer('id').primary()
      t.string('name')
      t.string('class')
      t.string('diet')
      t.integer('legs')
    })

    await ensureTable(db, 'name_keyed_species', (t) => {
      t.integer('id')
      t.string('name').primary()
      t.string('class')
      t.string('diet')
      t.integer('legs')
    })
  })

  describe('construction', () => {
    it('should insert all initial records on construction', async () => {
      // Given
      const db = await getTestDB()
      const initialData = [...ANIMAL_SPECIES_RECORDS]

      // When
      const coll = new KnexCollection(db, 'species', initialData)
      await coll.isInitialized()

      // Then
      const count = await db('species').count<{ recordCount: number }>('* as recordCount')
      expect(count).toEqual([
        {
          recordCount: 5,
        },
      ])
    })
  })

  describe('count', () => {
    it('should return the count of initial records', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const count = await coll.count()

      // Then
      expect(count).toEqual(5)
    })
  })

  describe('find', () => {
    it('should return all elements when no args are given', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const result = await coll.find()

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS)
    })

    it('should return all elements matching equals query', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const result = await coll.find({ legs: 4 })

      // Then
      expect(result).toHaveLength(3)
    })
  })

  describe('findOne', () => {
    it('should return the first element when no args are given', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const result = await coll.findOne()

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS[0])
    })

    it('should return element matching the supplied identity, defaulting to `id`', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const result = await coll.findOne(3)

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.id === 3))
    })

    it('should use type coercion when identity is supplied as string', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const result = await coll.findOne('3')

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.id === 3))
    })

    it('should return element matching the supplied identity according to identity configuration', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'name_keyed_species',
        ANIMAL_SPECIES_RECORDS,
        { identity: 'name' }
      )
      await coll.isInitialized()

      // When
      const result = await coll.findOne('Frog')

      // Then
      expect(result).toEqual(ANIMAL_SPECIES_RECORDS.find((r) => r.name === 'Frog'))
    })

    it('should return undefined when no record matches the configured identity property', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'name_keyed_species',
        ANIMAL_SPECIES_RECORDS,
        { identity: 'name' }
      )
      await coll.isInitialized()

      // When
      const result = await coll.findOne('Kermit')

      // Then
      expect(result).toBeUndefined()
    })
  })

  describe('deleteOne', () => {
    it('should delete and return the first row in the collection', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const deleted = await coll.deleteOne()

      // Then
      expect(await coll.count()).toEqual(4)
      expect(deleted).toEqual({
        id: 1,
        name: 'Goldfish',
        class: 'Actinopterygii',
        diet: 'Omnivore',
        legs: 0,
      })
    })

    it('should delete and return only one object matching the criteria', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      const deleted = await coll.deleteOne({ legs: 4 }) // There are 3 records matching this criteria

      // Then
      expect(await coll.count()).toEqual(4)
      expect(deleted).toEqual({
        id: 2,
        name: 'Tiger',
        class: 'Mammalia',
        diet: 'Carnivore',
        legs: 4,
      })
    })
  })

  describe('updateOne', () => {
    it('should update only the row with matching identity', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      await coll.updateOne(1, Object.assign({}, ANIMAL_SPECIES_RECORDS[0], { legs: 3 }))

      // Then
      expect(await coll.count()).toEqual(5)
      expect(await coll.find()).toEqual([
        {
          id: 1,
          name: 'Goldfish',
          class: 'Actinopterygii',
          diet: 'Omnivore',
          legs: 3,
        },
        ...ANIMAL_SPECIES_RECORDS.slice(1),
      ])
    })
  })

  describe('reset', () => {
    it('should restore initial records after clearing collection', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      await coll.clear()
      await coll.reset()

      // Then
      expect(await coll.count()).toEqual(5)
      expect(await coll.find()).toEqual(ANIMAL_SPECIES_RECORDS)
    })

    it('should restore initial records after modifying rows', async () => {
      // Given
      const coll = new KnexCollection(
        await getTestDB(),
        'species',
        ANIMAL_SPECIES_RECORDS
      )
      await coll.isInitialized()

      // When
      await coll.updateOne(1, Object.assign({}, ANIMAL_SPECIES_RECORDS[0], { legs: 3 }))
      await coll.updateOne(
        2,
        Object.assign({}, ANIMAL_SPECIES_RECORDS[1], { class: 'Redacted' })
      )
      await coll.reset()

      // Then
      expect(await coll.count()).toEqual(5)
      expect(await coll.find()).toEqual(ANIMAL_SPECIES_RECORDS)
    })
  })
})
