import { Draft } from 'immer'
import { useImmer } from 'use-immer'
import { createContainer } from 'unstated-next'
import { useRef, useEffect, useState, useMemo } from 'react'

import { noop } from '@lib/helper'

export function useObject<T extends object> (initialValue: T) {
    const [copy, rawSet] = useImmer(initialValue)

    function set<K extends keyof Draft<T>> (key: K, value: Draft<T>[K]): void
    function set<K extends keyof Draft<T>> (data: Partial<T>): void
    function set<K extends keyof Draft<T>> (f: (draft: Draft<T>) => void | T): void
    function set<K extends keyof Draft<T>> (data: any, value?: Draft<T>[K]): void {
        if (typeof data === 'string') {
            rawSet(draft => {
                const key = data as K
                const v = value
                draft[key] = v
            })
        } else if (typeof data === 'function') {
            rawSet(data)
        } else if (typeof data === 'object') {
            rawSet((draft: Draft<T>) => {
                const obj = data as Draft<T>
                for (const key of Object.keys(obj)) {
                    const k = key as keyof Draft<T>
                    draft[k] = obj[k]
                }
            })
        }
    }

    return [copy, set] as [T, typeof set]
}

export function useInterval (callback: () => void, delay: number) {
    const savedCallback = useRef(noop)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(
        () => {
            const handler = () => savedCallback.current()

            if (delay !== null) {
                const id = setInterval(handler, delay)
                return () => clearInterval(id)
            }
        },
        [delay]
    )
}

type containerFn<Value, State = void> = (initialState?: State) => Value

export function composeContainer<T, C extends containerFn<T>, U extends { [key: string]: C }, K extends keyof U> (mapping: U) {
    function Global () {
        return Object.keys(mapping).reduce((obj, key) => {
            obj[key as K] = mapping[key]()
            return obj
        }, {} as { [K in keyof U]: T })
    }

    const allContainer = createContainer(Global)
    return {
        Provider: allContainer.Provider,
        containers: Object.keys(mapping).reduce((obj, key) => {
            obj[key as K] = (() => allContainer.useContainer()[key]) as U[K]
            return obj
        }, {} as { [K in keyof U]: U[K] })
    }
}

export function useRound<T> (list: T[], defidx = 0) {
    if (list.length < 2) {
        throw new Error('List requires at least two elements')
    }

    const [state, setState] = useState(defidx)

    function next () {
        setState((state + 1) % list.length)
    }

    const current = useMemo(() => list[state], [state])

    return { current, next }
}
