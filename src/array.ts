import { arru } from "./basic"
import { pipe } from "./compose"
import { isSuccess, failKey, success } from "./core"
import { Result, Transform } from "./types"

const map = <A, B>(transform: Transform<A, B>) => (arr: A[]): Result<B[]> => {
  const result: B[] = []
  for (let i = 0; i < arr.length; i++) {
    const r = transform(arr[i])
    if (isSuccess(r)) {
      result.push(r.value)
    } else {
      return failKey(r, String(i))
    }
  }
  return success(result)
}

export const arrT = <L, R>(parser: Transform<L, R>): Transform<L[], R[]> => map(parser)

export const arr = <L>(parser: Transform<unknown, L>) => pipe(arru, arrT(parser))
