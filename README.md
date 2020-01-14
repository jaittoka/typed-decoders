# This module offers following decoders

- Literal
- String
- Boolean
- Number
- NumberString
- Undefined
- Date
- DateString
- Null
- Unknown
- Optional
- Record
- Array
- Tuple
- Union
- Unify
- Product
- Map
- Default

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
