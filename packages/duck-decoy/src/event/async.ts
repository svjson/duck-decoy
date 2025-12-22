interface BoundListener {
  type: 'on' | 'once'
  listener: Function
}

export class AsyncEventEmitter {
  #listeners: Record<string, BoundListener[]> = {}

  on(eventName: string, listener: Function): void {
    ;(this.#listeners[eventName] ??= []).push({ type: 'on', listener })
  }

  once(eventName: string, listener: Function): void {
    ;(this.#listeners[eventName] ??= []).push({ type: 'once', listener })
  }

  off(eventName: string, listener?: Function): void {
    if (!listener) {
      this.#listeners[eventName] = []
    } else {
      this.#listeners[eventName] = this.#listeners[eventName].filter(
        (l) => l.listener !== listener
      )
    }
  }

  async emit(eventName: string, ...args: any[]): Promise<void | boolean> {
    const listenerResults = (this.#listeners[eventName] ??= []).map((l) => {
      const lResult = l.listener.apply(null, args)
      return lResult instanceof Promise ? lResult : Promise.resolve(lResult)
    })

    this.#listeners[eventName] = this.#listeners[eventName].filter(
      (l) => l.type !== 'once'
    )

    const resolutions = await Promise.all(listenerResults)
    return resolutions.reduce((result, r) => {
      return r === false ? r : result
    }, undefined)
  }
}
