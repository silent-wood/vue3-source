import { isString, ShapeFlags } from "@vue/shared";

export function isVnode(value) {
  return !!value?.__v_isVnode
}

/**
 * 判断两个节点是否相同
 * @param n1 旧节点
 * @param n2 新节点
 * @returns 
 */
export function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

// 按位或(|), 二进制有一个为1就是1
// let a = 5 // 转换成2进制 0101
// a = a | 3 // 3的二进制是 0011 => 等同于 按位与赋值 a |= 3
// a = 7                   0101 => 7
// 按位与(&), 二进制都为1才是1
// a = a & 3 // 3的二进制是 0011 => 等同于 按位与赋值 a &= 3
// a = 1                   0001 => 1

export function createVnode(type, props, children) {
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key,
    el: null, // 虚拟节点对应的真实节点
    shapeFlag
  }
  if (Array.isArray(children)) {
    // vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN; // 虚拟节点类型
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN // 简写， 按位或赋值运算符
  } else {
    children = String(children)
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }
  return vnode
}