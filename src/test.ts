import * as test from "tape";
import { Decoders as D, runDecoder, runDecoderE, isSuccess } from "./index";

test("Unify", test => {
  test.plan(4);

  const UD = D.select(
    [D.num, (v: number) => `${v}`],
    [D.bool, (v: boolean) => `${v}`],
    [D.arr(D.num), (v: number[]) => `${v}`],
    [D.pass, (v: unknown) => "unknown"]
  );

  test.equal(runDecoderE(UD, 12), "12");
  test.equal(runDecoderE(UD, false), "false");
  test.equal(runDecoderE(UD, [1, 2, 3]), "1,2,3");
  test.equal(runDecoderE(UD, "hello"), "unknown");
});

test("Object", test => {
  const Person = D.obj({
    name: D.str,
    age: D.num,
    addr: D.obj({
      street: D.str
    }),
    cars: D.arr(D.str)
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
  const E1 = D.obj({
    kind: D.lit("number"),
    value: D.num
  });
  const E2 = D.obj({
    kind: D.lit("operator"),
    name: D.str
  });

  const data = {
    kind: "operator",
    name: "plus"
  };

  test.plan(1);

  const result = runDecoderE(D.some(E1, E2), data);
  test.deepEqual(result, data);
});

test("Every", test => {
  test.plan(1);

  const AD = D.obj({
    name: D.str
  });
  const BD = D.obj({
    stars: D.num
  });
  const MD = D.every((a, b) => ({ foo: a.name, count: b.stars }), AD, BD);
  const data = { name: "Orion", stars: 12359 };
  const result = runDecoderE(MD, data);
  test.deepEqual(result, { foo: "Orion", count: 12359 });
});

test("DateString", test => {
  test.plan(2);

  const d = new Date();
  let result = runDecoder(D.strDate, d.toISOString());
  test.assert(isSuccess(result));
  test.equal((result as any).value.getTime(), d.getTime());
});
