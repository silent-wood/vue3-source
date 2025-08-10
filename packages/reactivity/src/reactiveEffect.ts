import { activeEffect, trackEffect, triggerEffects } from './effect';

// 创建对象和effect的缓存对象
let targetMap = new WeakMap()

export const createDep = (cleanup, name) => {
  const dep = new Map() as any;
  dep.cleanup = cleanup;
  dep.name = name;
  return dep
}

// 将effect和对象obj以及key:name进行关联
// Map: { obj: Map1 }
// Map1: { name: new map() }

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
      (dep = createDep(() => depsMap.delete(key), key))
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