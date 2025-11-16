import { Query } from './query'

export type WithoutIdentity<T, I extends keyof T> = Omit<T, I>

export type DefaultRecordKey<T> = 'id' extends keyof T ? 'id' : never

export type RecordCriteria<Identity> = Identity

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
  /**
   * Clear the collection of all records and return deleted records.
   *
   * Return value may vary depending on implementation.
   *
   * @return Promise resolving to an array of deleted records or empty array.
   */
  abstract clear(): Promise<T[]>

  /**
   * Return the total amount of records in this collection.
   *
   * @return Promise resolving to the number of records in the collection.
   */
  abstract count(): Promise<number>

  /**
   * Delete first record matching a critera and return the deleted record, if any.
   *
   * @param criteria Criteria to match the record to delete.
   *
   * @return Promise resolving to the deleted record, or `None` if no record matched.
   */
  abstract deleteOne(criteria: RecordCriteria<IdentityType>): Promise<T | None>

  /**
   * Insert a record into the collection.
   *
   * If the collection is configured to auto-generate identity from a sequence, it
   * will override any provided identity.
   *
   * @param record Record to insert into the collection.
   *
   * @return Promise resolving to the inserted record.
   */
  abstract insert(record: T | WithoutIdentity<T, IdentityKey>): Promise<T>

  /**
   * Find any amount records matching the provided query.
   *
   * @param query Query or criteria to match records.
   *
   * @return Promise resolving to an array of matching records.
   */
  abstract find(query?: Query<T> | RecordCriteria<T>): Promise<T[]>

  /**
   * Find and return the first record matching the provided criteria, if any
   *
   * @param criteria Criteria to match the record.
   *
   * @return Promise resolving to the matching record, or `None` if no record matched.
   */
  abstract findOne(criteria: RecordCriteria<IdentityType>): Promise<T | None>

  /**
   * Find and update the frist record matching the provided criteria, if any
   *
   * @param criteria Criteria to match the record.
   * @param record Record data to update the matching record with.
   *
   * @return Promise resolving to the updated record, or `None` if no record matched.
   */
  abstract updateOne(
    criteria: RecordCriteria<IdentityType>,
    record: WithoutIdentity<T, IdentityKey>
  ): Promise<T | None>

  /**
   * Get the identity key for records in this collection.
   */
  abstract get identity(): IdentityKey
  /**
   * Get the value/null-object representing "no record" in this collection.
   */
  abstract get none(): None
}
