import { ShapeFlags } from "@vue/shared";

export function createRenderer(renderOptions) {
    const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

  /**
   * 挂载子节点
   * @param children 子节点 
   * @param container 容器
   */
  const mountChildren = (children, container) => {
    children.forEach(child => {
      patch(null, child, container)
    })
  }

  /**
   * 挂载节点
   * @param vnode 需要挂载的vnode
   * @param container 容器
   */
  const mountElement = (vnode, container) => {
    const { type, props, children, shapeFlag } = vnode;
    // 创建节点
    const el = hostCreateElement(type);
    // 设置属性
    if (props) {
      // 设置属性
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 文本节点
      hostSetElementText(el, children);
    } else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 子节点
      mountChildren(children, el)
    }
    // 挂载元素
    hostInsert(el, container);
  }

  /**
   * 比较新老节点
   * @param n1 老节点
   * @param n2 新节点
   * @param container 
   * @returns 
   */
  const patch = (n1, n2, container) => {
    if (n1 === n2) return // 新老节点相同
    if (n1 === null) { // 没有老节点，首次渲染
      mountElement(n2, container)
    }
  }

   // 多次调用render 会进行虚拟节点的比较，在进行更新
  const render = (vnode, container) => {
    // 比对新老节点
    patch(container._vnode || null, vnode, container);
    // 比对完成后，把vnode赋值给老节点,_vnode保存的是老节点
    container._vnode = vnode
  };
  return {
    render,
  };
}