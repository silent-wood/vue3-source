import { currentInstance, setCurrentInstance, unsetCurrentInstance } from "./component";

export const enum LifeCycle {
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um'
}


function createHook(type) {
  // 基于闭包实现实例和生命周期的绑定
  return (hook, target = currentInstance) => {
    if (target) {
      const hooks = (target[type] || (target[type] = []));
      // 添加生命周期 // 生命周期可以是多个
      // setup执行完成后会将currentInstance置为null,所以使用函数包裹以下保存instance
      const wrapHook = () => {
        setCurrentInstance(target);
        hook.call(target);
        unsetCurrentInstance()
      }
      hooks.push(wrapHook);
    }
  }
}

export const onBeforeMount = createHook(LifeCycle.BEFORE_MOUNT);
export const onMounted = createHook(LifeCycle.MOUNTED);
export const onBeforeUpdate = createHook(LifeCycle.BEFORE_UPDATE);
export const onUpdated = createHook(LifeCycle.UPDATED);
export const onBeforeUnmount = createHook(LifeCycle.BEFORE_UNMOUNT);
export const onUnmounted = createHook(LifeCycle.UNMOUNTED);

export function invokeArray(fns) {
  if (Array.isArray(fns)) {
    for (let i = 0; i < fns.length; i++) {
      fns[i]();
  }
}
}