import {
  DefaultRecordKey,
  WithoutIdentity,
  RecordCollection,
  RecordCriteria,
} from './collection'
import { coerce, IdGenerator, makeAutoIncGenerator } from './identity'

interface ArrayCollectionConfiguration<IdentityKey, None> {
  identity: IdentityKey
  none: None
}

export class ArrayCollection<
  T = any,
  IdentityKey extends keyof T = DefaultRecordKey<T>,
  IdentityType = any,
  None = undefined,
> extends RecordCollection<T, IdentityKey, IdentityType, None> {
  records: T[]
  config: ArrayCollectionConfiguration<IdentityKey, None>
  idGenerator: IdGenerator

  constructor(
    records: T[],
    config?: {
      identity: IdentityKey
      none?: None
    }
  ) {
    super()
    this.records = [...records]
    this.config = {
      identity: (config?.identity ?? 'id') as IdentityKey,
      none: config?.none!,
    }
    this.idGenerator = makeAutoIncGenerator(this.records, this.config.identity as string)
  }

  public get identity(): IdentityKey {
    return this.config.identity
  }

  public get none(): None {
    return this.config?.none as None
  }

  async count() {
    return this.records.length
  }

  async deleteOne(criteria?: RecordCriteria<IdentityType>) {
    const [index, match] = await this.findByCriteria(criteria)

    if (index !== -1) {
      this.records.splice(index, 1)
    }

    return match
  }

  async insert(record: WithoutIdentity<T, IdentityKey>): Promise<T> {
    const newRecord: T = {
      ...record,
      [this.config.identity]: (await this.idGenerator.next()) as IdentityType,
    } as T
    this.records.push(newRecord)
    return newRecord
  }

  async find() {
    return this.records
  }

  private async findByCriteria(
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

  async findOne(criteria?: RecordCriteria<IdentityType>) {
    const [_, match] = await this.findByCriteria(criteria)
    return match
  }

  async updateOne(
    criteria: RecordCriteria<IdentityType>,
    record: WithoutIdentity<T, IdentityKey>
  ): Promise<T | None> {
    const [index, match] = await this.findByCriteria(criteria)
    if (index === -1 || match === this.none) return this.none

    const updated = {
      ...record,
      [this.identity]: (match as T)[this.identity],
    } as T

    this.records[index] = updated
    return updated
  }
}
