export type In<V> = { in: V[] }

export type Criteria<V> = V | In<V>

export type Query<T> = { [K in keyof T]?: Criteria<T[K]> }

const isIn = <V>(c: unknown): c is In<V> => {
  return !!c && typeof c === 'object' && Array.isArray((c as any)?.in)
}

export const matchesQuery = <T>(record: T, query: Query<T>) => {
  for (const [key, criteria] of Object.entries(query)) {
    const rValue = record[key as keyof T]
    if (isIn<typeof rValue>(criteria)) {
      if (!criteria.in.includes(rValue)) return false
    } else if (typeof criteria === typeof rValue) {
      if (criteria !== rValue) return false
    } else {
      return false
    }
  }

  return true
}

export const filterQuery = <T>(records: T[], query: Query<T>) => {
  return records.filter((r) => matchesQuery(r, query))
}
