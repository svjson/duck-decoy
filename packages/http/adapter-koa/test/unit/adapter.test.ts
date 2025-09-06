import { describe, expect, it } from 'vitest'
import KoaRouter from '@koa/router'
import DuckDecoyKoa from '../../src/index'
import { DecoyServer, DynamicRouteDef, RouteDef } from 'duck-decoy'
import { EndpointHandlerParams } from '../../../../duck-decoy/dist/src/endpoint'

const routerStackSummary = (router: KoaRouter) => {
  return router.stack.map((r) => ({ name: r.name, methods: r.methods, path: r.path }))
}

describe('DuckDecoyKoa', () => {
  describe('Route registration', () => {
    it('should accept registration of a single route', () => {
      // Given
      const ddKoa = new DuckDecoyKoa()
      const server = {
        root: '/api/v4',
      } as DecoyServer<any>

      // When
      ddKoa.registerRoute(
        {
          routeId: 'splendid-things-GET',
          method: 'GET',
          path: '/splendid/things',
          handler: async ({}: EndpointHandlerParams<any>): Promise<void> => {},
        },
        server
      )

      // Then
      expect(routerStackSummary(ddKoa.router)).toEqual([
        {
          methods: ['GET'],
          name: 'splendid-things-GET',
          path: '/api/v4/splendid/things',
        },
      ])
    })

    it('should accept registration of several routes with the same uri but distinct methods', () => {
      // Given
      const ddKoa = new DuckDecoyKoa()
      const server = {
        root: '/api/v4',
      } as DecoyServer<any>

      // When
      ddKoa.registerRoute(
        {
          routeId: 'splendid-things-GET',
          method: 'GET',
          path: '/splendid/things',
          handler: async ({}: EndpointHandlerParams<any>): Promise<void> => {},
        } as RouteDef<any>,
        server
      )
      ddKoa.registerRoute(
        {
          routeId: 'splendid-things-PUT',
          method: 'PUT',
          path: '/splendid/things',
          handler: async ({}: EndpointHandlerParams<any>): Promise<void> => {},
        } as DynamicRouteDef<any>,
        server
      )
      ddKoa.registerRoute(
        {
          routeId: 'splendid-things-DELETE',
          method: 'DELETE',
          path: '/splendid/things',
          handler: async ({}: EndpointHandlerParams<any>): Promise<void> => {},
        } as RouteDef<any>,
        server
      )

      // Then
      expect(routerStackSummary(ddKoa.router)).toEqual([
        {
          methods: ['GET'],
          name: 'splendid-things-GET',
          path: '/api/v4/splendid/things',
        },
        {
          methods: ['PUT'],
          name: 'splendid-things-PUT',
          path: '/api/v4/splendid/things',
        },
        {
          methods: ['DELETE'],
          name: 'splendid-things-DELETE',
          path: '/api/v4/splendid/things',
        },
      ])
    })
  })
})
