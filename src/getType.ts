const types = {
  Undefined: undefined,
  Null: null,
  Boolean: false as boolean,
  String: '' as string,
  Number: 0 as number,
  Array: [] as unknown[],
  Object: {} as object,
  RegExp: /./g as RegExp,
  Date: new Date('1903-06-14') as Date,
  Function: function(..._: unknown[]) { return null as unknown },
  Unknown: undefined as unknown,
} as const

export type TypeFromName = typeof types

export type TypeName = keyof TypeFromName

export const isOfType = <T extends TypeName>(name: T, value: unknown): value is TypeFromName[T] => 
  getTypeName(value) === name

export const isTypeName = (s: string): s is TypeName => types.hasOwnProperty(s)

export const getTypeName = (value: unknown): TypeName => {
  const name = Object.prototype.toString.apply(value).slice(8, -1)
  return isTypeName(name) ? name : 'Unknown'
}