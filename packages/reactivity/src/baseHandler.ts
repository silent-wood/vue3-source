import { activeEffect, trackEffect, triggerEffects } from './effect';
import { ReactiveFlags } from "./reactive"

export const mutableHandler = {
  // 原始对象，属性，代理对象
  get(target, key, receiver) {
    // 防止访问标识
    if (key === ReactiveFlags.IS_REACTIVE) return true
    // 防止代理 代理对象，给目标添加一个标识
    target[ReactiveFlags.IS_REACTIVE] = true
    track(target, key)
    // 为什么使用Reflect，详细的原因见reflect-test.js
    return Reflect.get(target, key, receiver)
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

export const createDep = (cleanup) => {
  const dep = new Map() as any;
  dep.cleanup = cleanup;
  return dep
}

// 将effect和对象obj以及key:name进行关联
// Map: { obj: Map1 }
// Map1: { name: new map() }
// 创建对象和effect的缓存对象
let targetMap = new WeakMap()
export function track(target, key) {
  // 获取当前对象是否已经收集过依赖
  let depsMap = targetMap.get(target)
  // 如果没有收集，就给当前对象创建一个map，同时放到缓存对象中
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  // 获取当前对象的当前属性是否有收集依赖
  let dep = depsMap.get(key)
  // 如果没有收集，给当前属性，创建一个空的Set,最终dep就是一个属性保存的effect集合
  if(!dep) {
    depsMap.set(
      key, 
      (dep = createDep(() => depsMap.delete(key)))
    );
  }
  // effect和dep进行关联
  trackEffect(activeEffect, dep);
}
// Map: { obj: Map1 }
// Map1: { name: new map() }
// 找到effect执行
export function trigger(target, key, val, oldVal) {
  let depsMap = targetMap.get(target)
  if (!depsMap) return
  let dep = depsMap.get(key)
  if(!dep) return
  triggerEffects(dep)
}