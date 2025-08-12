import { ShapeFlags } from "@vue/shared";
import { Fragment, isSameVnode, Text } from "./createVnode";
import getSequence from "./seq";
import { reactive, ReactiveEffect } from "@vue/reactivity";
import { queueJob } from "./scheduler";

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
  const mountElement = (vnode, container, anchor) => {
    const { type, props, children, shapeFlag } = vnode;
    // 创建节点，同时把真实DOM和虚拟DOM关联起来
    const el = (vnode.el = hostCreateElement(type));
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
    hostInsert(el, container, anchor);
  }

  /**
   * 卸载节点
   * @param vnode 需要卸载的虚拟节点
   */
  function unmount (vnode) {
    if (vnode.type === Fragment) {
      unmountChildren(vnode.children)
    } else {
      hostRemove(vnode.el)
    }
  }

  /**
   * 移除子节点
   * @param children 子节点
   */
  const unmountChildren = (children) => {
    children.forEach(child => {
      unmount(child)
    })
  }

  const processElement = (n1, n2, container, anchor) => {
    if (n1 === null) { // 没有老节点，首次渲染
      mountElement(n2, container, anchor);
    } else { // 老节点存在，更新
      patchElement(n1, n2, container);
    }
  }

  /**
   * 比较属性
   * @param oldProps 老属性
   * @param newProps 新属性
   * @param el 元素节点
   */
  const patchProps = (oldProps, newProps, el) => {
    // 新的要全部生效
    for(let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    // 老的去掉
    for(let key in oldProps) {
      if (!(key in newProps)) { // 新的没有就去掉
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  /**
   * diff算法, 全量diff(递归) 快速diff(靶向更新) -> 基于模版编译的
   * @param c1 老节点
   * @param c2 新节点
   * @param el 元素节点
   */
  const patchKeyedChildren = (c1, c2, el) => {
    // 同层比较，先从头比较， 再从尾比较
    let i = 0, e1 = c1.length - 1, e2 = c2.length - 1;
    // 从头比  [a,b,c] -> [a,b,d,e] i = 2, e1 = 2, e2 = 3
    while (i <= e1 && i <= e2) { // 任何一方循环结束，跳出循环
      const n1 = c1[i], n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break
      }
      i++;
    }

 
    // 从尾比  [a,b,c] -> [d, e, b, c] i = 0, e1 = 2, e2 = 3
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1], n2 = c2[e2];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break
      }
      e1--;
      e2--;
    }

    // a b -> a b c => i = 2, e1 = 1, e2 = 2   i>e1 && i<= e2
    // a b -> c a b => i = 0, e1 = -1, e2 = 0   i>e1 && i<= e2 新的多老的少
    if (i > e1) { // 新的多，老的不够，新增
      if (i <= e2) { // 有插入的部分
        let nextPos = e2 + 1; // 根据下一个节点找到位置， 如果有说明是头部插入，没有就是尾部插入
        let anchor = c2[nextPos]?.el;
        while(i <= e2) {
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    } else if(i > e2) {
      // a b c -> a b => i = 2 e1 = 2 e2 = 1, 老的多，多出了 i -> e1 的节点，删除
      // c a b -> a b => i = 0 e1 = 1 e2 = -1, 老的多，多出了 i -> e1 的节点，删除
      if (i <= e1) {
        while(i <= e1) {
          unmount(c1[i]);
          i++;
        }
      }
    } else {
      // 上面的内容只是处理了头尾的情况，中间的情况需要特殊处理
      // a b c d e f g
      // a b e c d h f g  => 经过上面的逻辑后i = 2, e1 = 4, e2 = 5
      // 获取新老节点中不同的部分
      let s1 = i, s2 = i;
      // 使用新的节点做一个映射表
      const keyToNewIndexMap = new Map();
      let toBePatched = e2 - s2 + 1; // 需要倒序插入的个数
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0);

      for(let i = s1; i <= e2; i++) {
        const vnode = c2[i];
        keyToNewIndexMap.set(vnode.key, i);
      }
      for(let i = s1; i <= e1; i++) {
        const vnode = c1[i];
        const newIndex = keyToNewIndexMap.get(vnode.key);
        if (newIndex === undefined) { // 老的有新的没有，删除
          unmount(vnode);
        } else { // 老的有新的也有，更新
          newIndexToOldMapIndex[newIndex - s2] = i + 1;
          patch(vnode, c2[newIndex], el);
        }
      }

      let increasingSeq = getSequence(newIndexToOldMapIndex);
      let j = increasingSeq.length - 1; // 索引
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 3 2 1 0
        let newIndex = s2 + i; // h 对应的索引，找他的下一个元素作为参照物，来进行插入
        let anchor = c2[newIndex + 1]?.el;
        let vnode = c2[newIndex];
        if (!vnode.el) {
          // 新列表中新增的元素
          patch(null, vnode, el, anchor); // 创建h插入
        } else {
          if (i == increasingSeq[j]) {
            j--; // 做了diff算法有的优化
          } else {
            hostInsert(vnode.el, el, anchor); // 接着倒序插入
          }
        }
      }
    }
  }

  
  const patchChildren = (n1, n2, el) => {
    // 比较子节点
    // children 只有三种情况 text array null

    const c1 = n1.children;
    const c2 = n2.children;

    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    /**
     * 1. 新的是文本，老的是数组  移除老的
     * 2. 新的是文本，老的是文本  更新文本
     * 3. 老的是文本，新的是null  移除老的
     * 4. 老的是数组，新的是数组  diff算法
     * 5. 老的是数组，新的非数组  移除老的
     * 6. 老的是文本，新的是数组  移除老的->挂载新的
     */
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 老的是数组
        unmountChildren(c1); // 移除老的
      }
      if (c1 !== c2) { // 老的也是文本
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 老的是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 新的是数组
          // diff算法
          patchKeyedChildren(c1, c2, el);
        } else { // 新的不是数组
          unmountChildren(c1); // 移除老的
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) { // 老的是文本
          hostSetElementText(el, ''); // 移除文本
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 新的是数组
          mountChildren(c2, el); // 挂载新的
        }
      }
    }
  }

  /**
   * 比较两个节点
   * @param n1 老虚拟DOM
   * @param n2 新的虚拟DOM
   * @param container 
   */
  const patchElement = (n1, n2, container) => {
    // 比较元素差异，复用el
    // 比较属性和元素子节点
    let el = (n2.el = n1.el); // 复用老节点的el
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    // 比较属性  hostPatchProp 只能针对 class style event attr单独处理
    patchProps(oldProps, newProps, el);
    // 比较子节点
    patchChildren(n1, n2, el);
  }

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      // 虚拟节点关联真实节点
      n2.el = hostCreateText(n2.children);
      // 节点插入
      hostInsert(n2.el, container);
    } else {
      const el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  }

  const processFragment = (n1, n2, container) => {
    if (n1 === null) {
      mountChildren(n2.children, container)
    } else {
      patchChildren(n1, n2, container)
    }
  }

  const mountComponent = (n2, container, anchor) => {
    // 组件可以基于自己的状态重新渲染 本质上就是effect
    const { data = () => {}, render } = n2.type;
    const state = reactive(data()); // 组件状态

    const instance = {
      state, // 组件状态
      subTree: null, // 子树
      vnode: n2, // 组件虚拟节点
      isMounted: false, // 是否挂载完成
      update: null // 渲染函数
    }

    const componentUpdateFn = () => {
      if (!instance.isMounted) { // 首次渲染
        const subTree = render.call(state, state);
        patch(null, subTree, container, anchor);
        instance.subTree = subTree;
        instance.isMounted = true;
      } else {
        const subTree = render.call(state, state); // 更新
        patch(instance.subTree, subTree, container, anchor);
        instance.subTree = subTree;
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update));

    const update = (instance.update = () => effect.run());
    
    update();
  }

  const processComponent = (n1, n2, container, anchor = null) => {
    if (n1 === null) { // 组件渲染
      mountComponent(n2, container, anchor);
    } else { // 组件更新
      // updateComponent(n1, n2);
  }
}

  /**
   * 比较新老节点
   * @param n1 老节点
   * @param n2 新节点
   * @param container 
   * @returns 
   */
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) return // 新老节点相同
    if (n1 && !isSameVnode(n1, n2)) { // 节点不同，删掉老的，挂载新的
      unmount(n1);
      n1 = null
    }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      // case Comment:
      //   processCommentNode(n1, n2, container);
      //   break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor);
        }
        
        break; 
      }
  }

   // 多次调用render 会进行虚拟节点的比较，在进行更新
  const render = (vnode, container) => {
    if (vnode === null) { // 渲染的空节点
      if (container._vnode) {
        return unmount(container._vnode)
      }
    } else {
      // 比对新老节点
      patch(container._vnode || null, vnode, container);
      // 比对完成后，把vnode赋值给老节点,_vnode保存的是老节点
      container._vnode = vnode
    }
  };
  return {
    render,
  };
}