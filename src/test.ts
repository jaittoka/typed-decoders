import * as test from "tape";
import { Decoders as D, runDecoder, runDecoderE, isSuccess } from "./index";

test("Unify", test => {
  test.plan(4);

  const UD = D.Unify(
    [D.Number, (v: number) => `${v}`],
    [D.Boolean, (v: boolean) => `${v}`],
    [D.Array(D.Number), (v: number[]) => `${v}`],
    [D.Unknown, (v: unknown) => "unknown"]
  );

  test.equal(runDecoderE(UD, 12), "12");
  test.equal(runDecoderE(UD, false), "false");
  test.equal(runDecoderE(UD, [1, 2, 3]), "1,2,3");
  test.equal(runDecoderE(UD, "hello"), "unknown");
});

test("Map", test => {
  test.plan(1);

  const AD = D.Record({
    name: D.String
  });
  const BD = D.Record({
    stars: D.Number
  });
  const MD = D.Map((a, b) => ({ foo: a.name, count: b.stars }), AD, BD);
  const data = { name: "Orion", stars: 12359 };
  const result = runDecoderE(MD, data);
  test.deepEqual(result, { foo: "Orion", count: 12359 });
});

test("Record", test => {
  test.plan(2);

  const AD = D.Record({
    name: D.String,
    address: D.Record({
      street: D.String
    })
  });
  const BD = D.Record({
    age: D.Number,
    address: D.Record({
      zip: D.Number
    })
  });
  const PD = D.Product(AD, BD);

  const data = {
    name: "John Doe",
    age: 33,
    address: {
      street: "Hello",
      zip: 12345
    }
  };

  const result = runDecoder(PD, data);
  test.assert(isSuccess(result));
  test.deepEqual((result as any).value, data);
});

test("DateString", test => {
  test.plan(2);

  const d = new Date();
  let result = runDecoder(D.DateString, d.toISOString());
  test.assert(isSuccess(result));
  test.equal((result as any).value.getTime(), d.getTime());
});
