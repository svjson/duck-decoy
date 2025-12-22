import { RecordCriteria, WithoutIdentity } from './types'
import { Query } from './query'

/**
 * Common base for all events emitted after a successful
 * Record-operation
 *
 * @template T - Record type
 */
export interface RecordEvent<T> {
  record: T
}

/**
 * Common base for all events emitted after a successful
 * Record-operation that involve criteria or queries.
 *
 * @template T - Record type
 * @template I - Identity type
 */
export interface RecordCriteriaEvent<T, I> extends RecordEvent<T> {
  criteria?: T | RecordCriteria<I> | Query<T>
}

/**
 * Event emitted after a successful Record insertion
 *
 * @template T - Record type
 */
export type InsertEvent<T> = RecordEvent<T>

/**
 * Event emitted after a successful Record update
 *
 * @template T - Record type
 * @template I - Identity type
 */
export interface UpdateEvent<T, I = any> extends RecordCriteriaEvent<T, I> {
  original: T
}

/**
 * Event emitted after a successful Record deletion
 *
 * @template T - Record type
 * @template I - Identity type
 */
export type DeleteEvent<T, I> = RecordCriteriaEvent<T, I>

/**
 * Event emitted before a Record insertion
 *
 * The `record` field refers to the record data pre-adjustment for
 * key assignment.
 *
 * @template T - Record type
 * @template K - Key of the identity property
 */
export interface BeforeInsertEvent<T, K extends keyof T> {
  record: T | WithoutIdentity<T, K>
}

/**
 * Event emitted before a Record update
 *
 * The `record` field refers to the record data pre-adjustment for
 * key assignment or property merge.
 *
 * The `original` field refers to the existing record data prior to
 * the update.
 *
 * The `criteria` field is the criteria or query used to match records
 * for update.
 *
 * @template T - Record type
 */
export interface BeforeUpdateEvent<T, I, K extends keyof T, None> {
  original: T | None
  record: T | WithoutIdentity<T, K>
  criteria?: RecordCriteria<I> | Query<T>
}

/**
 * Event emitted before a Record deletion
 *
 * The `record` field refers to the record identified and selected for
 * deletion.
 *
 * The `criteria` field is the criteria or query used to match records
 * for update.
 *
 * @template T - Record type
 */
export interface BeforeDeleteEvent<T, I, None> {
  record: T | None
  criteria?: RecordCriteria<I> | Query<T>
}
