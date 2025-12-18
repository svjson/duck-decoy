import {
  DefaultRecordKey,
  RecordCollection,
  RecordCriteria,
  WithoutIdentity,
} from './collection'
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
   * @see RecordCollection.deleteOne
   */
  async deleteOne(criteria?: RecordCriteria<IdentityType>) {
    const [index, match] = await this.findOneByCriteria(criteria)

    if (index !== -1) {
      this.records.splice(index, 1)
    }

    return match
  }

  /**
   * @see RecordCollection.insert
   */
  async insert(record: T | WithoutIdentity<T, IdentityKey>): Promise<T> {
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
   * Private utility function that locates a single record by
   * criteria along with its index in the collection array
   */
  private async findOneByCriteria(
    criteria?: RecordCriteria<IdentityType>
  ): Promise<[number, T | None]> {
    const index =
      criteria === null || criteria === undefined
        ? 0
        : this.records.findIndex(
          (r) => r[this.identity] === coerce(criteria, r[this.identity])
        )

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
   * @see RecordCollection.updateOne
   */
  async updateOne(
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
}
