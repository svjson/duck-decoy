/**
 * Type-utility used to refer to RecordCollection record without its
 * identifying key
 *
 * @example
 * ```ts
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 * }
 *
 * // WithoutIdentity<User, 'id'> is Equivalent to:
 * interface UserWithoutId {
 *   name: string
 *   email: string
 * }
 * ```
 *
 * @template T - Record type
 * @template I - Key of the identity property
 */
export type WithoutIdentity<T, I extends keyof T> = Omit<T, I>

/**
 * Type-utility used to determine the default identity key of a record type.
 *
 * The type value must be an existing key of T.
 *
 * @template T - Record type
 */
export type DefaultRecordKey<T> = 'id' extends keyof T ? 'id' : never

/**
 * Type-utility used to refer to RecordCollection identity criteria
 * of type Identity.
 *
 * FIXME: This should expand to include all valid criteria or queries that
 * can be used to match against a record.
 */
export type RecordCriteria<Identity> = Identity
