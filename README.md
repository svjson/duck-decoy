# Duck Decoy

[![CI](https://github.com/svjson/duck-decoy/actions/workflows/build-and-test.yaml/badge.svg?branch=master)](https://github.com/svjson/duck-decoy/actions/workflows/build-and-test.yaml)
[![npm version](https://img.shields.io/npm/v/duck-decoy.svg)](https://www.npmjs.com/package/duck-decoy)
[![npm downloads](https://img.shields.io/npm/dm/duck-decoy.svg)](https://www.npmjs.com/package/duck-decoy)
[![GitHub](https://img.shields.io/badge/GitHub-svjson%2Fduck--decoy-blue?logo=github)](https://github.com/svjson/duck-decoy)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/duck-decoy)](https://www.npmjs.com/package/duck-decoy)

> Simple HTTP mocks and fakes - *spin up fake APIs with minimum effort.*

## What is Duck Decoy?

Duck Decoy lets you stand up HTTP services that behave like the real thing - but are entirely fake - using just configuration.  

**You can:**

- Define endpoints and responses in plain JS/TS objects
- Use static or dynamic responses
- Simulate latency, errors, and state changes
- Prototype or test integrations without a real backend

**Perfect for:**

- **Frontend development** without waiting for backend readiness
- **Integration testing** without hitting live systems
- **Demonstrations** and API simulations

## Starting a Decoy Server

Setting up and starting a Duck Decoy server is as simple as:

```typescript
import { makeDecoyServer } from 'duck-decoy';
import { DuckDecoyFastify } from '@duck-decoy/fastify';

const decoy = await makeDecoyServer({
  impl: new DuckDecoyFastify(),
  autostart: true,
  endpoints: {
    '/api/hello-world': {
      message: 'Hello World!'
    },
    '/api/random-number': async ({ response }) => response
      .body({ randomNumber: 1 + Math.floor(Math.random() * 10) })
  }
});

```

This will serve the static JSON payload `{ "message": "Hellow World!" }` at `/api/hello-world`,
and a random number between 1 and 10 at `api/random-number`.


## RecordCollection as Resource endpoint

Duck Decoy supports stateful behavior out of the box. You can define a service state 
that persist across requests, allowing you to simulate complex interactions.

While any dynamic Duck Decoy route can read and modify state just like in any application,
Duck Decoy comes with abstraction called `RecordCollection`.

RecordCollections easily map to the same mental model as a database table 
or a RESTful resource. Often, the model of a RESTful resource or JSON API will refer to
a database table or the aggregate root of a deeper model that is stored in a database table.

### Defining a CRUD resource

Starting up a CRUD API around a RecordCollection holding a record type that follows the simple
convention of having an identifying property named `id` is as simple as exposing an array as an
endpoint.

This will implicitly create an `ArrayCollection` that will back a set of API endpoints:

```typescript
import { makeDecoyServer } from 'duck-decoy';
import { DuckDecoyFastify } from '@duck-decoy/fastify';

interface User {
  id: number;
  name: string;
  email: string;
}

const server = await makeDecoyServer({
  impl: new DuckDecoyFastify(),
  autostart: true,
  endpoints: {
    '/api/users': [
      {
        id: 1,
        name: 'Ronny Ruka',
        email: 'ronny.ruka@example.com'
      }, 
      {
        id: 2,
        name: 'Hanna Hoover',
        email: 'hanna@bananas.com'
      }
    ]
  }
})
```

This will automatically generate a full set of CRUD routes that will query and update the
array in exactly the way one would expect.

| Method | Path/Pattern   |
|--------|----------------|
| GET    | /api/users/    |
| GET    | /api/users/:id |
| POST   | /api/users/    |
| PUT    | /api/users/:id |
| DELETE | /api/users/:id |

The usefulness of this feature might be limited when it comes to faking/mocking a real system,
as most APIs out there either do not provide the full set of CRUD operations or come with their
own quirks.

The story is different, however, when it comes to early development, prototyping or quickly
cobbling together a demo.

### Crafting a more deliberate API resource

`ResourceRouteBuilder` can be used to construct the same kind of CRUD resources as in the above
example, but by explicitly selecting which routes to include.

```typescript
const server await makeDecoyServer({
  impl: DuckDecoyFastify,
  endpoints: {
    'api/species': new ResourceRouteBuilder(
      'api/species',
      new ArrayCollection(ANIMAL_SPECIES_TEST_RECORDS),
      'id'
     )
       .route((r) => r.getAll())
       .route((r) => r.getOne().byIdentity())
       .route((r) => r.postOne())
       .build(),
    },
})
```

This will provide the same kind of of endpoints as in the previous example, but limit the selection to:

| Method | Path/Pattern   |
|--------|----------------|
| GET    | /api/users/    |
| GET    | /api/users/:id |
| POST   | /api/users/    |


### RecordCollection implementations

The default implementation of `RecordCollection` uses an in-memory `ArrayCollection`. This is
sufficient for regular automated test suites and most cases, but there are cases where actual
persistence is required.

Examples of that may be for long-lived demo or test environments or even test suites for cases
where an application - god forbid - integrates both through API and database.

Collection types provided by Duck Decoy are:

| Name            | Persistence                     | Package                                                                |
|-----------------|---------------------------------|------------------------------------------------------------------------|
| ArrayCollection | No                              | `duck-decoy`                                                           |
| KnexCollection  | Yes, any supported SQL database | [`@duck-decoy/collectios-knex`](./packages/collections/knex/README.md) |

Other types can be implemented by extending `RecordCollection`, which is defined in [`collection.ts`](https://github.com/svjson/duck-decoy/blob/master/packages/duck-decoy/src/collection/collection.ts)


## State

For more complex and meaningful fakes that are not merely isolated buckets of CRUD state,
there is the option to provide a global State-object to a DecoyServer. This state object is
arbitrary and can be shared between any and all endpoints and used to simulate and enforce
a more complex state, e.g, invariants, validation or authentication.


```typescript
const server await makeDecoyServer({
  impl: DuckDecoyFastify,
  state: {
    species: new ArrayCollection<AnimalSpecies>(ANIMAL_SPECIES_TEST_RECORDS),
    users: new ArrayCollection<Users>(USER_TEST_RECORDS),
    activeAuthTokens: new ArrayCollection<FakeAuthToken>([], 'token')
  },
  preHandlers: [
    {
      exclude: ['/api/authenticate'],
      handler: async ({ request, response, state }) => {
        const bearerToken = request.header('Authentication')
        if (!bearerToken || !(await state.findOne(bearerToken))) {
          response.status(401).encode()
        }
      }
    }
  ],
  endpoints: {
    'api/authenticate': {
      handler: async ({ request, response, state }) => {
        const user = await state.users.findOne({ username: request.queryParameter('user') })
        if (user) {
          const token = await state.activeAuthTokens.insert({
            token: crypto.randomUUID(),
            userId: user.id
          })
          response.status(200).body({
            token: token.token,
            message: [
              `You say you are ${user}.`,
              'That must mean that you are!',
              'Welcome!',
              'This is very secure!'
            ].join(' ')
          })
        } else {
          response.status(401).body({
            message: [
              `You say you are ${user}.`,
              'We have no idea who that is.',
              'Otherwise we'd be happy to let you in.',
              'Not welcome!',
              'This is also very secure!`
            ].join(' ')
          })
        }
      })
    },
    'api/four-legged-animals': {
      method: 'GET',
      handler: async ({ response, state }) => {
        response
          .status(200)
          .body({
            fourLeggedAnimals: await state.species.find({ legs: 4 })
          })
      }
    },
})
```


## Duck Decoy? What ducks?

Two very simple things are behind the choice of the name:

1. This library is all about creating shallow fakes that behave like real systems - **If it walks like a duck, and quacks like a duck...**
2. **"Duck Decoy"** is the unofficial name given to one of the most ridiculous (and ridiculously awesome) US patents filed. This image from the patent application speaks for itself:

![Duck decoy](https://raw.githubusercontent.com/svjson/duck-decoy/master/readme-assets/duck-decoy-contraption.png)

## License

© 2025 Sven Johansson. [MIT Licensed](./LICENSE)
