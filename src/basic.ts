import { success, failure } from "./core"
import { TypeName, TypeFromName, isOfType } from "./getType"
import { Source, Transform } from "./types"

const basicParser = <T extends TypeName>(typeName: T): Source<TypeFromName[T]> =>
  (u: unknown) =>  isOfType(typeName, u) ? success(u) : failure(`expected ${typeName}`)

export const undef = basicParser('Undefined')
export const nullt = basicParser('Null')
export const bool = basicParser('Boolean')
export const num = basicParser('Number')
export const str = basicParser('String')
export const date = basicParser('Date')
export const func = basicParser('Function')
export const arru = basicParser('Array')
export const obju = basicParser('Object')

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
