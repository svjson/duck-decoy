import { AsyncEventEmitter } from '@src/event'
import { describe, expect, it } from 'vitest'

describe('AsyncEventEmitter', () => {
  it('should emit event to all regular listeners any number of times', async () => {
    // Given
    const emitter = new AsyncEventEmitter()
    const valuesOne: string[] = []
    const valuesTwo: string[] = []
    emitter.on('my-event', (e: any) => valuesOne.push(`one ${e.value}`))
    emitter.on('my-event', (e: any) => valuesTwo.push(`two ${e.value}`))

    const results: (void | boolean)[] = []

    // When
    results.push(await emitter.emit('my-event', { value: 'check one' }))
    results.push(await emitter.emit('my-event', { value: 'a-check two' }))
    results.push(await emitter.emit('my-event', { value: 'a-check three' }))

    // Then
    expect(valuesOne).toEqual(['one check one', 'one a-check two', 'one a-check three'])
    expect(valuesTwo).toEqual(['two check one', 'two a-check two', 'two a-check three'])
    expect(results).toEqual([undefined, undefined, undefined])
  })

  it('should stop emitting to once-registered listener after first emit', async () => {
    // Given
    const emitter = new AsyncEventEmitter()
    const valuesOne: string[] = []
    const valuesTwo: string[] = []
    emitter.once('my-event', (e: any) => valuesOne.push(`one ${e.value}`))
    emitter.on('my-event', (e: any) => valuesTwo.push(`two ${e.value}`))

    const results: (void | boolean)[] = []

    // When
    results.push(await emitter.emit('my-event', { value: 'check one' }))
    results.push(await emitter.emit('my-event', { value: 'a-check two' }))
    results.push(await emitter.emit('my-event', { value: 'a-check three' }))

    // Then
    expect(valuesOne).toEqual(['one check one'])
    expect(valuesTwo).toEqual(['two check one', 'two a-check two', 'two a-check three'])
    expect(results).toEqual([undefined, undefined, undefined])
  })

  it('should return false if any listener returns false', async () => {
    // Given
    const emitter = new AsyncEventEmitter()
    const valuesOne: string[] = []
    const valuesTwo: string[] = []
    emitter.on('my-event', (e: any) => {
      valuesOne.push(`one ${e.value}`)
      return e.value !== 'a-check two'
    })
    emitter.on('my-event', (e: any) => {
      valuesTwo.push(`two ${e.value}`)
      return e.value === 'a-check three' ? false : undefined
    })

    const results: (void | boolean)[] = []

    // When
    results.push(await emitter.emit('my-event', { value: 'check one' }))
    results.push(await emitter.emit('my-event', { value: 'a-check two' }))
    results.push(await emitter.emit('my-event', { value: 'a-check three' }))

    // Then
    expect(valuesOne).toEqual(['one check one', 'one a-check two', 'one a-check three'])
    expect(valuesTwo).toEqual(['two check one', 'two a-check two', 'two a-check three'])
    expect(results).toEqual([undefined, false, false])
  })
})
