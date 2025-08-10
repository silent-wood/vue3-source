import { isObject } from "@vue/shared"
import { mutableHandler } from "./baseHandler"
import { ReactiveFlags } from "./constants"

// 缓存代理过的对象， target => proxy
// WeakMap防止内存泄漏，同时属性必须是对象
const reactiveMap = new WeakMap()


export const reactive = target => {
  return createReactiveObj(target)
}

// 响应式的核心逻辑
function createReactiveObj(target) {
  // reactive只能处理对象类型的数据
  if (!isObject(target)) return target
  /**
   * 如果已经代理过，直接返回代理过的对象，防止重复代理同一个对象
   * 从缓存的weakMap中取值
   * let obj = { name: 'ls' }
   * const state = reactive(obj)
   * const state1 = reactive(obj)
   *  */
  let existProxy = reactiveMap.get(target)
  if (existProxy) return existProxy
   /**
   * 如果代理一个已经是代理对象的对象，就直接返回代理对象
   * 如果不是一个代理对象的话，在取值的时候添加一个标识为true，当再次代理 代理对象时
   * 先取标识，看看是否存在，如果存在标识已经被代理过得，直接返回
   * let obj = { name: 'ls' }
   * const state = reactive(obj)
   * const state1= reactive(state)
   *  */
   if (target[ReactiveFlags.IS_REACTIVE]) return target

  // 生成一个代理对象并返回
  const proxy = new Proxy(target, mutableHandler)
  reactiveMap.set(target, proxy)
  return proxy
}

// 转换成reactive
export function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}