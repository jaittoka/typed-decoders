export interface Failure {
  readonly success: false
  readonly error: string
  readonly path?: string
}

export interface Success<T> {
  readonly success: true
  readonly value: T
}

export type Result<T> = Success<T> | Failure

export type Transform<S, T> = (value: S) => Result<T>

export type Source<T> = Transform<unknown, T>

export type GetType<T> = T extends Transform<any, infer R> ? R : never

export type GetSourceType<T> = T extends Transform<infer S, any> ? S : never
