import * as test from "tape";
import { Decoders as D, runDecoder, runDecoderE, isSuccess } from "./index";

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

  const d = new Date();
  let result = runDecoder(D.StrDate, d.toISOString());
  test.assert(isSuccess(result));
  test.equal((result as any).value.getTime(), d.getTime());
});
