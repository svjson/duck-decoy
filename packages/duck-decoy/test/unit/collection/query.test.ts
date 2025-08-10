import { matchesQuery } from '@src/collection/query'
import { describe, it, expect } from 'vitest'

describe('Collection Query', () => {
  describe('matchesQuery', () => {
    it('should match on equals for explicit value', () => {
      // Given
      const object = {
        id: 15,
        name: 'Konny',
        occupation: 'Pirate',
      }

      // Then
      expect(matchesQuery(object, { id: 15 })).toBe(true)
      expect(matchesQuery(object, { name: 'Konny' })).toBe(true)
      expect(matchesQuery(object, { occupation: 'Pirate' })).toBe(true)
    })

    it('should not match on non-equal explicit value', () => {
      // Given
      const object = {
        id: 15,
        name: 'Konny',
        occupation: 'Pirate',
      }

      // Then
      expect(matchesQuery(object, { id: 16 })).toBe(false)
      expect(matchesQuery(object, { name: 'Ronny' })).toBe(false)
      expect(matchesQuery(object, { occupation: 'Moose Nose Wiper' })).toBe(false)
    })

    it('should match on equal for multiple explicit values', () => {
      // Given
      const object = {
        id: 15,
        name: 'Konny',
        occupation: 'Pirate',
      }

      // Then
      expect(matchesQuery(object, { id: 15, name: 'Konny' })).toBe(true)
      expect(matchesQuery(object, { name: 'Konny', occupation: 'Pirate' })).toBe(true)
      expect(matchesQuery(object, { occupation: 'Pirate', id: 15 })).toBe(true)
    })

    it('should not match on mix of equal and non-equal explicit values', () => {
      // Given
      const object = {
        id: 15,
        name: 'Konny',
        occupation: 'Pirate',
      }

      // Then
      expect(matchesQuery(object, { id: 15, name: 'Ronny' })).toBe(false)
      expect(
        matchesQuery(object, { name: 'Konny', occupation: 'Moose Nose Wiper' })
      ).toBe(false)
      expect(matchesQuery(object, { occupation: 'Moose Nose Wiper', id: 16 })).toBe(false)
    })

    it('should match on `in`-criteria when field value is a member of criteria array', () => {
      // Given
      const object = {
        id: 15,
        name: 'Konny',
        occupation: 'Pirate',
      }

      // When
      expect(matchesQuery(object, { id: { in: [14, 15, 16] } })).toBe(true)
    })

    it('should not match on `in`-criteria when field is not a member of criteria array', () => {
      // Given
      const object = {
        id: 15,
        name: 'Konny',
        occupation: 'Pirate',
      }

      // When
      expect(matchesQuery(object, { id: { in: [100, 101, 102] } })).toBe(false)
    })
  })
})
