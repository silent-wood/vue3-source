import { isObject, isString, ShapeFlags } from "@vue/shared";
import { createVnode, isVnode } from "./createVnode";

export function h(type, propsOrChildren?, children?) {
  let len = arguments.length;
  if (len === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) { // h('div', { id: 'app' })
      // 虚拟节点
      if (isVnode(propsOrChildren)) {  // h('div', h('span'))
        return createVnode(type, null, [propsOrChildren])
      } else { // h('div', { id: 'app' })
        // 属性
        return createVnode(type, propsOrChildren, null)
      }
    }
    // 数组 或者 文本
    return createVnode(type, null, propsOrChildren)
  } else {
    if (len > 3) { // h('div', { id: 'app'}, 'hello', 'world')
      children = Array.from(arguments).slice(2)
    console.log(children)
    } else if (len === 3 && isVnode(children)) { // h('div', { id: 'app'}, h('span'))
      children = [children]
    }
    return createVnode(type, propsOrChildren, children)
  }
}