import { describe, it, expect } from 'vitest'

import { urlpath } from '@src/index'

describe('urlpath', () => {
  describe('join()', () => {
    it.each([
      [['/api', '/rounds', '/by-score'], '/api/rounds/by-score'],
      [['/api/', '/rounds/', '/by-score/'], '/api/rounds/by-score'],
      [['api', 'rounds', 'by-score'], '/api/rounds/by-score'],
    ] as [string[], string][])('should join %o into %s', (parts, expected) => {
      expect(urlpath.join(...parts)).toEqual(expected)
    })
  })

  describe('trailingSlashJoin()', () => {
    it.each([
      [['/api', '/rounds', '/by-score'], '/api/rounds/by-score/'],
      [['/api/', '/rounds/', '/by-score/'], '/api/rounds/by-score/'],
      [['api', 'rounds', 'by-score'], '/api/rounds/by-score/'],
    ] as [string[], string][])('should join %o into %s', (parts, expected) => {
      expect(urlpath.trailingSlashJoin(...parts)).toEqual(expected)
    })
  })
})
