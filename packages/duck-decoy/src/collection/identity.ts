export interface IdGenerator {
  next: () => any
  reset: () => void
}

export const makeAutoIncGenerator = (records: any[], identity: string) => {
  let counter =
    records.reduce((highest, record) => {
      return Math.max(highest, record[identity])
    }, 0) + 1

  return {
    next: () => counter++,
    reset: () => {
      counter = 0
    },
  }
}

export const coerce = <Type>(fromValue: any, toTypeOf: Type): Type | undefined => {
  if (typeof fromValue === typeof toTypeOf) {
    return fromValue as Type
  }

  if (typeof toTypeOf === 'number') {
    if (typeof fromValue === 'string') {
      return Number.parseInt(fromValue) as Type
    }
  }

  if (typeof toTypeOf === 'string') {
    return String(fromValue) as Type
  }

  return fromValue
}
