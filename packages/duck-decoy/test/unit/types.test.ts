import { datesBetween } from '@src/types'
import { describe, it, expect } from 'vitest'

describe('datesBetween', () => {
  it('should return dates, inclusive, between "2025-08-10" and "2025-08-12"', () => {
    expect(datesBetween('2025-08-10', '2025-08-12')).toEqual([
      '2025-08-10',
      '2025-08-11',
      '2025-08-12',
    ])
  })

  it('should return dates, non-inclusive, between "2025-08-10" and "2025-08-12"', () => {
    expect(datesBetween('2025-08-10', '2025-08-12', { inclusive: false })).toEqual([
      '2025-08-11',
    ])
  })

  it('should return dates, inclusive, across month boundary between "2025-08-30" and "2025-09-02"', () => {
    expect(datesBetween('2025-08-30', '2025-09-02')).toEqual([
      '2025-08-30',
      '2025-08-31',
      '2025-09-01',
      '2025-09-02',
    ])
  })
})
