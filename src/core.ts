import { Result, Failure, Success, Source, Transform } from "./types"

export const joinPath = (parent: string | undefined, key: string): string =>
  !!parent ? `${parent}.${key}` : key

export const failure = (error: string, path?: string): Result<never> => ({ success: false, error, path })

export const success = <T>(value: T): Result<T> => ({ success: true, value })

export const isFailure = <T>(v: Result<T>): v is Failure => v.success === false

export const isSuccess = <T>(v: Result<T>): v is Success<T> => v.success === true

export const succeed = <T>(value: T): Source<T> => (_value: unknown) => success<T>(value)

export const fail = <T>(error: string): Source<T> => (_value: unknown) => failure(error, "")

export const pass: Transform<unknown, unknown> = <S>(value: S) => success(value);

export function runDecoder<S, T>(d: Transform<S, T>, value: S): Result<T> {
  return d(value)
}

export class TransformError extends Error {
  constructor(msg: string, public readonly path?: string) {
    super(msg)
  }
}

export function runDecoderE<S, T>(d: Transform<S, T>, value: S): T {
  const r = d(value)
  if (isSuccess(r)) {
    return r.value
  } else {
    throw new TransformError(r.error, r.path)
  }
}
