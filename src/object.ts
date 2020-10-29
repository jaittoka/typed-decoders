import { failure, success, isSuccess, joinPath, isFailure } from "./core"
import { Source, GetType } from "./types"

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
          return failure(result.error, joinPath(result.path, String(key)))
        }
      } else if (!optional) {
        return failure('missing_field', String(key))
      }
    }
    return success(resultObj)
  }
}

/*

  The following four helper types are from https://stackoverflow.com/a/49683575

*/
type OptionalPropertyNames<T> =
  { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]

type SpreadProperties<L, R, K extends keyof L & keyof R> =
  { [P in K]: L[P] | Exclude<R[P], undefined> }

type Id<T> = { [K in keyof T]: T[K] }

type Spread<L, R> = Id<
  & Pick<L, Exclude<keyof L, keyof R>>
  & Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
  & Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
  & SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

export function obj<M extends ParseProps, O extends ParseProps = {}>(fields: M, optional?: O): Source<Spread<GetTypes<M>, Partial<GetTypes<O>>>> {
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
      if (isFailure(r)) return failure(r.error, joinPath(r.path, key))
      result[key] = r.value
    }
    return success(result)
  }
}
