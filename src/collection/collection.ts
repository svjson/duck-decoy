export type WithoutIdentity<T, I extends keyof T> = Omit<T, I>

export type DefaultRecordKey<T> = 'id' extends keyof T ? 'id' : never

/**
 * Abstract base for RecordCollection.
 *
 * Defines a generic interface that provides generic methods to interact with
 * state in the form a collections of records.
 */
export abstract class RecordCollection<
  T = any,
  IdentityKey extends keyof T = DefaultRecordKey<T>,
  IdentityType = any,
  None = undefined,
> {
  abstract count(): Promise<number>
  abstract deleteOne(criteria: RecordCriteria<IdentityType>): Promise<T | None>
  abstract insert(record: WithoutIdentity<T, IdentityKey>): Promise<T>
  abstract find(): Promise<T[]>
  abstract findOne(criteria: RecordCriteria<IdentityType>): Promise<T | None>
  abstract updateOne(
    criteria: RecordCriteria<IdentityType>,
    record: WithoutIdentity<T, IdentityKey>
  ): Promise<T | None>
  abstract get identity(): IdentityKey
  abstract get none(): None
}

export type RecordCriteria<Identity> = Identity
