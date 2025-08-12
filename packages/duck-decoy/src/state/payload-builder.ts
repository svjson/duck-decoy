/**
 * Type-helper for dynamically constructing a type-safe context during the PayloadBuilder
 * function chain.
 *
 * This utility type allows adding a new key-value pair to the context while preserving
 * the existing context properties.
 *
 * @template C - The current context type.
 * @template K - The key to add to the context.
 * @template V - The value type associated with the key.
 */
type CtxAdd<C, K extends string, V> = C &
  Record<K, V> & { [P in keyof C as P extends K ? never : P]: C[P] }

/**
 * Type-helper for dynamically constructing the resulting type of a groupBy
 * transformation.
 *
 * This utility type allows defining a context that includes the group key and an array
 * of values associated with that key.
 *
 * @template G - The group key type.
 * @template Vs - The values key type.
 * @template GK - The type of the group key.
 * @template VV - The type of the values in the group.
 */
type GroupCtx<G extends string, Vs extends string, GK, VV> = { [P in G]: Awaited<GK> } & {
  [P in Vs]: Awaited<VV>[]
}

/**
 * Async- and typesafe Payload-"builder" that incrementally transforms and introduces
 * records and relations.
 *
 * This is a functional API that allows you to build queries over a collection of records
 * with a context that can be extended with additional data.
 *
 * Example usage:
 * ```ts
 * import { each } from './payloadBuilder'
 * const payload = await from(users)
 *   .where(user => user.age > 18)
 *   .groupBy(user => user.country, user => user.name)
 *   .select({ group, records }) => ({
 *     country: group,
 *     names: records,
 *   }))
 * ```
 */
export interface PayloadBuilder<S, Ctx> {
  where(fn: (ctx: Ctx) => boolean | Promise<boolean>): PayloadBuilder<S, Ctx>

  groupBy<const G extends string, const Vs extends string, K extends PropertyKey, V = S>(
    names: [G, Vs],
    key: (row: S, ctx: Ctx) => K | Promise<K>,
    collect?: (row: S, ctx: Ctx) => V | Promise<V>
  ): PayloadBuilder<S, GroupCtx<G, Vs, Awaited<K>, Awaited<V>>>

  groupBy<
    K extends PropertyKey,
    V = S,
    G extends string = 'group',
    Vs extends string = 'records',
  >(
    key: (row: S, ctx: Ctx) => K | Promise<K>,
    collect?: (row: S, ctx: Ctx) => V | Promise<V>
  ): PayloadBuilder<S, GroupCtx<G, Vs, Awaited<K>, Awaited<V>>>

  with<K extends string, V>(
    key: K,
    fn: (ctx: Ctx) => V | Promise<V>
  ): PayloadBuilder<S, CtxAdd<Ctx, K, NonNullable<Awaited<V>>>>

  leftWith<K extends string, V>(
    key: K,
    fn: (ctx: Ctx) => V | Promise<V>
  ): PayloadBuilder<S, CtxAdd<Ctx, K, Awaited<V> | null | undefined>>

  select<O>(fn: (ctx: Ctx) => O | Promise<O>): Promise<O[]>
}

/**
 * Constructs an implementation of PayloadBuilder acording to the provided
 * type arguments. While internally dealing with any-types, the typed interface
 * maintains type-safety.
 *
 * This function is used internally by the `each` and `from` functions
 * to create new PayloadBuilder instances that can be used to incrementally build
 * payload types in a declarative style.
 *
 * @param items - The initial collection of items to build the payload from.
 * @param name - The name of the collection, used for context in queries.
 * @return A PayloadBuilder instance
 *
 * @template S - The type of the items in the collection.
 * @template N - The name of the collection, used for context in queries.
 */
const makeFrom = <S, N extends string>(
  items: Promise<S[]> | S[],
  name: N
): PayloadBuilder<S, Record<N, S>> => {
  let srcP = Promise.resolve(items)
  let steps: Array<(xs: any[]) => Promise<any[]>> = []

  const api: PayloadBuilder<S, any> = {
    groupBy(
      arg0:
        | readonly [string, string]
        | ((row: any, ctx: any) => PropertyKey | Promise<PropertyKey>),
      arg1: (row: any, ctx: any) => any,
      arg2?: (row: any, ctx: any) => any
    ) {
      const withNames = Array.isArray(arg0)
      const [groupName, recordsName] = withNames
        ? (arg0 as readonly [string, string])
        : ['group', 'records']
      const args = (withNames ? [arg1, arg2] : [arg0, arg1]) as Function[]
      const [key, collect] = args
      steps.push(async (xs) => {
        const m = new Map<any, any[]>()
        for (const x of xs) {
          const record = x[name]
          const k = await key(record, x)
          const v = collect ? await collect(record, x) : record
          ;(m.get(k) ?? (m.set(k, []), m.get(k)!)).push(v)
        }
        const out: any[] = []
        for (const [k, records] of m) out.push({ [groupName]: k, [recordsName]: records })
        return out
      })
      return api as any
    },
    where(fn) {
      steps.push(async (xs) => {
        const out: any[] = []
        for (const x of xs) if (await fn(x)) out.push(x)
        return out
      })
      return api as any
    },
    with(key, fn) {
      steps.push(async (xs) => {
        const out: any[] = []
        for (const x of xs) {
          const v = await fn(x)
          if (v == null) continue
          out.push({ ...x, [key]: v })
        }
        return out
      })
      return api as any
    },
    leftWith(key, fn) {
      steps.push(async (xs) => xs.map(async (x) => ({ ...x, [key]: await fn(x) })))
      steps.push(async (xs) => Promise.all(xs))
      return api as any
    },
    async select(fn) {
      let xs = (await srcP).map((item) => ({ [name]: item }))
      for (const step of steps) xs = await step(xs)
      return Promise.all(xs.map(fn))
    },
  }

  return api as any
}

/**
 * Entry point for payload builders, allowing the initial collection
 * to be named.
 *
 * @param name - The name of the collection, used for context in queries.
 * @return An object with a `from` method to start building queries.
 *
 * @template N - The name of the collection, used as key in the context.
 * @template S - The type of the items in the collection.
 */
export const each = <N extends string>(name: N) => {
  return {
    from<S>(items: Promise<S[]> | S[]) {
      return makeFrom<S, N>(items, name)
    },
  }
}

/**
 * Entry point for payload builders, generically naming the collection
 * elements `record`.
 *
 * @param items - The initial collection of items to build the payload from.
 * @return A PayloadBuilder instance
 *
 * @template S - The type of the items in the collection.
 */
export const from = <S>(items: Promise<S[]> | S[]) => {
  return makeFrom<S, 'record'>(items, 'record')
}
