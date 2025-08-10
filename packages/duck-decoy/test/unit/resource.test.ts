import { describe, expect, it } from 'vitest'
import { ResourceRouteBuilder } from '@src/resource'
import { ArrayCollection } from '@src/collection'

describe('ResourceRouteBuilder', () => {
  it('should generate zero routes if build is called immediately', () => {
    expect(
      new ResourceRouteBuilder('cheeses', new ArrayCollection([]), 'id').build()
    ).toEqual([])
  })

  it('should generate a get-by-id route for .getOne().byIdentity()', () => {
    expect(
      new ResourceRouteBuilder('cheeses', new ArrayCollection([]), 'id')
        .route((r) => r.getOne().byIdentity())
        .build()
    ).toEqual([
      {
        routeId: 'cheeses-GET(id)',
        method: 'GET',
        path: '/cheeses/:id',
        handler: expect.any(Function),
      },
    ])
  })

  it('should generate a full set of semi-RESTful CRUD-routes for .coreCrudRoutes()', () => {
    expect(
      new ResourceRouteBuilder('cheeses', new ArrayCollection([]), 'id')
        .coreCrudRoutes()
        .build()
    ).toEqual([
      {
        routeId: 'cheeses-POST',
        method: 'POST',
        path: '/cheeses',
        handler: expect.any(Function),
      },
      {
        routeId: 'cheeses-GET',
        method: 'GET',
        path: '/cheeses',
        handler: expect.any(Function),
      },
      {
        routeId: 'cheeses-GET(id)',
        method: 'GET',
        path: '/cheeses/:id',
        handler: expect.any(Function),
      },
      {
        routeId: 'cheeses-PUT(id)',
        method: 'PUT',
        path: '/cheeses/:id',
        handler: expect.any(Function),
      },
      {
        routeId: 'cheeses-DELETE(id)',
        method: 'DELETE',
        path: '/cheeses/:id',
        handler: expect.any(Function),
      },
    ])
  })
})
