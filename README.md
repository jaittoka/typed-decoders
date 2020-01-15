# This module offers following decoders

- `Fail` Accepts never (always fails)
- `Success` Accepts always and returns a fixed value
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
- `Optional` Converts decoder to accept also undefined values
- `Record` Create an Object decoder with fields decoder.
- `Array` Creates an Array decoder with a item type decoder.
- `Tuple` Creates a Tuple decoder with item decoders.
- `Union` Creates a decoder that can accept multiple different decodings.
- `Unify` Creates a decoder that takes multiple decoders, but return a single type result
- `Product` Creates a decoder that decodes value with multiple object types and combines them.
- `Map` Creates a decoder that decodes value with multiple types and uses a combine function to make a single type out of them.
- `Default` Converts a decoder to a decoder with a default value.

# Usage examples

```
import { GetType, Decoders as D} from 'typed-decoders';

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

// this succeeds
const result: Result = runDecoder(ResultD, { kind: "success", value: 3 });

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
