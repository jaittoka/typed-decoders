export interface DecodeSuccess<T> {
  type: "success";
  value: T;
}

export interface DecodeFailure {
  type: "failure";
  error: string;
  decoderName: string;
  path: string;
}

export class DecodeError extends Error {
  constructor(
    error: string,
    public readonly decoderName: string,
    public readonly path: string
  ) {
    super(error);
  }
}

export type DecodeResult<T> = DecodeSuccess<T> | DecodeFailure;

export interface DecodeContext {
  parent?: DecodeContext;
  key: string | number;
}

const ROOT_CONTEXT = { key: "<root>" };

export interface Decoder<T> {
  name: string;
  decode(value: unknown, ctx: DecodeContext): DecodeResult<T>;
}

export type GetType<T> = T extends Decoder<infer U> ? U : never;

export function formatPath(context: DecodeContext): string {
  const res = [] as string[];
  while (context.parent !== undefined) {
    res.push(context.key.toString());
    context = context.parent;
  }
  res.reverse();
  return res.join(".");
}

export function failure<T>(
  error: string,
  decoderName: string,
  ctx: DecodeContext
): DecodeResult<T> {
  const path = formatPath(ctx);
  return { type: "failure", error, decoderName, path };
}

export function success<T>(value: T): DecodeResult<T> {
  return { type: "success", value };
}

export function isSuccess<T>(value: unknown): value is DecodeSuccess<T> {
  return (value as DecodeSuccess<T>).type === "success";
}

export function isFailure<T>(value: unknown): value is DecodeFailure {
  return (value as DecodeFailure).type === "failure";
}

export function context(parent: DecodeContext, key: string | number) {
  return { parent, key };
}

export type LiteralTypes = undefined | null | boolean | number | string;

const UnknownDecoder: Decoder<unknown> = {
  name: "Unknown",
  decode: function(value: unknown, ctx: DecodeContext) {
    return success(value);
  }
};

const LiteralDecoder = <T extends LiteralTypes>(expect: T): Decoder<T> => {
  const name = "Literal";
  return {
    name,
    decode: function(value: unknown, ctx: DecodeContext) {
      if (value !== expect) {
        return failure("expected_literal", name, ctx);
      }
      return success(expect);
    }
  };
};

const StringDecoder: Decoder<string> = {
  name: "String",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<string> {
    if (typeof value !== "string") {
      return failure("expected_string", StringDecoder.name, ctx);
    }
    return success(value);
  }
};

const BooleanDecoder: Decoder<boolean> = {
  name: "Boolean",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<boolean> {
    if (typeof value !== "boolean") {
      return failure("expected_boolean", BooleanDecoder.name, ctx);
    }
    return success(value);
  }
};

const NumberDecoder: Decoder<number> = {
  name: "Number",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<number> {
    if (typeof value !== "number") {
      return failure("expected_number", NumberDecoder.name, ctx);
    }
    return success(value);
  }
};

const NumberStringDecoder: Decoder<number> = {
  name: "NumberString",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<number> {
    if (typeof value !== "string") {
      return failure("expected_numberstring", NumberStringDecoder.name, ctx);
    }
    const res = parseFloat(value);
    if (isNaN(res)) {
      return failure("expected_numberstring", NumberStringDecoder.name, ctx);
    }
    return success(res);
  }
};

const DateDecoder: Decoder<Date> = {
  name: "Date",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<Date> {
    if (!(value instanceof Date)) {
      return failure("expected_date", DateDecoder.name, ctx);
    }
    return success(value);
  }
};

const DateStringDecoder: Decoder<Date> = {
  name: "DateString",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<Date> {
    if (typeof value !== "string") {
      return failure("expected_datestring", DateStringDecoder.name, ctx);
    }
    const res = new Date(value);
    if (isNaN(res.getTime())) {
      return failure("expected_datestring", DateStringDecoder.name, ctx);
    }
    return success(res);
  }
};

const UndefinedDecoder: Decoder<undefined> = {
  name: "Undefined",
  decode: function(
    value: unknown,
    ctx: DecodeContext
  ): DecodeResult<undefined> {
    if (value !== undefined) {
      return failure("expected_undefined", UndefinedDecoder.name, ctx);
    }
    return success(value as undefined);
  }
};

const NullDecoder: Decoder<null> = {
  name: "Null",
  decode: function(value: unknown, ctx: DecodeContext): DecodeResult<null> {
    if (value !== null) {
      return failure("expected_null", NullDecoder.name, ctx);
    }
    return success(value as null);
  }
};

const TupleDecoder = <T extends any[]>(
  ...decoders: { [K in keyof T]: Decoder<T[K]> }
): Decoder<T> => {
  const name = `[${decoders.map(d => d.name).join(", ")}]`;
  return {
    name,
    decode: function(value: unknown, ctx: DecodeContext) {
      const result = ([] as unknown) as T;
      if (!Array.isArray(value)) {
        return failure("expected_tuple", name, ctx);
      }
      for (let i = 0; i < decoders.length; i++) {
        const r = decoders[i].decode(value[i], context(ctx, i));
        if (isFailure(r)) {
          return r;
        }
        result[i] = r.value;
      }
      return success(result);
    }
  };
};

const OptionalDecoder = <T>(decoder: Decoder<T>): Decoder<T | undefined> => {
  const name = `${decoder.name} | Undefined`;
  return {
    name,
    decode: function(value: unknown, ctx: DecodeContext) {
      if (value === undefined) {
        return success(undefined);
      }
      return decoder.decode(value, ctx);
    }
  };
};

const ArrayDecoder = <T>(decoder: Decoder<T>): Decoder<T[]> => {
  const name = `${decoder.name}[]`;
  return {
    name,
    decode: function(value: unknown, ctx: DecodeContext) {
      if (!Array.isArray(value)) {
        return failure("expected_array", name, ctx);
      }
      const res = [] as T[];
      for (let i = 0; i < value.length; i++) {
        const r = decoder.decode(value[i], context(ctx, i));
        if (isFailure(r)) {
          return r;
        }
        res.push(r.value);
      }
      return success(res);
    }
  };
};

const RecordDecoder = <T>(
  fields: { [K in keyof T]: Decoder<T[K]> }
): Decoder<T> => {
  const name = `{ ${Object.keys(fields)
    .map(name => `${name}: ${fields[name as keyof T].name}`)
    .join(", ")} }`;
  return {
    name,
    decode: function(value: unknown, ctx: DecodeContext) {
      if (typeof value !== "object" || value === null) {
        return failure("expected_object", name, ctx);
      }
      const keys = Object.keys(fields) as (keyof T)[];
      const res = {} as T;
      for (let i = 0; i < keys.length; i++) {
        const name = keys[i];
        const r = fields[name].decode(
          (value as any)[name],
          context(ctx, name as string)
        );
        if (isFailure(r)) {
          return r;
        }
        if (r.value !== undefined) {
          res[name] = r.value;
        }
      }
      return success(res);
    }
  };
};

const UnionDecoder = <T extends any[]>(
  ...decoders: { [K in keyof T]: Decoder<T[K]> }
): Decoder<T[number]> => {
  const name = `${decoders.map(d => d.name).join(" | ")}`;
  return {
    name,
    decode: function(value: unknown, ctx: DecodeContext) {
      for (let i = 0; i < decoders.length; i++) {
        const r = decoders[i].decode(value, context(ctx, i));
        if (isSuccess(r)) {
          return r;
        }
      }
      return failure("expected_union", name, ctx);
    }
  };
};

export const UnifyDecoder = <T extends any[], Z>(
  ...match: { [K in keyof T]: [Decoder<T[K]>, (value: T[K]) => Z] }
): Decoder<Z> => {
  const name = `(${match.map(d => d[0].name).join(" | ")}) => Z`;
  return {
    name,
    decode: (value: unknown, ctx: DecodeContext) => {
      for (let i = 0; i < match.length; i++) {
        const m = match[i];
        const r = m[0].decode(value, ROOT_CONTEXT);
        if (isSuccess(r)) return success(m[1](r.value));
      }
      return failure("expected_unify", name, ctx);
    }
  };
};

export const ProductDecoder = <T, S>(
  td: Decoder<T>,
  sd: Decoder<S>
): Decoder<T & S> => {
  return {
    name: "And",
    decode: (value: unknown, ctx: DecodeContext) => {
      const t = td.decode(value, ctx);
      const s = sd.decode(value, ctx);
      if (isFailure(t)) {
        return t;
      } else if (isFailure(s)) {
        return s;
      }
      return success({ ...t.value, ...s.value });
    }
  };
};

export const DefaultDecoder = <A>(
  decoder: Decoder<A>,
  defaultValue: A
): Decoder<A> => {
  return {
    name: `Default(${decoder.name})`,
    decode: (value: unknown, ctx: DecodeContext) => {
      if (value === undefined) return success(defaultValue);
      return decoder.decode(value, ctx);
    }
  };
};

export const MapDecoder = <A, B>(
  decoder: Decoder<A>,
  f: (value: A) => B
): Decoder<B> => {
  const name = `Map(${decoder.name})`;
  return {
    name,
    decode: (value: unknown, ctx: DecodeContext) => {
      const r = decoder.decode(value, ctx);
      if (isFailure(r)) {
        return r;
      }
      return success(f(r.value));
    }
  };
};

export function runDecoder<T>(
  decoder: Decoder<T>,
  value: unknown
): DecodeResult<T> {
  return decoder.decode(value, ROOT_CONTEXT);
}

export function runDecoderE<T>(decoder: Decoder<T>, value: unknown): T {
  const result = decoder.decode(value, ROOT_CONTEXT);
  if (isFailure(result)) {
    throw new DecodeError(result.error, result.decoderName, result.path);
  } else {
    return result.value;
  }
}

export const Decoders = {
  Literal: LiteralDecoder,
  String: StringDecoder,
  Boolean: BooleanDecoder,
  Number: NumberDecoder,
  NumberString: NumberStringDecoder,
  Undefined: UndefinedDecoder,
  Date: DateDecoder,
  DateString: DateStringDecoder,
  Null: NullDecoder,
  Unknown: UnknownDecoder,
  Optional: OptionalDecoder,
  Record: RecordDecoder,
  Array: ArrayDecoder,
  Tuple: TupleDecoder,
  Union: UnionDecoder,
  Unify: UnifyDecoder,
  Product: ProductDecoder,
  Map: MapDecoder,
  Default: DefaultDecoder
};
