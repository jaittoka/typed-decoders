import * as test from "tape";
import { Decoders as D, runDecoder, runDecoderE, isSuccess, isFailure } from "./index";

test("Unify", test => {
  test.plan(4);

  const UD = D.Select(
    [D.Num, (v: number) => `${v}`],
    [D.Bool, (v: boolean) => `${v}`],
    [D.Arr(D.Num), (v: number[]) => `${v}`],
    [D.Pass, (v: unknown) => "unknown"]
  );

  test.equal(runDecoderE(UD, 12), "12");
  test.equal(runDecoderE(UD, false), "false");
  test.equal(runDecoderE(UD, [1, 2, 3]), "1,2,3");
  test.equal(runDecoderE(UD, "hello"), "unknown");
});

test("Object", test => {
  const Person = D.Obj({
    name: D.Str,
    age: D.Num,
    addr: D.Obj({
      street: D.Str
    }),
    cars: D.Arr(D.Str)
  });

  const data = {
    name: "John",
    age: 40,
    addr: {
      street: "Sunset 12"
    },
    cars: ["ferrari", "bmw"]
  };

  test.plan(1);
  const result = runDecoderE(Person, data);
  test.deepEqual(result, data);
});

test("Object should fail with missing field", test => {
  const Person = D.Obj({
    name: D.Str,
    age: D.Num,
  });

  const data = {
    name: "John",
  };

  test.plan(1);
  const result = runDecoder(Person, data);
  test.assert(isFailure(result));
});


test("Union", test => {
  const E1 = D.Obj({
    kind: D.Lit("number"),
    value: D.Num
  });
  const E2 = D.Obj({
    kind: D.Lit("operator"),
    name: D.Str
  });

  const data = {
    kind: "operator",
    name: "plus"
  };

  test.plan(1);

  const result = runDecoderE(D.Some(E1, E2), data);
  test.deepEqual(result, data);
});

test("Every", test => {
  test.plan(1);

  const AD = D.Obj({
    name: D.Str
  });
  const BD = D.Obj({
    stars: D.Num
  });
  const MD = D.Map((a, b) => ({ foo: a.name, count: b.stars }), AD, BD);
  const data = { name: "Orion", stars: 12359 };
  const result = runDecoderE(MD, data);
  test.deepEqual(result, { foo: "Orion", count: 12359 });
});

test("DateString", test => {
  test.plan(2);

  const StrDate = D.Pipe(D.Str, D.StrDate);
  const d = new Date();
  let result = runDecoder(StrDate, d.toISOString());
  test.assert(isSuccess(result));
  test.equal((result as any).value.getTime(), d.getTime());
});

test("Array of objects", test => {
  test.plan(2);
  const d1 = new Date("2020-01-02");
  const d2 = new Date("2020-01-03");
  const decoder = D.Arr(
    D.Obj({
      date: D.Date,
      isOk: D.Bool
    })
  );

  const data = [
    { date: d1, isOk: true },
    { date: d2, isOk: false }
  ];

  let result = runDecoder(decoder, data);
  test.assert(isSuccess(result));
  test.deepEqual((result as any).value, [
    { date: d1, isOk: true },
    { date: d2, isOk: false }
  ]);
});

test("Partial", test => {
  test.plan(4);

  const decoder = D.Part({
    name: D.Str,
    age: D.Num
  });

  let result;
  result = runDecoder(decoder, { name: undefined });
  test.assert(isSuccess(result));
  result = runDecoder(decoder, { name: "x" });
  test.assert(isSuccess(result));
  result = runDecoder(decoder, { name: "x", age: 3 });
  test.assert(isSuccess(result));
  test.deepEqual((result as any).value, { name: "x", age: 3 });
});

test("Record should succeed", test => {
  test.plan(1);
  const decoder = D.Rec(D.Num);
  const data = {
    "foo": 3,
    "bar": 4
  }
  const result = runDecoder(decoder, data);
  test.assert(isSuccess(result));
})

test("Record should fail", test => {
  test.plan(1);
  const decoder = D.Rec(D.Num);
  const data = {
    "foo": 3,
    "bar": "4"
  }
  const result = runDecoder(decoder, data);
  test.assert(isFailure(result));
})