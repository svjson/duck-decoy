import { RouteDef } from './route'
import { DecoyServer } from './server'

export interface DuckDecoyPlugin {
  makePluginRoutes: (server: DecoyServer<any>) => RouteDef<any>[]
}
