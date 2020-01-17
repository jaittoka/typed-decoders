# Overview

This module allows you to check if an unknown javascript value conforms to a value of a known type.

# Installation

`npm i --save typed-decoders`

# Examples

You might receive a javascript object from a server that represents a library resource:

```
import { Decoders as D, runDecoder, isSuccess, GetType } from './index';

const PersonDecoder = D.Record({
  id: D.Number,
  firstName: D.String,
  lastName: D.String,
  dateOfBirth: D.DateString
})

const ResourceDecoder = D.Record({
  id: D.Number,
  type: D.Union(D.Literal("book"), D.Literal("blueray"), D.Literal("dvd")),
  name: D.String,
  reservedBy: PersonDecoder
})
```

With ResourceDecoder you can assure that an object received from the server is valid.

```
const result = runDecoder(ResourceDecoder, valueFromServer);
if (isSuccess(result)) {
  // value was decoded succesfully (result.value has the actual value)
}
```

The type can be inferred directly from the decoders:

```
type Resource = GetType<typeof ResourceDecoder>
```

The inferred type for Resource is:

```
type Resource = {
    id: number;
    type: "book" | "blueray" | "dvd";
    name: string;
    reservedBy: {
      id: number;
      firstName: string;
      lastName: string;
      dateOfBirth: Date;
    }
}
```

This is very useful, because you don't have to write the types manually.

You can easily form different kind of types. For example a tagged unions:

```
const SuccessD = D.Record({
  kind: D.Literal("success"),
  value: D.Number
});

const FailureD = D.Record({
  kind: D.Literal("failure"),
  error: D.String
})

const ResultD = D.Union(SuccessD, FailureD);

type Result = GetType<typeof ResultD>;
```

The inferred type for Result is:

```
type Result = {
    kind: "success";
    value: number;
} | {
    kind: "failure";
    error: string;
}
```

# This module offers following decoders

- `Fail` Accepts never (always fails).
- `Success` Accepts always and returns a fixed value.
- `Literal` Accepts literal value
- `String` Accepts string
- `Boolean` Accepts boolean value
- `Number` Accepts number value
- `NumberString` Accepts a string that can be converted to number
- `Undefined` Accepts undefined value
- `Date` Accepts Date instance value
- `DateString` Accepts a string that can be converted to a Date
- `Null` Accepts null value
- `Unknown` Accepts anything, but decode result type is still unknown
- `Optional` Converts decoder to accept also undefined/null values
- `Record` Create a decoder that accepts an object. Each field is given an own decoder
- `Array` Creates a decoder that accepts an Array. Each item of an array is decoded with same decoder
- `Tuple` Creates a decoder that accepts a Tuple. Tuple is a fixed length array where each item position has its own decoder.
- `Union` Creates a decoder that accepts multiple different decodings.
- `Unify` Creates a decoder that accepts multiple types, but converts them all to a single type.
- `Product` Creates a decoder that decodes value with multiple object types and combines them.
- `Map` Creates a decoder that decodes value with multiple types and uses a combine function to make a single type out of them.
- `Default` Converts a decoder to a decoder with a default value.

# Examples for the more complex decoders

## Array

An array of key-value pairs

```
const KeyValuesDecoder = D.Array(D.Record({
  key: D.String,
  value: D.Number
}))
```

## Tuple

A tuple of three items: number, string and a boolean.

```
const MyTupleDecoder = D.Tuple(D.Number, D.String, D.Boolean);

type MyTuple = GetType<typeof MyTupleDecoder>
```

The inferred type (MyTuple) is `[number, string, boolean]`

## Unify

With unify you can make multiple type decoders to converge to one type of decoder.

For example to convert numbers, strings, booleans to strings use the following:

```
const MyUnifyDecoder = D.Unify(
  [D.Number, (v: number) => `number ${v}`],
  [D.String, (v: string) => `string ${v}`],
  [D.Boolean, (v: boolean) => `boolean ${v}`],
);
type MyUnify = GetType<typeof MyUnifyDecoder>
```

`MyUnifyDecoder` will fail if you give it a value of some other type than the three mentioned above.

If you want to make it to accept all types, you could for example add the following as the last parameter `` [D.Unknown, (v: unknown) =>`unknown \${v}`] ``

## Map

With Map you can combine one or more decoders to return another type of decoder.

Fo example if you have couple of decoders and you would like to combine them to a cleaner structure:

```
const CarDecoder = D.Record({
  _brand: D.Union(D.Literal("bmw"), D.Literal("toyota"), D.Literal("volvo")),
  _model: D.String
})

const PricedDecoder = D.Record({
  _price: D.Number
})

const MyCarDecoder = D.Map((c, p) => ({
  brand: c._brand,
  model: c._model,
  price: p._price
}), CarDecoder, PricedDecoder)

type MyCar = GetType<typeof MyCarDecoder>;
```

The inferred type for MyCar is

```
type MyCar = {
  brand: "bmw" | "toyota" | "volvo";
  model: string;
  price: number;
}
```

# Decoder structure

Decoder is an algebraic datatype with two members: `name` and `decode`.

```
export interface Decoder<T> {
  name: string;
  decode(value: unknown, ctx: DecodeContext): DecodeResult<T>;
}
```

# Running the decoder

When you have a decoder, you can run it with `runDecoder`-function.

```
function runDecoder<T>(decoder: Decoder<T>, value: unknown): DecodeResult<T>;
```

It basically just initializes the decode context and calls the `decode`-method inside the Decoder-type.

If you prefer exceptions instead of returning a success/failure (DecodeResult), you can use `runDecoderE`.
It will throw an error if the value isn't of correct type.

# DecodeResult

DecodeResult is a tagged union with two members:

```
interface DecodeSuccess<T> {
  type: "success";
  value: T;
}

interface DecodeFailure {
  type: "failure";
  error: string;
  decoderName: string;
  path: string;
}

type DecodeResult<T> = DecodeSuccess<T> | DecodeFailure;

```

There are helper functions isSuccess and isFailure for checking the result type.
