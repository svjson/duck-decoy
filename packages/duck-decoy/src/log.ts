import { DuckDecoyRequest } from './http'
import { RouteDef } from './types'

/**
 * Request log for fake http servers. Stores recorded request entries
 * both in a flat array and grouped by routeId for easier access.
 */
export class RequestLog {
  entries: RequestLogEntry[] = []

  byRouteId(routeId: string) {
    return this.entries.filter((e) => e.routeId === routeId)
  }

  statusCodes() {
    return this.entries.map((e) => e.statusCode)
  }

  /**
   * Log an incoming request for the purposes of inspecting and verifying
   * interactions with a DecoyServer.
   *
   * Returns the logged entry, allowing the logging handler to encode
   * response information once the response has been handled.
   *
   * @param request - The DuckDecoyRequest that is being logged
   * @param route - The RouteDef whose endpoint the request invoked
   *
   * @return The logged RequestLogEntry
   */
  logRequest(request: DuckDecoyRequest, route: RouteDef<any>): RequestLogEntry {
    const logEntry = {
      routeId: route.routeId,
      pattern: route.path,
      path: request.url,
      queryParams: { ...request.queryParameters },
    }

    this.entries.push(logEntry)

    return logEntry
  }

  reset() {
    this.entries = []
  }
}

/**
 * The format of logged/recorded requests in the `RequestLog` of
 * a fake server.
 */
export interface RequestLogEntry {
  routeId: string
  pattern: string
  path: string
  queryParams: Record<string, string>
  error?: string
  statusCode?: number
}
