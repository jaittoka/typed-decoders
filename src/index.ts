import { arr, arrT } from "./array";
import { undef, nullt, str, lit, num, bool, func, arru, obju, date, strDate, strNum, int } from "./basic";
import { opt, def, map, select, some, pipe } from "./compose";
import { succeed, fail, pass } from "./core";
import { obj, rec } from "./object";
import { tuple, tupleN } from './tuple'

export const Decoders = {
  Succeed: succeed,
  Fail: fail,
  Undef: undef,
  Null: nullt,
  Str: str,
  Lit: lit,
  Num: num,
  Int: int,
  Bool: bool,
  Func: func,
  ArrU: arru,
  ObjU: obju,
  Date: date,
  StrDate: strDate,
  StrNum: strNum,
  Pass: pass,
  Opt: opt,
  Def: def,
  Obj: obj,
  Rec: rec,
  Arr: arr,
  ArrT: arrT,
  Tuple: tuple,
  TupleN: tupleN,
  Some: some,
  Map: map,
  Select: select,
  Pipe: pipe
}

export { GetType, Source, Transform, Result, Failure, Success } from './types'
export { failure, success, isFailure, isSuccess, runDecoder, runDecoderE, TransformError } from './core'