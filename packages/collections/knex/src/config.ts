import { Knex } from 'knex'

export interface KnexRecordCollectionConfig {
  client: 'sqlite' | 'pg' | 'mysql2' | 'mssql'
  connection: Knex.StaticConnectionConfig | string

  /**
   * Whether to auto-initialize the DB schema.
   * - "never": assume DB exists already
   * - "create": create tables if missing
   * - "migrate": run full migrations
   */
  initialize: 'never' | 'create' | 'migrate'

  /**
   * Optional path to migrations folder.
   * If `initialize = 'migrate'` and this is not supplied, error.
   */
  migrationsDir?: string

  /**
   * Optionally allow Duck Decoy to seed demo data.
   */
  seed?: {
    enabled: boolean
    file?: string | (() => Promise<void>)
  }
}
