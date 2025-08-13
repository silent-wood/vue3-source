import { proxyRefs, reactive } from "@vue/reactivity";
import { hasOwn, isFunction, isObject } from "@vue/shared";

export function createComponentInstance (vnode) {
  const instance = {
    data: null, // 组件状态
    subTree: null, // 子树
    vnode, // 组件虚拟节点
    isMounted: false, // 是否挂载完成
    update: null, // 渲染函数
    props: {},
    attrs: {},
    propsOptions: vnode.type.props,
    component: null,  // 元素的更新：n2.el = n1.el  组件更新：n2.component.subTree.el = n1.component.subTree.el
    proxy: null, // 用户访问props,attrs, data中的值的代理对象
    render: null,
    setupState: {}, // setup返回的对象
  }

  return instance;
}

/**
   * 初始化组件属性
   * @param instance 组件实例
   * @param rawProps 原始props
   */
const initProps = (instance, rawProps) => {
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {}; // 用户在组件中定义的props
  if (rawProps) {
    for (const key in rawProps) {
      if (key in propsOptions) {
        props[key] = rawProps[key]; // props中的是响应式的，不需要用reactive,应该是shallowReactive
      } else {
        attrs[key] = rawProps[key];
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
}

// 这是为了给用户访问$attrs, $slots ...
const publicProps = { // 策略模式
  $attrs: (instance) => instance.attrs
};
const instanceHandler = {
  get(target, key) {
    const { props, data, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key]
    }
    if (props && hasOwn(props, key)) {
      return props[key]
    }
    if (setupState.hasOwnProperty(key)) {
      return setupState[key]
    }
    const getter = publicProps[key];
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { props, data, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    }
    if (props && hasOwn(props, key)) {
      console.warn(`props is readonly`);
      return false
    }
    if (setupState && setupState.hasOwn(key)) { 
      setupState[key] = value
    }
    return true
  }
}

export function setupComponent(instance) {
  const { vnode } = instance;
  // 赋值属性
  initProps(instance, vnode.props);
  // 赋值代理对象
  instance.proxy = new Proxy(instance, instanceHandler);
  const { data = () => {}, render, setup } = vnode.type;
  if (isFunction(setup)) {
    const setupContext = {

    }
    // 需要将setup执行获取返回值
    const setupResult = setup(instance.props, setupContext);
    if (isFunction(setupResult)) { // 如果setup返回的是render函数
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
      console.warn('setup must return a function or object');
    }
  }


  if (!isFunction(data))  {
    console.warn('data must be a function');
  } else{
     // data中可以拿到props
    instance.data = reactive(data.call(instance.proxy));
  }
  // setup函数返回的render优先级高
  if (!instance.render) {
    instance.render = render
  }
}
