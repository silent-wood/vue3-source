import { activeEffect, trackEffect, triggerEffects } from "./effect";
import { toReactive } from "./reactive";
import { createDep } from "./reactiveEffect";

export function ref(value) {
  return createRef(value)
}

function createRef(value) {
  return new RefImpl(value)
}

class RefImpl {
  public __v_isRef = true; // ref标识
  public _value; // 保存值
  public dep = new Set()
  constructor(public rawValue) {
    this._value = toReactive(rawValue)
  }
  get value() {
    // 收集依赖
    trackRefValue(this);
    return this._value
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = newValue;
      this.rawValue = newValue;
      // 触发更新
      triggerRefValue(this);
    }
  }
}

export function trackRefValue(ref) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      (ref.dep = ref.dep || createDep(() => (ref.dep = undefined), 'undefined'))
    )
  }
}

export function triggerRefValue(ref) {
  let dep = ref.dep;
  if (dep) {
    triggerEffects(dep)
  }
}

class ObjectRefImpl {
  public __v_isRef = true; // ref标识
  public dep = new Set()
  constructor(public _object, public _key) { }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
}

export function isRef(ref) {
  return !!ref.__v_isRef
}

export function toRef(object, key) {
  return new ObjectRefImpl(object, key)
}

export function toRefs(object) {
  const ret = {};
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}

export function proxyRefs(object) {
  return new Proxy(object, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      return isRef(res) ? res.value : res
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      if (isRef(oldValue)) { // 如果老的值是ref,给ref.value赋值
        oldValue.value = value;
      } else {
         Reflect.set(target, key, value, receiver);
      }
      return true
    }
  })
}

// 返回内部值
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

