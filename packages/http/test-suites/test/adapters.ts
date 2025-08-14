import { DuckDecoyFastify as FastifyAdapter } from '@duck-decoy/fastify'
import { DuckDecoyKoa as KoaAdapter } from '@duck-decoy/koa'

export const HTTP_ADAPTERS = [FastifyAdapter, KoaAdapter]
