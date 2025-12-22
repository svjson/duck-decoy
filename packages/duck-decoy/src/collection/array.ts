import { RecordCollection } from './collection'
import { DefaultRecordKey, RecordCriteria, WithoutIdentity } from './types'
import { coerce, IdGenerator, makeAutoIncGenerator } from './identity'
import { filterQuery, Query } from './query'

interface ArrayCollectionConfiguration<IdentityKey, None> {
  identity: IdentityKey
  none: None
}

/**
 * Basic Array-backed implementation of RecordCollection
 *
 * Keeps Record state in-memory until destroyed.
 *
 * @template T Type of records stored in the collection.
 * @template IdentityKey Key of the record property that serves as identity.
 * @template IdentityType Type of the identity property.
 * @template None Type representing absence of a record
 *
 * @see RecordCollection
 */
export class ArrayCollection<
  T = any,
  IdentityKey extends keyof T = DefaultRecordKey<T>,
  IdentityType = any,
  None = undefined,
> extends RecordCollection<T, IdentityKey, IdentityType, None> {
  #initialRecords: T[]
  records: T[]
  config: ArrayCollectionConfiguration<IdentityKey, None>
  idGenerator: IdGenerator

  /**
   * Construct a new ArrayCollection instance
   *
   * @param records Optional initial records to populate the collection with.
   * @param config Configuration options for the collection.
   */
  constructor(
    records?: T[],
    config?: Partial<ArrayCollectionConfiguration<IdentityKey, None>>
  ) {
    super()
    this.records = [...(records ?? [])]
    this.#initialRecords = this.records.map((r) => structuredClone(r))
    this.config = {
      identity: (config?.identity ?? 'id') as IdentityKey,
      none: config?.none!,
    }
    this.idGenerator = makeAutoIncGenerator(this.records, this.config.identity as string)
  }

  /**
   * ArrayCollection is entirely synchronous in its construction and will
   * always return a resolved Promise.
   *
   * @see RecordCollection.isInitialized
   */
  public isInitialized(): Promise<void> {
    return Promise.resolve()
  }

  /**
   * Reset the collection state to its initial state
   */
  async reset() {
    await this.clear()
    this.idGenerator.reset()
    for (const r of this.#initialRecords) {
      await this.insert(r)
    }
  }

  /**
   * @see RecordCollection.clear
   */
  async clear() {
    const deleted = [...this.records]
    this.records.length = 0
    return deleted
  }

  /**
   * @see RecordCollection.count
   */
  async count() {
    return this.records.length
  }

  /**
   * @see RecordCollection.performDeleteOne
   */
  override async performDeleteOne(criteria?: RecordCriteria<IdentityType>) {
    const [index, match] = await this.findOneByCriteria(criteria)

    if (index !== -1) {
      this.records.splice(index, 1)
    }

    return match
  }

  /**
   * @see RecordCollection.performInsert
   */
  override async performInsert(record: T | WithoutIdentity<T, IdentityKey>): Promise<T> {
    const newRecord: T = Object.keys(record as any).includes(this.identity as string)
      ? (record as T)
      : ({
          ...record,
          [this.config.identity]: (await this.idGenerator.next()) as IdentityType,
        } as T)
    this.records.push(newRecord)
    return newRecord
  }

  /**
   * @see RecordCollection.find
   */
  async find(query?: Query<T> | RecordCriteria<T>) {
    if (query === undefined || query === null) {
      return this.records
    }

    return filterQuery(this.records, query as Query<T>)
  }

  /**
   * Private utility function that finds a record index by its identity
   *
   * @param criteria Identity value
   * @return Index of the record in the collection array, or -1 if not found
   */
  private findIndexByIdentity(criteria: RecordCriteria<IdentityType>): number {
    const identity = coerce<IdentityType>(criteria)
    if (identity == null) return -1
    return this.records.findIndex(
      (r) => r[this.identity] === coerce(criteria, r[this.identity])
    )
  }

  /**
   * Private utility function that finds the index of the first record
   * matching the provided criteria or query.
   *
   * @param criteria Criteria or query to match records.
   * @return Index of the first matching record, or -1 if none matched.
   */
  private async findFirstIndex(
    criteria?: Query<T> | RecordCriteria<IdentityType>
  ): Promise<number> {
    if (criteria == null) return 0

    const indexByIdentity = this.findIndexByIdentity(
      criteria as RecordCriteria<IdentityType>
    )
    if (indexByIdentity !== -1) return indexByIdentity

    const match = filterQuery(this.records, criteria as Query<T>)[0]
    if (!match) return -1
    return this.findIndexByIdentity(match[this.identity] as IdentityType)
  }

  /**
   * Private utility function that locates a single record by
   * criteria along with its index in the collection array
   */
  private async findOneByCriteria(
    criteria?: Query<T> | RecordCriteria<IdentityType>
  ): Promise<[number, T | None]> {
    const index = await this.findFirstIndex(criteria)

    if (index === -1) return [-1, this.none]

    return [index, this.records[index]]
  }

  /**
   * @see RecordCollection.findOne
   */
  async findOne(criteria?: RecordCriteria<IdentityType>) {
    const [_, match] = await this.findOneByCriteria(criteria)
    return match
  }

  /**
   * @see RecordCollection.performUpdateOne
   */
  async performUpdateOne(
    criteria: RecordCriteria<IdentityType>,
    record: WithoutIdentity<T, IdentityKey>
  ): Promise<T | None> {
    const [index, match] = await this.findOneByCriteria(criteria)
    if (index === -1 || match === this.none) return this.none

    const updated = {
      ...record,
      [this.identity]: (match as T)[this.identity],
    } as T

    this.records[index] = updated
    return updated
  }

  /**
   * @see RecordCollection.identity
   */
  public get identity(): IdentityKey {
    return this.config.identity
  }

  /**
   * @see RecordCollection.none
   */
  public get none(): None {
    return this.config?.none as None
  }
}
