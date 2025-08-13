import { describe, it, expect } from 'vitest'
import { RequestLog } from '@src/log'
import { RouteDef } from '@src/types'
import { DuckDecoyRequest } from '@src/http'

describe('RequestLog', () => {
  describe('logRequest()', () => {
    it('should store and return the logged entry', () => {
      // Given
      const log = new RequestLog()

      // When
      const entry = log.logRequest(
        {
          queryParameters: { status: 'terminated' } as Record<string, string>,
          url: '/lemmings/search?status=terminated',
        } as DuckDecoyRequest,
        {
          routeId: 'lemmings-search-GET',
          path: '/lemmings/search',
        } as RouteDef<any>
      )

      // Then
      expect(entry).toBeDefined()
      const expectedEntry = {
        routeId: 'lemmings-search-GET',
        pattern: '/lemmings/search',
        path: '/lemmings/search?status=terminated',
        queryParams: { status: 'terminated' },
      }
      expect(entry).toEqual(expectedEntry)
      expect(log.entries).toEqual([expectedEntry])
    })
  })
})
