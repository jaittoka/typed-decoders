import { failure, success, isSuccess, failKey, isFailure } from "./core"
import { Source, GetType, Id } from "./types"

type GetTypes<T> = { [K in keyof T]: T[K] extends Source<infer U> ? U : never }

type ParseProps = { [K in string]: Source<any> }

function parseProps<T extends ParseProps, B>(
  parsers: T | undefined,
  optional: B
): Source<true extends B ? Partial<GetType<T>> : GetType<T>> {
  return (value: unknown) => {
    if (typeof value !== 'object' || value === null) {
      return failure('expected_object')
    }

    if (parsers === undefined) return success({} as any)

    const resultObj = {} as (true extends B ? Partial<GetTypes<T>> : GetTypes<T>)
    const entries: [keyof T, Source<any>][] = Object.entries(parsers)
    for (let i = 0; i < entries.length; i++) {
      const [key, parse] = entries[i]
      if (value.hasOwnProperty(key)) {
        const result = parse((value as any)[key])
        if (isSuccess(result)) {
          resultObj[key] = result.value
        } else {
          return failKey(result, String(key))
        }
      } else if (!optional) {
        return failure('missing_field', String(key))
      }
    }
    return success(resultObj)
  }
}

type Merge<A, B> = 
  { [K in Exclude<keyof A, keyof B>]: A[K] } &
  { [K in keyof B]?: B[K] }

export function obj<M extends ParseProps, O extends ParseProps = {}>(fields: M, optional?: O): Source<Id<Merge<GetTypes<M>, Partial<GetTypes<O>>>>> {
  const requiredFields = parseProps(fields, false)
  const optFields = parseProps(optional, true)
  return (value: unknown) => {
    const r = requiredFields(value)
    if (isFailure(r)) return r
    const o = optFields(value)
    if (isFailure(o)) return o
    return success({ ...r.value, ...o.value } as any)
  }
}

export function rec<T>(decoder: Source<T>): Source<Record<string, T>> {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null) {
      return failure("expected_object")
    }
    const result = {} as Record<string, T>
    const keys = Object.keys(value)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const r = decoder((value as any)[key])
      if (isFailure(r)) return failKey(r, key)
      result[key] = r.value
    }
    return success(result)
  }
}
