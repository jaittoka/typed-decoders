function getType(value: any): string {
  return Object.prototype.toString.call(value).slice(8, -1);
}

function mergeObject(dest: any, src: any): any {
  const result = {} as any;
  Object.keys(dest).forEach(key => (result[key] = merge(dest[key], src[key])));
  Object.keys(src).forEach(key => (result[key] = merge(dest[key], src[key])));
  return result;
}

function mergeArray(dest: Array<any>, src: Array<any>): Array<any> {
  const result = [] as any[];
  for (let i = 0, n = Math.max(dest.length, src.length); i < n; i++) {
    result[i] = merge(dest[i], src[i]);
  }
  return result;
}

export default function merge(dest: any, src: any): any {
  const st = getType(src);
  const dt = getType(dest);
  if (dt === "Undefined") return src;
  if (st === "Undefined") return dest;
  if (dt !== st) return src;
  switch (dt) {
    case "Object":
      return mergeObject(dest, src);
    case "Array":
      return mergeArray(dest, src);
    default:
      return src;
  }
}
