import { isFunction, isNumber, isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from './reactive'
import { isRef } from './ref'

export function watch(source, cb, options = {} as any) {
  return doWatch(source, cb, options)
}

export function watchEffect(source, options = {} as any) {
  return doWatch(source, null, options)
}


/**
 * 递归遍历source，触发依赖收集
 * @param source 
 * @param deep 深度监听相关
 * @param currentDepth 当前遍历的层级，用来和deep比较
 * @param seen 防止循环引用，如果里面有source，则不再遍历
 */
function traverse(source, deep: boolean | number = false, currentDepth = 0, seen = new Set()) {
  // 如果source不是对象，直接返回
  if (!isObject(source)) return source
  // 如果deep=false/0，非深度监听，直接返回
  if (deep) {
    // 如果deep是数字，并且当前层级大于等于deep,超过了定义的深度，直接返回
    if (isNumber(deep) && currentDepth >= deep) {
      return source
    }
    currentDepth++;
  }
  // 防止循环引用
  if (seen.has(source)) return source
  seen.add(source);
  // 递归遍历source，会触发每个属性的getter
  for (const key in source) {
    traverse(source[key], deep, currentDepth, seen)
  }
  return source
}

function doWatch(source, cb, { deep, immediate }) {
  // watch 本质上也是一个effect
  let reactiveGetter = (source) => traverse(source, deep);
  let getter;
  if (isFunction(source)) {
    getter = source
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isRef(source)) {
    getter = () => source.value
  }

  let oldVal;
  let clean;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = undefined
    }
  }

  // job是一个scheduler,当依赖更新后会执行job
  const job = () => {
    if (cb) {
      // effect.run执行后会返回新的值
      const newVal = effect.run();
      // 在执行回调前，执行上一次的cleanup
      if (clean) clean();
      cb(newVal, oldVal, onCleanup);
      oldVal = newVal;
    } else {
      effect.run(); // watchEffect不需要oldVal
    }
  }
  const effect = new ReactiveEffect(getter, job);
  if (cb) { // watch
    if (immediate) { // 如果immediate=true,立即执行job
      job();
    } else {
      // 老的值就是effect.run()的返回值
      oldVal = effect.run();
    }
  } else { // watchEffect
    effect.run(); // watchEffect不需要oldVal
  }

  const unwatch = () => {
    effect.stop();
  }

  return unwatch
}