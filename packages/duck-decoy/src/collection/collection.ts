import { Query } from './query'
import { AsyncEventEmitter } from '@src/event'

import type {
  BeforeDeleteEvent,
  BeforeInsertEvent,
  BeforeUpdateEvent,
  DeleteEvent,
  InsertEvent,
  UpdateEvent,
} from './event'
import type { DefaultRecordKey, RecordCriteria, WithoutIdentity } from './types'

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
  private readonly events = new AsyncEventEmitter()

  /**
   * Register an event listener for an event type
   *
   * @param event Event name to listen to.
   * @param listener Listener callback to invoke when event is emitted.
   */
  on = this.events.on.bind(this.events)

  /**
   * Register a one-off event listener for an event type
   *
   * Once this event is emitted, the listener will be removed.
   *
   * @param event Event name to listen to.
   * @param listener Listener callback to invoke when event is emitted.
   */
  once = this.events.once.bind(this.events)

  /**
   * Remove an event listener for an event type
   *
   * @param event Event name to remove listener from.
   * @param listener Listener callback to remove.
   */
  off = this.events.off.bind(this.events)

  /**
   * Emit an event to all registered listeners
   *
   * @param event Event name to emit.
   * @param args Arguments to pass to event listeners.
   */
  protected async emit(event: string, ...args: any[]): Promise<boolean | void> {
    return await this.events.emit(event, ...args)
  }

  /**
   * Register an event handler for record insertion events.
   *
   * @param eventHandler Event handler callback to invoke on record insertion.
   *                     The event payload is BeforeInsertEvent and contains
   *                     the inserted record.
   */
  onInsert(eventHandler: (event: InsertEvent<T>) => void) {
    this.on('insert', eventHandler)
  }

  /**
   * Register an event handler for record deletion events.
   *
   * @param eventHandler Event handler callback to invoke on record deletion.
   *                     The event payload is DeleteEvent and contains
   *                     the deleted record and the criteria used to identify
   *                     it.
   */
  onDelete(eventHandler: (event: DeleteEvent<T, IdentityType>) => void) {
    this.on('delete', eventHandler)
  }

  /**
   * Register an event handler for record update events.
   *
   * @param eventHandler Event handler callback to invoke on record update.
   *                     The event payload is UpdateEvent and contains
   *                     the updated record, the original record and the
   *                     criteria used to identify it.
   */
  onUpdate(eventHandler: (event: UpdateEvent<T, IdentityType>) => void) {
    this.on('update', eventHandler)
  }

  /**
   * Register an event handler hook that runs before records are inserted.
   *
   * The event handler may return false to cancel/veto the insertion.
   *
   * @param eventHandler Event handler callback to invoke before record insertion.
   *                     The event payload is BeforeInsertEvent and contains
   *                     the record data to be inserted.
   */
  onBeforeInsert(eventHandler: (event: BeforeInsertEvent<T, IdentityKey>) => boolean) {
    this.on('beforeInsert', eventHandler)
  }

  /**
   * Register an event handler hook that runs before records are deleted.
   *
   * The event handler may return false to cancel/veto the deletion.
   *
   * @param eventHandler Event handler callback to invoke before record deletion.
   *                     The event payload is BeforeDeleteEvent and contains
   *                     the record data to be deleted and the criteria used to
   *                     identify it.
   */
  onBeforeDelete(
    eventHandler: (event: BeforeDeleteEvent<T, IdentityType, None>) => boolean
  ) {
    this.on('beforeDelete', eventHandler)
  }

  /**
   * Register an event handler hook that runs before records are updated.
   *
   * The event handler may return false to cancel/veto the update.
   *
   * @param eventHandler Event handler callback to invoke before record update.
   *                     The event payload is BeforeUpdateEvent and contains
   *                     the original record, the new record data and the criteria
   *                     used to identify it.
   */
  onBeforeUpdate(
    eventHandler: (
      event: BeforeUpdateEvent<T, IdentityType, IdentityKey, None>
    ) => boolean
  ) {
    this.on('beforeUpdate', eventHandler)
  }

  /**
   * Returns a promise that will be resolved once this RecordCollection
   * instance has completed its initialization and state setup.
   */
  abstract isInitialized(): Promise<void>

  /**
   * Reset the collection state/contents back to the initial construction
   * state.
   */
  abstract reset(): Promise<void>

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
   * Delete the first record matching a critera and return the deleted record, if any.
   *
   * @param criteria Criteria to match the record to delete.
   *
   * @return Promise resolving to the deleted record, or `None` if no record matched.
   *
   * @emits beforeDelete before deleting the record. Listeners to this event has the
   *                     option to cancel/veto the delete by return false.
   *
   * @emits delete after the record has been deleted.
   */
  async deleteOne(criteria?: RecordCriteria<IdentityType>): Promise<T | None> {
    const record = await this.findOne(criteria)
    const beforeResult = await this.emit('beforeDelete', { record, criteria })
    if (beforeResult === false || record === this.none) return this.none
    const deleted = await this.performDeleteOne(criteria)
    await this.emit('delete', { record: deleted as T, criteria } satisfies DeleteEvent<
      T,
      IdentityType
    >)
    return deleted
  }

  /**
   * Delete the first record matching a critera and return the deleted record, if any.
   *
   * This method is RecordCollection implementation-specific and deals only with the
   * actual record deletion and does not fire any events.
   *
   * @param criteria Criteria to match the record to delete.
   *
   * @return Promise resolving to the deleted record, or `None` if no record matched.
   */
  protected abstract performDeleteOne(
    criteria?: RecordCriteria<IdentityType>
  ): Promise<T | None>

  /**
   * Insert a record into the collection.
   *
   * If the collection is configured to auto-generate identity from a sequence, it
   * will override any provided identity.
   *
   * @param record Record to insert into the collection.
   *
   * @emits beforeInsert before inserting the record. Listeners to this event has the
   *                     option to cancel/veto the insert by return false.
   * @emits insert after the record has been inserted.
   *
   * @return Promise resolving to the inserted record.
   */
  async insert(record: T | WithoutIdentity<T, IdentityKey>): Promise<T> {
    const beforeResult = await this.emit('beforeInsert', { record })
    if (beforeResult === false) return this.none as unknown as T
    const inserted = await this.performInsert(record)
    await this.emit('insert', { record: inserted } satisfies InsertEvent<T>)
    return inserted
  }

  /**
   * Insert a record into the collection without emitting any events.
   *
   * This method is RecordCollection implementation-specific and deals only with the
   * actual record insertion and does not fire any events.
   *
   * @param record Record to insert into the collection.
   *
   * @return Promise resolving to the inserted record.
   */
  protected abstract performInsert(
    record: T | WithoutIdentity<T, IdentityKey>
  ): Promise<T>

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
  abstract findOne(criteria?: RecordCriteria<IdentityType>): Promise<T | None>

  /**
   * Find and update the first record matching the provided criteria, if any
   *
   * @param criteria Criteria to match the record.
   * @param record Record data to update the matching record with.
   *
   * @return Promise resolving to the updated record, or `None` if no record matched.
   */
  async updateOne(
    criteria: RecordCriteria<IdentityType>,
    record: WithoutIdentity<T, IdentityKey>
  ): Promise<T | None> {
    const original = await this.findOne(criteria)
    const beforeResult = await this.emit('beforeUpdate', { record, original, criteria })
    if (beforeResult === false) return this.none
    const updated = await this.performUpdateOne(criteria, record)
    if (updated !== this.none) {
      await this.emit('update', {
        record: updated as T,
        original: original as T,
        criteria,
      } satisfies UpdateEvent<T, IdentityType>)
    }
    return updated
  }

  /**
   * Find and update the frist record matching the provided criteria, if any.
   * This method should not fire any events
   *
   * This method is provided by each concrete RecordCollection implementation,
   * and is used internally by `insert`.
   */
  protected abstract performUpdateOne(
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
