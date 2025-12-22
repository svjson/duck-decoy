import {
  DefaultRecordKey,
  Query,
  RecordCollection,
  RecordCriteria,
  WithoutIdentity,
} from 'duck-decoy'
import { Knex } from 'knex'

interface KnexCollectionConfiguration<IdentityKey, None> {
  identity: IdentityKey
  none: None
}

/**
 * Implementation of RecordCollection that is backed by a single database
 * table through knex.
 *
 * Records are stored in the specified table, and all operations are
 * performed through knex queries.
 *
 * Keeps no in-memory state except during initialization and a copy of
 * the record array given during construction, which can be used to
 * revert the collection back to its initial state.
 *
 * The implementation is designed to be generic and work with any SQL
 * database supported by knex. The application that uses this class is
 * responsible for pulling in the relevant knex-compatible database
 * drivers.
 *
 * @template T Type of records stored in the collection.
 * @template IdentityKey Key of the record property that serves as
 *           identity / primary key
 * @template IdentityType Type of the identity property.
 * @template None Type representing absence of a record
 *
 * @see RecordCollection
 */
export class KnexCollection<
  T extends object = Record<string, unknown>,
  IdentityKey extends keyof T = DefaultRecordKey<T>,
  IdentityType = any,
  None = undefined,
> extends RecordCollection<T, IdentityKey, IdentityType, None> {
  #initialRecords: T[]
  #initialized: Promise<void>

  config: KnexCollectionConfiguration<IdentityKey, None>

  /**
   * Construct a new KnexCollection instance.
   *
   * @param knex Knex instance to use for database operations.
   * @param table Name of the database table to use for storing records.
   * @param records Optional initial records to populate the table with.
   * @param config Configuration options for the collection.
   */
  constructor(
    private knex: Knex,
    public table: string,
    records?: T[],
    config?: Partial<KnexCollectionConfiguration<IdentityKey, None>>
  ) {
    super()
    this.#initialRecords = records ?? []
    this.config = {
      identity: (config?.identity ?? 'id') as IdentityKey,
      none: config?.none!,
    }

    this.#initialized = this.#_populate()
  }

  /**
   * Populate the table with initial records.
   *
   * The resulting promise is the same promise that will be returned by
   * `isInitialized`.
   */
  async #_populate(): Promise<void> {
    await this.clear()
    for (const record of this.#initialRecords) {
      await this.insert(record)
    }
  }

  /**
   * Returns a promise that resolves when the initial population of the table
   * is completed.
   *
   * @see RecordCollection.isInitialized
   */
  isInitialized(): Promise<void> {
    return this.#initialized
  }

  /**
   * Resets the collection contents back to its initial values.
   *
   * This does not affect the table state of the SQL backend, ie any autoinc
   * generators.
   */
  async reset(): Promise<void> {
    await this.#_populate()
  }

  /**
   * Clear the contents of this collection.
   *
   * Deletes all rows in the database table.
   */
  async clear(): Promise<T[]> {
    await this.knex(this.table).delete()
    return []
  }

  /**
   * Return the total count of records in this collection.
   *
   * Equivalent of 'SELECT COUNT(*) FROM <table_name>'
   *
   * @returns The total number of records in this collection.
   */
  async count(): Promise<number> {
    const result =
      await this.knex('species').count<{ recordCount: number }[]>('* as recordCount')
    return result[0].recordCount
  }

  /**
   * Delete first record matching a criteria and return the deleted record, if any.
   *
   * @see RecordCollection.performDeleteOne
   */
  protected override async performDeleteOne(
    criteria?: RecordCriteria<IdentityType>
  ): Promise<T | None> {
    const row = await this.findOne(criteria)
    if (row === this.none || row === undefined || row === null) return row

    const actualRow = row as T

    await this.knex(this.table)
      .where({
        [this.identity]: actualRow[this.identity],
      })
      .delete()

    return actualRow
  }

  /**
   * Insert a record into this collection.
   *
   * @see RecordCollection.performInsert
   */
  protected override async performInsert(
    record: T | WithoutIdentity<T, IdentityKey>
  ): Promise<T> {
    const objProperties = Object.keys(record as any)
    if (!objProperties.includes(String(this.identity))) {
      objProperties.unshift(String(this.identity))
    }
    const insertResult = await this.knex(this.table)
      .insert(record)
      .returning(objProperties)
    const obj = {} as any
    insertResult.forEach((val, i) => {
      obj[objProperties[i]] = val
    })
    return obj as T
  }

  /**
   * Find records matching the provided query.
   *
   * @see RecordCollection.find
   */
  async find(query?: T | Query<T> | undefined): Promise<T[]> {
    if (query === undefined || query === null) {
      const rows = await this.knex(this.table).select<T>()
      return rows as T[]
    }
    const rows = await this.knex(this.table).where(query).select<T>()
    return rows as T[]
  }

  /**
   * Find and return the first record matching the provided criteria, if any.
   *
   * @see RecordCollection.findOne
   */
  async findOne(criteria?: RecordCriteria<IdentityType>): Promise<T | None> {
    if (criteria === undefined || criteria === null) {
      const result = (await this.knex(this.table).limit(1).select<T>()) as T[]
      if (result.length === 0) {
        return this.none
      }
      return result[0]
    }

    const result = (await this.knex(this.table)
      .limit(1)
      .where(
        ['string', 'number'].includes(typeof criteria)
          ? { [this.identity]: criteria }
          : criteria
      )
      .select<T>()) as T[]
    return result[0] ?? this.none
  }

  /**
   * Update a single record matching the provided criteria, if any.
   *
   * @see RecordCollection.performUpdateOne
   */
  protected override async performUpdateOne(
    criteria: IdentityType,
    record: WithoutIdentity<T, IdentityKey>
  ): Promise<T | None> {
    const row = await this.findOne(criteria)
    if (row === this.none || row === undefined || row === null) return row

    const actualRow = row as T
    Object.assign(actualRow, record)
    await this.knex(this.table)
      .update(actualRow)
      .where({ [this.identity]: actualRow[this.identity] })
    return actualRow
  }

  /**
   * Get the identity key for records in this collection.
   *
   * @see RecordCollection.identity
   */
  get identity(): IdentityKey {
    return this.config.identity
  }

  /**
   * Get the value/null-object representing "no record" in this collection.
   *
   * @see RecordCollection.none
   */
  get none(): None {
    return this.config.none
  }
}
