# Overview

This module allows you to check if an unknown javascript value conforms to a value of a known type.

# Installation

`npm i --save typed-decoders`

# Examples

You might receive a javascript object from a server that represents a library resource:

```
import { Decoders as D, runDecoder, isSuccess, GetType } from './index';

const PersonDecoder = D.obj({
  id: D.Num,
  firstName: D.Str,
  lastName: D.Str,
  dateOfBirth: D.StrDate
})

const ResourceDecoder = D.obj({
  id: D.Num,
  type: D.Some(D.Lit("book"), D.Lit("blueray"), D.Lit("dvd")),
  name: D.Str,
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
const SuccessD = D.Obj({
  kind: D.Lit("success"),
  value: D.Num
});

const FailureD = D.Obj({
  kind: D.Lit("failure"),
  error: D.Str
})

const ResultD = D.Some(SuccessD, FailureD);

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
- `Succeed` Accepts always and returns a fixed value.
- `Lit` Accepts literal value
- `Str` Accepts string
- `Bool` Accepts boolean value
- `Num` Accepts number value
- `StrNum` Accepts a string that can be converted to number
- `Undef` Accepts undefined value
- `Date` Accepts Date instance value
- `StrDate` Accepts a string that can be converted to a Date
- `Null` Accepts null value
- `Pass` Accepts anything, but decode result type is still unknown
- `Opt` Converts decoder to accept also undefined/null values
- `Obj` Create a decoder that accepts an object. Each field is given an own decoder
  `Part` Create a decoder that accepts an object with each field optional (partial object). Each field is given an own decoder
- `Arr` Creates a decoder that accepts an Array. Each item of an array is decoded with same decoder
- `Some` Creates a decoder that accepts multiple different decodings.
- `Map` Creates a decoder that accepts multiple types, but converts them all to a single type.
- `Every` Creates a decoder that decodes value with multiple object types and combines them.
- `Def` Converts a decoder to a decoder with a default value.

# Examples for the more complex decoders

## Arr

An array of key-value pairs

```
const KeyValuesDecoder = D.Arr(D.Obj({
  key: D.Str,
  value: D.Num
}))
```

## Select

With select you can make multiple type decoders to converge to one type of decoder.

For example to convert numbers, strings, booleans to strings use the following:

```
const MySelectDecoder = D.Select(
  [D.Num, (v: number) => `number ${v}`],
  [D.Str, (v: string) => `string ${v}`],
  [D.Bool, (v: boolean) => `boolean ${v}`],
);
type MySelect = GetType<typeof MySelectDecoder>
```

`MySelectDecoder` will fail if you give it a value of some other type than the three mentioned above.

If you want to make it to accept all types, you could for example add the following as the last parameter `` [D.Pass, (v: unknown) =>`unknown \${v}`] ``

## Map

With Map you can combine one or more decoders to return another type of decoder.

Fo example if you have couple of decoders and you would like to combine them to a cleaner structure:

```
const CarDecoder = D.Obj({
  _brand: D.Some(D.Lit("bmw"), D.Lit("toyota"), D.Lit("volvo")),
  _model: D.Str
})

const PricedDecoder = D.Obj({
  _price: D.Num
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

# Running the decoder

When you have a decoder, you can run it with `runDecoder`-function.

```
function runDecoder<S, T>(decoder: Transform<T>, value: unknown): Result<T>;
```

It basically just initializes the decode context and calls the .

If you prefer exceptions instead of returning a success/failure (Result), you can use `runDecoderE`.
It will throw an error if the value isn't of correct type.
