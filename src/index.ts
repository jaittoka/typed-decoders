class Failure {
  constructor(public readonly error: string, public readonly path: string) {}
}

class Success<T> {
  constructor(public readonly value: T) {}
}

export interface Context {
  parent?: Context;
  key: string;
}

const ROOT_CONTEXT = { key: "<root>" };

export type Result<T> = Success<T> | Failure;

export type Transform<S, T> = (value: S, ctx: Context) => Result<T>;

export type Source<T> = Transform<unknown, T>;

export type GetType<T> = T extends Transform<any, infer R> ? R : never;

export function context(parent: Context, key: string) {
  return { parent, key };
}

export function formatPath(context: Context): string {
  const res = [] as string[];
  while (context.parent !== undefined) {
    res.push(context.key.toString());
    context = context.parent;
  }
  res.reverse();
  return res.join(".");
}

export function failure(error: string, ctx: Context) {
  return new Failure(error, formatPath(ctx));
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
  return (_value: unknown, ctx: Context) => success<T>(value);
}

function fail<T>(error: string): Source<T> {
  return (_value: unknown, ctx: Context) => new Failure(error, "");
}

const str: Source<string> = (value: unknown, ctx: Context) => {
  if (typeof value !== "string") return failure("expected_string", ctx);
  return success(value);
};

export type LiteralTypes = undefined | null | boolean | number | string;

function lit<T extends LiteralTypes>(expect: T): Source<T> {
  return (value: unknown, ctx: Context) => {
    if (value !== expect) return failure("expected_literal", ctx);
    return success(expect);
  };
}

const undef: Source<undefined> = (value: unknown, ctx: Context) => {
  if (value !== undefined) return failure("expected_undefined", ctx);
  return success(value);
};

const nullt: Source<null> = (value: unknown, ctx: Context) => {
  if (value !== null) return failure("expected_null", ctx);
  return success(value);
};

const num: Source<number> = (value: unknown, ctx: Context) => {
  if (typeof value !== "number") return failure("expected_number", ctx);
  return success(value);
};

const bool: Source<boolean> = (value: unknown, ctx: Context) => {
  if (typeof value !== "boolean") return failure("expected_boolean", ctx);
  return success(value);
};

const date: Source<Date> = (value: unknown, ctx: Context) => {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return failure("expected_date", ctx);
  }
  return success(value);
};

const strDate: Transform<string, Date> = (value: string, ctx: Context) => {
  return date(new Date(value), ctx);
};

const strNum: Transform<string, number> = (value: string, ctx: Context) => {
  const v = parseFloat(value);
  if (isNaN(v)) return failure("expected_number_string", ctx);
  return success(v);
};

const pass = <S>(value: S) => success(value);

function opt<S, T>(
  d: Transform<S, T>
): Transform<S | undefined | null, T | undefined> {
  return (value: S | undefined | null, ctx: Context) => {
    if (value === undefined || value === null) return success(undefined);
    return d(value, ctx);
  };
}

function def<S, T>(defval: T, d: Transform<S, T>) {
  return (value: S | undefined | null, ctx: Context) => {
    if (value === undefined || value === null) return success(defval);
    return d(value, ctx);
  };
}

function arr<T>(d: Source<T>): Source<T[]> {
  return (value: unknown, ctx: Context) => {
    if (!Array.isArray(value)) return failure("expected_array", ctx);
    const result = [] as T[];

    for (let i = 0; i < value.length; i++) {
      const r = d(value[i], context(ctx, `${i}`));
      if (!isSuccess(r)) return r;
      result[i] = r.value;
    }
    return success(result);
  };
}

type IsPartial<T extends object, P extends boolean> =
  P extends true ? Partial<T> : T

const _obj = <P extends boolean>(isPartial: P) => <T extends object>(
  fields: { [K in keyof T]: Source<T[K]> },
): Source<IsPartial<T, P>> => {
  return (value: unknown, ctx: Context) => {
    if (typeof value !== "object" || value === null) {
      return failure("expected_object", ctx);
    }
    const result = {} as IsPartial<T, P>;
    const keys = Object.keys(fields) as (keyof T)[];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fieldVal = (value as any)[key];
      if (fieldVal !== undefined) {
        const r = fields[key](fieldVal, context(ctx, String(key)));
        if (!isSuccess(r)) return r;
        (result as any)[key] = r.value;
      } else if (!isPartial) {
        return failure(`Missing field:_${key}`, ctx)
      }
    }
    return success(result);
  };
}

const obj = _obj(false)

const partial = _obj(true);  

function rec<T>(decoder: Source<T>): Source<Record<string, T>> {
  return (value: unknown, ctx: Context) => {
    if (typeof value !== "object" || value === null) {
      return failure("expected_object", ctx);
    }
    const result = {} as Record<string, T>;
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const r = decoder((value as any)[key], context(ctx, key));
      if (isFailure(r)) return r;
      result[key] = r.value;
    }
    return success(result);
  }
}

function some<S, T extends any[]>(
  ...d: { [K in keyof T]: Transform<S, T[K]> }
): Transform<S, T[number]> {
  return (value: S, ctx: Context) => {
    for (let i = 0; i < d.length; i++) {
      const r = d[i](value, ctx);
      if (isSuccess(r)) return r;
    }
    return failure("expected_union", ctx);
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
  return (value: any, ctx: Context) => {
    for (let i = 0; i < selectors.length; i++) {
      const r = selectors[i][0](value, ctx);
      if (isSuccess(r)) return success(selectors[i][1](r.value));
    }
    return failure("selector_not_matched", ctx);
  };
}

function map<S, T extends any[], R>(
  f: (...values: T) => R,
  ...d: { [K in keyof T]: Transform<S, T[K]> }
): Transform<S, R> {
  return (value: S, ctx: Context) => {
    const result = ([] as unknown) as T;
    for (let i = 0; i < d.length; i++) {
      const r = d[i](value, ctx);
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
  return (value: any, ctx: Context) => {
    let result = value;
    for (let i = 0; i < d.length; i++) {
      const r = d[i](result, ctx);
      if (!isSuccess(r)) return r;
      result = r.value;
    }
    return success(result);
  };
}

export function runDecoder<S, T>(d: Transform<S, T>, value: S): Result<T> {
  return d(value, ROOT_CONTEXT);
}

export class TransformError extends Error {
  constructor(msg: string, public readonly path: string) {
    super(msg);
  }
}

export function runDecoderE<S, T>(d: Transform<S, T>, value: S): T {
  const r = d(value, ROOT_CONTEXT);
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
  Part: partial,
  Arr: arr,
  Some: some,
  Map: map,
  Select: select,
  Pipe: pipe
};
