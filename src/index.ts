class Failure {
  constructor(public readonly error: string, public readonly path?: string) {}
}

class Success<T> {
  constructor(public readonly value: T) {}
}

export type Result<T> = Success<T> | Failure;

export type Transform<S, T> = (value: S) => Result<T>;

export type Source<T> = Transform<unknown, T>;

export type GetType<T> = T extends Transform<any, infer R> ? R : never;


export function joinPath(parent: string | undefined, key: string): string {
  return !!parent ? `${parent}.${key}` : key
}

export function failure(error: string, path?: string) {
  return new Failure(error, path);
}

export function success<T>(value: T) {
  return new Success(value);
}

export function isFailure<T>(v: Result<T>): v is Failure {
  return v instanceof Failure;
}

export function isSuccess<T>(v: Result<T>): v is Success<T> {
  return v instanceof Success;
}

function succeed<T>(value: T): Source<T> {
  return (_value: unknown) => success<T>(value);
}

function fail<T>(error: string): Source<T> {
  return (_value: unknown) => new Failure(error, "");
}

const str: Source<string> = (value: unknown) => {
  if (typeof value !== "string") return failure("expected_string");
  return success(value);
};

export type LiteralTypes = undefined | null | boolean | number | string;

function lit<T extends LiteralTypes>(expect: T): Source<T> {
  return (value: unknown) => {
    if (value !== expect) return failure("expected_literal");
    return success(expect);
  };
}

const undef: Source<undefined> = (value: unknown) => {
  if (value !== undefined) return failure("expected_undefined");
  return success(value);
};

const nullt: Source<null> = (value: unknown) => {
  if (value !== null) return failure("expected_null");
  return success(value);
};

const num: Source<number> = (value: unknown) => {
  if (typeof value !== "number") return failure("expected_number");
  return success(value);
};

const bool: Source<boolean> = (value: unknown) => {
  if (typeof value !== "boolean") return failure("expected_boolean");
  return success(value);
};

const date: Source<Date> = (value: unknown) => {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return failure("expected_date");
  }
  return success(value);
};

const strDate: Transform<string, Date> = (value: string) => {
  return date(new Date(value));
};

const strNum: Transform<string, number> = (value: string) => {
  const v = parseFloat(value);
  if (isNaN(v)) return failure("expected_number_string");
  return success(v);
};

const pass = <S>(value: S) => success(value);

function opt<S, T>(
  d: Transform<S, T>
): Transform<S | undefined | null, T | undefined> {
  return (value: S | undefined | null) => {
    if (value === undefined || value === null) return success(undefined);
    return d(value);
  };
}

function def<S, T>(defval: T, d: Transform<S, T>) {
  return (value: S | undefined | null) => {
    if (value === undefined || value === null) return success(defval);
    return d(value);
  };
}

function arr<T>(d: Source<T>): Source<T[]> {
  return (value: unknown) => {
    if (!Array.isArray(value)) return failure("expected_array");
    const result = [] as T[];

    for (let i = 0; i < value.length; i++) {
      const r = d(value[i]);
      if (!isSuccess(r)) return failure(r.error, joinPath(r.path, String(i)))
      result[i] = r.value;
    }
    return success(result);
  };
}

type GetTypes<T> = { [K in keyof T]: T[K] extends Source<infer U> ? U : never}

type ParseProps = { [K in string]: Source<any> }

function parseProps<T extends ParseProps, B>(
  parsers:  T | undefined,
  optional: B
): Source<true extends B ? Partial<GetType<T>> : GetType<T>> {
  return (value: unknown) => {
    if (typeof value !== 'object' || value === null) {
      return failure('expected_object')
    }

    if (parsers === undefined) return success({} as any)

    const resultObj = {} as (true extends B ? Partial<GetTypes<T>> : GetTypes<T>)
    const entries: [ keyof T, Source<any>][] = Object.entries(parsers)
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
  { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> =
  { [P in K]: L[P] | Exclude<R[P], undefined> };

type Id<T> = {[K in keyof T]: T[K]} 

type Spread<L, R> = Id<
  & Pick<L, Exclude<keyof L, keyof R>>
  & Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
  & Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
  & SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

function obj<M extends ParseProps, O extends ParseProps = {}>(fields: M, optional?: O): Source<Spread<GetTypes<M>, Partial<GetTypes<O>>>> {
  const requiredFields = parseProps(fields, false)
  const optFields = parseProps(optional, true)
  return (value: unknown) => {
    const r = requiredFields(value)
    if (isFailure(r)) return r
    const o = optFields(value)
    if (isFailure(o)) return o
    return success({...r.value, ...o.value} as any)
  }
}

function rec<T>(decoder: Source<T>): Source<Record<string, T>> {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null) {
      return failure("expected_object");
    }
    const result = {} as Record<string, T>;
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const r = decoder((value as any)[key]);
      if (isFailure(r)) return failure(r.error, joinPath(r.path, key));
      result[key] = r.value;
    }
    return success(result);
  }
}

function some<S, T extends any[]>(
  ...d: { [K in keyof T]: Transform<S, T[K]> }
): Transform<S, T[number]> {
  return (value: S) => {
    for (let i = 0; i < d.length; i++) {
      const r = d[i](value);
      if (isSuccess(r)) return r;
    }
    return failure("expected_union");
  };
}

type SelFunc<S, T> = (value: S) => T;

function select<S, R, D1, D2>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>]
): Transform<S, R>;
function select<S, R, D1, D2, D3>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>],
  s3: [Transform<S, D3>, SelFunc<D3, R>]
): Transform<S, R>;
function select<S, R, D1, D2, D3, D4>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>],
  s3: [Transform<S, D3>, SelFunc<D3, R>],
  s4: [Transform<S, D4>, SelFunc<D4, R>]
): Transform<S, R>;
function select<S, R, D1, D2, D3, D4, D5>(
  s1: [Transform<S, D1>, SelFunc<D1, R>],
  s2: [Transform<S, D2>, SelFunc<D2, R>],
  s3: [Transform<S, D3>, SelFunc<D3, R>],
  s4: [Transform<S, D4>, SelFunc<D4, R>],
  s5: [Transform<S, D5>, SelFunc<D5, R>]
): Transform<S, R>;
function select(
  ...selectors: [Transform<any, any>, SelFunc<any, any>][]
): Transform<any, any> {
  return (value: any) => {
    for (let i = 0; i < selectors.length; i++) {
      const r = selectors[i][0](value);
      if (isSuccess(r)) return success(selectors[i][1](r.value));
    }
    return failure("selector_not_matched");
  };
}

function map<S, T extends any[], R>(
  f: (...values: T) => R,
  ...d: { [K in keyof T]: Transform<S, T[K]> }
): Transform<S, R> {
  return (value: S) => {
    const result = ([] as unknown) as T;
    for (let i = 0; i < d.length; i++) {
      const r = d[i](value);
      if (!isSuccess(r)) return r;
      result[i] = r.value;
    }
    return success(f(...result));
  };
}

function pipe<A, B, C>(
  d1: Transform<A, B>,
  d2: Transform<B, C>
): Transform<A, C>;
function pipe<A, B, C, D>(
  d1: Transform<A, B>,
  d2: Transform<B, C>,
  d3: Transform<C, D>
): Transform<A, D>;
function pipe<A, B, C, D, E>(
  d1: Transform<A, B>,
  d2: Transform<B, C>,
  d3: Transform<C, D>,
  d4: Transform<D, E>
): Transform<A, E>;
function pipe<A, B, C, D, E, F>(
  d1: Transform<A, B>,
  d2: Transform<B, C>,
  d3: Transform<C, D>,
  d4: Transform<D, E>,
  d5: Transform<E, F>
): Transform<A, F>;
function pipe(...d: Transform<any, any>[]): Transform<any, any> {
  return (value: any) => {
    let result = value;
    for (let i = 0; i < d.length; i++) {
      const r = d[i](result);
      if (!isSuccess(r)) return r;
      result = r.value;
    }
    return success(result);
  };
}

export function runDecoder<S, T>(d: Transform<S, T>, value: S): Result<T> {
  return d(value);
}

export class TransformError extends Error {
  constructor(msg: string, public readonly path?: string) {
    super(msg);
  }
}

export function runDecoderE<S, T>(d: Transform<S, T>, value: S): T {
  const r = d(value);
  if (isSuccess(r)) {
    return r.value;
  } else {
    throw new TransformError(r.error, r.path);
  }
}

export const Decoders = {
  Succeed: succeed,
  Fail: fail,
  Undef: undef,
  Null: nullt,
  Str: str,
  Lit: lit,
  Num: num,
  Bool: bool,
  Date: date,
  StrDate: strDate,
  StrNum: strNum,
  Pass: pass,
  Opt: opt,
  Def: def,
  Obj: obj,
  Rec: rec,
  Arr: arr,
  Some: some,
  Map: map,
  Select: select,
  Pipe: pipe
};
