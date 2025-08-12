export const isObject = (value: unknown) => {
  return value !== null && typeof value === "object";
}

export const isFunction = (value: unknown) => {
  return typeof value === "function";
}

export const isNumber = (value: unknown) => {
  return typeof value === "number";
}

export const isString = value => typeof value === 'string';

export * from './shapeFlags'