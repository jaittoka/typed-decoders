import { failure, isSuccess, success } from "./core"
import { Transform } from "./types"

export const opt = <S, T>(
  d: Transform<S, T>
): Transform<S | undefined | null, T | undefined> =>
  (value: S | undefined | null) => {
    if (value === undefined || value === null) return success(undefined)
    return d(value)
  }

export const def = <S, T>(defval: T, d: Transform<S, T>) =>
  (value: S | undefined | null) => {
    if (value === undefined || value === null) return success(defval)
    return d(value)
  }

export function some<S, T extends any[]>(
  ...d: { [K in keyof T]: Transform<S, T[K]> }
): Transform<S, T[number]> {
  return (value: S) => {
    for (let i = 0; i < d.length; i++) {
      const r = d[i](value)
      if (isSuccess(r)) return r
    }
    return failure("expected_union")
  }
}

type SelFunc<S, T> = (value: S) => T

export function select<S, R, D1, D2>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>]
): Transform<S, R>
export function select<S, R, D1, D2, D3>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>],
  s3: [Transform<S, D3>, SelFunc<D3, R>]
): Transform<S, R>
export function select<S, R, D1, D2, D3, D4>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>],
  s3: [Transform<S, D3>, SelFunc<D3, R>],
  s4: [Transform<S, D4>, SelFunc<D4, R>]
): Transform<S, R>
export function select<S, R, D1, D2, D3, D4, D5>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>],
  s3: [Transform<S, D3>, SelFunc<D3, R>],
  s4: [Transform<S, D4>, SelFunc<D4, R>],
  s5: [Transform<S, D5>, SelFunc<D5, R>]
): Transform<S, R>
export function select(
  ...selectors: [Transform<any, any>, SelFunc<any, any>][]
): Transform<any, any> {
  return (value: any) => {
    for (let i = 0; i < selectors.length; i++) {
      const r = selectors[i][0](value)
      if (isSuccess(r)) return success(selectors[i][1](r.value))
    }
    return failure("selector_not_matched")
  }
}

export function map<S, T extends any[], R>(
  f: (...values: T) => R,
  ...d: { [K in keyof T]: Transform<S, T[K]> }
): Transform<S, R> {
  return (value: S) => {
    const result = ([] as unknown) as T
    for (let i = 0; i < d.length; i++) {
      const r = d[i](value)
      if (!isSuccess(r)) return r
      result[i] = r.value
    }
    return success(f(...result))
  }
}

export function pipe<A, B, C>(
  d1: Transform<A, B>,
  d2: Transform<B, C>
): Transform<A, C>
export function pipe<A, B, C, D>(
  d1: Transform<A, B>,
  d2: Transform<B, C>,
  d3: Transform<C, D>
): Transform<A, D>
export function pipe<A, B, C, D, E>(
  d1: Transform<A, B>,
  d2: Transform<B, C>,
  d3: Transform<C, D>,
  d4: Transform<D, E>
): Transform<A, E>
export function pipe<A, B, C, D, E, F>(
  d1: Transform<A, B>,
  d2: Transform<B, C>,
  d3: Transform<C, D>,
  d4: Transform<D, E>,
  d5: Transform<E, F>
): Transform<A, F>
export function pipe(...d: Transform<any, any>[]): Transform<any, any> {
  return (value: any) => {
    let result = value
    for (let i = 0; i < d.length; i++) {
      const r = d[i](result)
      if (!isSuccess(r)) return r
      result = r.value
    }
    return success(result)
  }
}
