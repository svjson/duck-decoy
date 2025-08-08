import { RecordCollection, WithoutIdentity } from './collection/collection'
import { formatUri } from './endpoint'
import { HttpMethod, RouteDef, EndpointHandlerParams, EndpointHandler } from './types'

type ResourceIdentifier = 'identity' | 'all'
type ResourceResultType = 'none' | 'single' | 'list'

interface ResourceHandlerInputs<R, K extends keyof R, I, N> {
  method: HttpMethod
  collection: RecordCollection<R, K, I, N>
  resourceIdentifier: ResourceIdentifier
}

type ResourceHandlerFactoryFunction<R, K extends keyof R, I, N> = (
  inputs: ResourceHandlerInputs<R, K, I, N>
) => EndpointHandler

type ResourceHandlerDeclaration =
  | Record<ResourceIdentifier, ResourceHandlerFactoryFunction<any, any, any, any>>
  | ResourceHandlerFactoryFunction<any, any, any, any>

const RESOURCE_HANDLER_FACTORY_FUNCTIONS: Record<HttpMethod, ResourceHandlerDeclaration> =
  {
    GET: {
      all:
        ({ collection }: ResourceHandlerInputs<any, any, any, any>) =>
        async ({ reply }: EndpointHandlerParams): Promise<void> => {
          reply.code(200).send(await collection.find())
        },
      identity:
        ({ collection }: ResourceHandlerInputs<any, any, any, any>) =>
        async ({ req, reply }: EndpointHandlerParams): Promise<void> => {
          const result = await collection.findOne(
            (req.params as any)?.[collection.identity]
          )
          if (result === undefined) {
            reply.code(404).send(collection.none)
          } else {
            reply.code(200).send(result)
          }
        },
    },
    PUT:
      <R, K extends keyof R, I, N>({ collection }: ResourceHandlerInputs<R, K, I, N>) =>
      async ({ req, reply }) => {
        const updated = await collection.updateOne(
          (req.params as any)[collection.identity],
          req.body as WithoutIdentity<R, K>
        )
        if (updated) {
          reply.code(200).send(updated)
        } else {
          reply.code(404).send()
        }
      },
    POST:
      <R, K extends keyof R, I, N>({ collection }: ResourceHandlerInputs<R, K, I, N>) =>
      async ({ req, reply }) => {
        const created = await collection.insert(req.body as WithoutIdentity<R, K>)
        reply.code(201).send(created)
      },
    DELETE:
      <R, K extends keyof R, I, N>({ collection }: ResourceHandlerInputs<R, K, I, N>) =>
      async ({ req, reply }) => {
        const deleted = await collection.deleteOne(
          (req.params as any)[collection.identity]
        )
        if (deleted) {
          reply.code(204).send()
        }
        reply.code(404).send()
      },
    HEAD: () => {
      throw 'HEAD is not implemented.'
    },
    OPTIONS: () => {
      throw 'OPTIONS is not implemented.'
    },
    PATCH: () => {
      throw 'PATCH is not implemented.'
    },
  }

const makeResourceHandler = <R, K extends keyof R, I, N>(
  method: HttpMethod,
  collection: RecordCollection<R, K, I, N>,
  resourceIdentifier: ResourceIdentifier
): EndpointHandler => {
  const handlerDeclaration = RESOURCE_HANDLER_FACTORY_FUNCTIONS[method]
  if (typeof handlerDeclaration === 'function') {
    return handlerDeclaration({ method, collection, resourceIdentifier })
  }

  const identifierDeclaration = handlerDeclaration[resourceIdentifier]
  return identifierDeclaration({ method, collection, resourceIdentifier })
}

class RouteBuilder {
  resourceIdentifier: ResourceIdentifier = 'all'
  resultType: ResourceResultType = 'single'
  method: HttpMethod = 'GET'

  getAll(): RouteBuilder {
    this.method = 'GET'
    this.resourceIdentifier = 'all'
    this.resultType = 'list'
    return this
  }

  getOne(): RouteBuilder {
    this.method = 'GET'
    this.resultType = 'single'
    return this
  }

  putOne(): RouteBuilder {
    this.method = 'PUT'
    this.resultType = 'single'
    return this
  }

  deleteOne(): RouteBuilder {
    this.method = 'DELETE'
    this.resultType = 'single'
    return this
  }

  postOne(): RouteBuilder {
    this.method = 'POST'
    this.resultType = 'list'
    return this
  }

  byIdentity(): RouteBuilder {
    this.resourceIdentifier = 'identity'
    this.resultType = 'single'
    return this
  }

  build(parent: ResourceRouteBuilder): RouteDef<any> {
    let routeId = `${parent._resourceUri}-${this.method}`
    let path = parent._resourceUri
    if (this.resourceIdentifier === 'identity') {
      path = `${path}/:${parent._identity}`
      routeId = `${routeId}(${parent._identity})`
    }

    return {
      method: this.method,
      routeId,
      path: formatUri(path),
      handler: makeResourceHandler(
        this.method,
        parent._collection,
        this.resourceIdentifier
      ),
    }
  }
}

export class ResourceRouteBuilder {
  routeBuilders: RouteBuilder[] = []

  constructor(
    public _resourceUri: string,
    public _collection: RecordCollection,
    public _identity: string
  ) {}

  route(
    routeProvider: (routeBuilder: RouteBuilder) => RouteBuilder
  ): ResourceRouteBuilder {
    this.routeBuilders.push(routeProvider(new RouteBuilder()))
    return this
  }

  coreCrudRoutes(): ResourceRouteBuilder {
    this.route((r) => r.postOne())
      .route((r) => r.getAll())
      .route((r) => r.getOne().byIdentity())
      .route((r) => r.putOne().byIdentity())
      .route((r) => r.deleteOne().byIdentity())
    return this
  }

  build(): RouteDef<any>[] {
    return this.routeBuilders.map((rb) => rb.build(this))
  }
}
