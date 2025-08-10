import { EndpointHandler, HttpMethod } from './types'

export type StateEndpointsConfiguration<State> = Record<
  string,
  EndpointConfiguration<State>
>

export interface EndpointResponseFormatterParams<State> {
  payload?: any
  state: State
}

export type EndpointResponseFormatter<State> = (
  params: EndpointResponseFormatterParams<State>
) => Promise<void>

export interface EndpointDeclaration<State> {
  method?: HttpMethod
  formatter?: EndpointResponseFormatter<State>
  handler: EndpointHandler
}

export type EndpointConfiguration<State> =
  | Object
  | EndpointHandler
  | EndpointDeclaration<State>
