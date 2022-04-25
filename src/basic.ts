import { success, failure } from "./core"
import { TypeName, TypeFromName, isOfType } from "./getType"
import { Source, Transform } from "./types"
import { pipe } from './compose'

const basicParser = <T extends TypeName>(typeName: T): Source<TypeFromName[T]> =>
  (u: unknown) =>  isOfType(typeName, u) ? success(u) : failure(`expected ${typeName}`)

const NotNaN: Transform<number, number> = (value) => isNaN(value) ? failure('expected valid number') : success(value)
const NotInvalidDate: Transform<Date, Date> = (value) => isNaN(value.valueOf()) ? failure('expected valid Date') : success(value)

export const undef = basicParser('Undefined')
export const nullt = basicParser('Null')
export const bool = basicParser('Boolean')
export const num = pipe(basicParser('Number'), NotNaN)
export const str = basicParser('String')
export const date = pipe(basicParser('Date'), NotInvalidDate)
export const func = basicParser('Function')
export const arru = basicParser('Array')
export const obju = basicParser('Object')
export const int: Transform<number, number> = (v) => isFinite(v) && Math.floor(v) === v ? success(v) : failure('expected integer')

export type LiteralTypes = undefined | null | boolean | number | string

export const lit = <T extends LiteralTypes>(expect: T): Source<T> =>
  (value: unknown) => {
    if (value !== expect) return failure("expected_literal")
    return success(expect)
  }

export const strDate: Transform<string, Date> = (value: string) => {
  return date(new Date(value))
}

export const strNum: Transform<string, number> = (value: string) => {
  const v = +new Number(value)
  if (isNaN(v)) return failure("expected_number_string")
  return success(v)
}


function guard<T>(f: (v: unknown) => v is T): Transform<unknown, T> {
  return (v) => f(v) ? success(v) : failure('expected to match type guard')
}
