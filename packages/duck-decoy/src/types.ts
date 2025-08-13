import { HttpMethod } from './http'
import {
  EndpointHandlerFunction,
  EndpointHandlerParams,
  EndpointResponseFormatter,
} from './endpoint'

/**
 * Used to define a route in the fake server
 */
export type RouteDef<State = unknown> = {
  routeId: string
  method: HttpMethod
  path: string
  handler: EndpointHandlerFunction<State>
  responseFormatter?: EndpointResponseFormatter<State>
}

export type RequestPreHandlerFunction<State> = (
  params: EndpointHandlerParams<State>
) => Promise<void>

export interface RequestPreHandler<State> {
  include?: string[]
  exclude?: string[]
  handler: RequestPreHandlerFunction<State>
}

export const datesBetween = (
  startYMD: string,
  endYMD: string,
  opts: { inclusive?: boolean } = {}
): string[] => {
  const inclusive = opts.inclusive ?? true

  const toUTC = (ymd: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
    if (!m) throw new Error(`Bad date: ${ymd}`)
    const [_, y, mo, d] = m
    return new Date(Date.UTC(+y, +mo - 1, +d))
  }

  let a = toUTC(startYMD)
  let b = toUTC(endYMD)
  if (a > b) [a, b] = [b, a]

  const cur = new Date(a)
  const stop = new Date(b)
  if (!inclusive) {
    cur.setUTCDate(cur.getUTCDate() + 1)
    stop.setUTCDate(stop.getUTCDate() - 1)
  }

  const out: string[] = []
  while (cur <= stop) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
