import knex, { Knex } from 'knex'
import { execSync } from 'node:child_process'
import { beforeAll } from 'vitest'

const ensureSQLServer = () => {
  execSync('docker compose up -d sql', {
    stdio: 'inherit',
  })
}

export const stopSQLServer = () => {
  execSync('docker compose down', {
    stdio: 'inherit',
  })
}

const waitForSQLServer = () => {
  execSync(
    'docker inspect dd-knex-mssql --format "{{.State.Health.Status}}" | grep healthy',
    {
      stdio: 'inherit',
    }
  )
}

const waitUntilHealthy = async (retries = 30) => {
  for (let i = 0; i < retries; i++) {
    try {
      waitForSQLServer()
      return
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  throw new Error('SQL Server failed to start in time.')
}

export const connect = (database: string): Knex => {
  return knex({
    client: 'mssql',
    connection: {
      host: 'localhost',
      port: 1444,
      user: 'sa',
      password: 's3cr3t_p455w0rd',
      database: database,
      options: {
        trustServerCertificate: true,
      },
    },
  })
}

export async function ensureTestDatabase() {
  const adminKnex = connect('master')

  await adminKnex.raw(`
    IF DB_ID('duckdecoy_test') IS NULL
      CREATE DATABASE duckdecoy_test;
  `)

  await adminKnex.destroy()
}

let testKnex: Knex | null = null

export const getTestDB = async (): Promise<Knex> => {
  if (!testKnex) {
    testKnex = connect('duckdecoy_test')
  }

  return testKnex
}

export const ensureTable = async (
  db: Knex,
  table: string,
  builder: (t: knex.Knex.CreateTableBuilder) => any
) => {
  if (await db.schema.hasTable(table)) {
    await db.schema.dropTable(table)
  }

  await db.schema.createTable(table, builder)
}

beforeAll(async () => {
  ensureSQLServer()
  await waitUntilHealthy()
  await ensureTestDatabase()
}, 60000)
