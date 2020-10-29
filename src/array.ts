import { failure, isSuccess, joinPath, success } from "./core"
import { Source } from "./types"

export const arr = <T>(d: Source<T>): Source<T[]> =>
  (value: unknown) => {
    if (!Array.isArray(value)) return failure("expected_array")
    const result = [] as T[]

    for (let i = 0; i < value.length; i++) {
      const r = d(value[i])
      if (!isSuccess(r)) return failure(r.error, joinPath(r.path, String(i)))
      result[i] = r.value
    }
    return success(result)
  }
