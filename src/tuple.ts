import { arru, strNum, num, bool } from "./basic"
import { failure, isSuccess, success } from "./core"
import { Transform, GetSourceType, GetType } from "./types"
import { pipe } from './compose'

type TupleN<N extends number> = 
  N extends 1 ? [ unknown ] :
  N extends 2 ? [ unknown, unknown ] :
  N extends 3 ? [ unknown, unknown, unknown ] :
  N extends 4 ? [ unknown, unknown, unknown, unknown ] :
  N extends 5 ? [ unknown, unknown, unknown, unknown, unknown ] :
  N extends 6 ? [ unknown, unknown, unknown, unknown, unknown, unknown ] :
  N extends 7 ? [ unknown, unknown, unknown, unknown, unknown, unknown, unknown ] :
  any

type Sources<T extends ReadonlyArray<Transform<any, any>>> = { [K in keyof T]: GetSourceType<T[K]> }

type Targets<T extends ReadonlyArray<Transform<any, any>>> = { [K in keyof T]: GetType<T[K]> }

export const tuple = <T extends ReadonlyArray<Transform<any, any>>>(...transforms: T): Transform<Sources<T>, Targets<T>> => 
  pipe(tupleN(transforms.length), (v) => {
    const result = new Array(transforms.length) as unknown as Targets<T>
    for (let i = 0; i < transforms.length; i++) {
      const r = transforms[i](v[i])
      if (isSuccess(r)) {
        (result as any)[i] = r.value
      } else {
        return r
      }
    }
    return success(result)
  })

export const tupleN = <N extends number>(n: N): Transform<unknown, TupleN<N>> =>
  pipe(arru, (v) => {
    if (v.length !== n) {
      return failure(`expected tuple of length ${n}`)
    }
    return success(v) as TupleN<N>
  })

