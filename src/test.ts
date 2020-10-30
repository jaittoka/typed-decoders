import * as test from "tape";
import { Decoders as D, runDecoder, runDecoderE, isSuccess, isFailure, Transform, Success, Failure } from "./index";
import { GetType } from "./types";

function parseSuccess<A, B>(test: test.Test, trans: Transform<A, B>, value: A): B {
  const result = trans(value)
  test.assert(isSuccess(result))
  return (result as Success<B>).value
}

function parseFail<A, B>(test: test.Test, trans: Transform<A, B>, value: A): string {
  const result = trans(value)
  test.assert(isFailure(result))
  const f = (result as Failure)
  return `${f.error}${f.path ? `, path = ${f.path}` : ''}`
}


test("Unify", test => {
  test.plan(8)

  const UD = D.Select(
    [D.Num, (v: number) => `${v}`],
    [D.Bool, (v: boolean) => `${v}`],
    [D.Arr(D.Num), (v: number[]) => `${v}`],
    [D.Pass, (v: unknown) => "unknown"]
  );

  test.equal(parseSuccess(test, UD, 12), "12")
  test.equal(parseSuccess(test, UD, false), "false")
  test.equal(parseSuccess(test, UD, [1, 2, 3]), "1,2,3")
  test.equal(parseSuccess(test, UD, "hello"), "unknown")
});

test("Object", test => {
  const Person = D.Obj({
    name: D.Str,
    age: D.Num,
    addr: D.Obj({
      street: D.Str
    }),
    cars: D.Arr(D.Str)
  })

  const data = {
    name: "John",
    age: 40,
    addr: {
      street: "Sunset 12"
    },
    cars: ["ferrari", "bmw"]
  }

  test.plan(2)
  const result = parseSuccess(test, Person, data)
  test.deepEqual(result, data)
});

test("Object should fail with missing field", test => {
  const Person = D.Obj({
    name: D.Str,
    age: D.Num,
  })

  const data = {
    name: "John",
  }

  test.plan(1)
  parseFail(test, Person, data)
});


test("Union", test => {
  const E1 = D.Obj({
    kind: D.Lit("number"),
    value: D.Num
  })
  const E2 = D.Obj({
    kind: D.Lit("operator"),
    name: D.Str
  })

  const data = {
    kind: "operator",
    name: "plus"
  }

  test.plan(2)

  const result = parseSuccess(test, D.Some(E1, E2), data)
  test.deepEqual(result, data)
})

test("Every", test => {
  test.plan(2)

  const AD = D.Obj({
    name: D.Str
  })
  const BD = D.Obj({
    stars: D.Num
  })
  const MD = D.Map((a, b) => ({ foo: a.name, count: b.stars }), AD, BD)
  const data = { name: "Orion", stars: 12359 }
  const result = parseSuccess(test, MD, data)
  test.deepEqual(result, { foo: "Orion", count: 12359 })
});

test("DateString", test => {
  test.plan(2)

  const StrDate = D.Pipe(D.Str, D.StrDate)
  const d = new Date()
  let result = parseSuccess(test, StrDate, d.toISOString())
  test.equal(result.getTime(), d.getTime())
})

test("Array of objects", test => {
  test.plan(2)
  const d1 = new Date("2020-01-02")
  const d2 = new Date("2020-01-03")
  const decoder = D.Arr(
    D.Obj({
      date: D.Date,
      isOk: D.Bool
    })
  )

  const data = [
    { date: d1, isOk: true },
    { date: d2, isOk: false }
  ]

  let result = parseSuccess(test, decoder, data)

  test.deepEqual(result, [
    { date: d1, isOk: true },
    { date: d2, isOk: false }
  ])
})

test("Partial", test => {
  test.plan(4)

  const decoder = D.Obj({
    name: D.Str
  }, {
    age: D.Num
  })

  let result
  result = parseSuccess(test, decoder, { name: 'x' })
  parseFail(test, decoder, { name: "x", age: 'x' })
  result = parseSuccess(test, decoder, { name: "x", age: 3 })
  test.deepEqual(result, { name: "x", age: 3 })
})

test("Multilevel objects", test => {
  const Addr = D.Obj({}, { zip: D.Num })
  const Company = D.Obj({
    name: D.Str,
    addr: Addr
  })
  const Person = D.Obj({
    name: D.Str,
    birth: D.Pipe(D.Str, D.StrDate),
    company: Company,
    addr: Addr
  })

  test.plan(2)
  const dateStr = '2000/01/13'
  const date = new Date(dateStr)
  const data = {
    name: 'John',
    birth: dateStr,
    company: {
      name: 'Acme inc',
      addr: { zip: 23 }
    },
    addr: {}
  }
  const result = parseSuccess(test, Person, data)
  const expect = { ...data, birth: date }
  test.deepEqual(result, expect)
})

test("Record should succeed", test => {
  test.plan(2)
  const decoder = D.Rec(D.Num)
  const data = {
    foo: 3,
    bar: 4
  }
  test.deepEqual(parseSuccess(test, decoder, data), data)
})

test("Record should fail", test => {
  test.plan(1)
  const decoder = D.Rec(D.Num)
  const data = {
    foo: 3,
    bar: "4"
  }
  parseFail(test, decoder, data)
})

test("Tuple1", test => {
  test.plan(3)
  const trans = D.Tuple(D.Num)
  test.deepEqual(parseSuccess(test, trans, [ 1 ]), [ 1 ])
  parseFail(test, trans, [ 'x' ])
})

test("Tuple2", test => {
  test.plan(3)
  const trans = D.Tuple(D.Num, D.Str)
  test.deepEqual(parseSuccess(test, trans, [ 1, 'x' ]), [ 1, 'x' ])
  console.log(parseFail(test, trans, [ 'x', 1 ]))
})

test("Integer", test => {
  test.plan(3)
  test.equal(parseSuccess(test, D.Int, 1), 1)
  parseFail(test, D.Int, 1.0001)
})