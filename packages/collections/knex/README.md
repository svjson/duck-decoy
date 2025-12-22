
# Knex Collections for Duck Decoy

[![CI](https://github.com/svjson/duck-decoy/actions/workflows/build-and-test.yaml/badge.svg?branch=master)](https://github.com/svjson/duck-decoy/actions/workflows/build-and-test.yaml)
[![npm version](https://img.shields.io/npm/v/%40duck-decoy/collections-knex)](https://www.npmjs.com/package/@duck-decoy/collections-knex)
[![npm downloads](https://img.shields.io/npm/dm/%40duck-decoy/collections-knex)](https://www.npmjs.com/package/@duck-decoy/collections-knex)
[![GitHub](https://img.shields.io/badge/GitHub-svjson%2Fduck--decoy-blue?logo=github)](https://github.com/svjson/duck-decoy)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/%40duck-decoy/fastify)](https://www.npmjs.com/package/@duck-decoy/collections-knex)

Provides a [Knex](https://knexjs.org/)-backed `RecordCollection` implementation for Duck Decoy ([GitHub](https://github.com/svjson/duck-decoy/)) ([npmjs.com](https://www.npmjs.com/package/duck-decoy)).

## Usage

```typescript
    import knex from 'knex'
    import { KnexCollection } from '@duck-decoy/collections-knex'
    
    type CarId = number
    
    interface Car {
      id: CarId
      type: string
    }
    
    const db = knex({
       // Connection details
    })
    
    const cars = new KnexCollection<Car, CarId>({
      knex: db,
      table: 'cars',
      records: [{
        id: 1,
        type: 'Fast',
      }, {
        id: 2,
        type: 'Really Fast',
      }, {
        id: 3,
        type: 'Not Fast At All'
      }]
    })
```
