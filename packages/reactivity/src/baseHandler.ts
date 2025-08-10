
import { ReactiveFlags } from "./reactive";
import { track, trigger } from "./reactiveEffect";
import { reactive } from './reactive';
import { isObject } from '@vue/shared';

export const mutableHandler = {
  // 原始对象，属性，代理对象
  get(target, key, receiver) {
    // 防止访问标识
    if (key === ReactiveFlags.IS_REACTIVE) return true
    // 防止代理 代理对象，给目标添加一个标识
    target[ReactiveFlags.IS_REACTIVE] = true
    track(target, key);
    // 为什么使用Reflect，详细的原因见reflect-test.js
    const result = Reflect.get(target, key, receiver);
    if (isObject(result)) { // 懒代理
      return reactive(result)
    }
    return result
  },
  set(target, key, val, receiver) {
    let oldVal = target[key]
    let flag = Reflect.set(target, key, val, receiver)
    if (oldVal !== val) {
      trigger(target, key, val, oldVal)
    }
    return flag
  }
}

