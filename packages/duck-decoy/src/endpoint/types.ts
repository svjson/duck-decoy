import { RecordCollection } from '@src/collection'
import { HttpMethod, DuckDecoyRequest, DuckDecoyResponse } from '@src/http'
import { RouteDocumentation } from '@src/route/types'

/**
 * The main `endpoints` configuration object of a Decoy Server configuration.
 *
 * Endpoints are configured by paths as key and any form of
 * `EndpointConfiguration` as their values.`.
 *
 * This is used to define the endpoints that the server will respond to,
 * and how they will handle requests - fake, mock or static.
 *
 * Each endpoint can have its own configuration, which may include
 * a handler function, a collection of records, or a static response.
 *
 * @example
 * ```ts
 * const endpoints: EndpointsConfiguration<MyState> = {
 *   '/users': {
 *     method: 'GET',
 *     handler: async ({ request, response, state }) => {
 *       const users = state.users || []
 *       response.status(200).body(users)
 *   },
 * }
 *
 * @template State - The type of the state object that the endpoints will use.
 */
export type EndpointsConfiguration<State> = Record<string, EndpointConfiguration<State>>

/**
 * Compound type describing all valid options for configuring and endpoint in
 * `EndpointsConfiguration`.
 *
 * This can be an object with a handler function, a static response,
 * or an `EndpointDeclaration` that includes a method, handler function and optional formatter.
 */
export type EndpointConfiguration<State> =
  | Object
  | EndpointHandlerFunction<State>
  | EndpointDeclaration<State>

/**
 * The parameter/argument structure of any endpoint handler function or processor.
 * It contains the request and response objects, an optional collection
 * of records, and the current state of record of the server.
 *
 * @template State - The type of the state that the DecoyServer handling the request
 * has been declared to use.
 */
export interface EndpointHandlerParams<State = any> {
  request: DuckDecoyRequest
  response: DuckDecoyResponse
  collection?: RecordCollection
  state: State
}

/**
 * Handler function type - any function that handles a decoy request.
 *
 * @template State - The type of the state that the DecoyServer handling the request
 * has been declared to use.
 */
export type EndpointHandlerFunction<State> = (
  params: EndpointHandlerParams<State>
) => Promise<void>

/**
 * Parameter object accepted by EndpointResponseFormatter
 *
 * Gives access to the DuckDecoyRequest, DuckDecoyResponse, the State and a
 * shortcut to the response payload produced by a request handler.
 */
export interface EndpointResponseFormatterParams<State> {
  payload?: any
  request: DuckDecoyRequest
  response: DuckDecoyResponse
  state: State
}

/**
 * Formatter function interface - post-response function that optionally performs
 * a last transform pass of the response payload before sending.
 */
export type EndpointResponseFormatter<State> = (
  params: EndpointResponseFormatterParams<State>
) => Promise<any>

export interface EndpointDeclaration<State> {
  method?: HttpMethod
  docs?: RouteDocumentation
  formatter?: EndpointResponseFormatter<State>
  handler: EndpointHandlerFunction<State>
}
