// packages/shared/src/index.ts
var isObject = (value) => {
  return value !== null && typeof value === "object";
};

// packages/reactivity/src/effect.ts
var activeEffect = void 0;
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    // 用于记录当前effect执行了几次
    this.active = true;
    // 创建的effect是响应式的
    this.deps = [];
    // [new Set(), new Set] 记录effect依赖的属性列表
    this._depsLength = 0;
  }
  run() {
    if (!this.active) return this.fn();
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      return this.fn();
    } finally {
      this.active = lastEffect;
    }
  }
  stop() {
    this.active = false;
  }
};
function trackEffect(effect2, dep) {
  dep.set(effect2, effect2._trackId);
  effect2.deps[effect2._depsLength++] = dep;
}
function triggerEffects(dep) {
  for (const effect2 of dep.keys()) {
    if (effect2.scheduler) {
      effect2.scheduler();
    }
  }
}
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
}

// packages/reactivity/src/baseHandler.ts
var mutableHandler = {
  // 原始对象，属性，代理对象
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) return true;
    target["__v_isReactive" /* IS_REACTIVE */] = true;
    track(target, key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, val, receiver) {
    let oldVal = target[key];
    let flag = Reflect.set(target, key, val, receiver);
    if (oldVal !== val) {
      trigger(target, key, val, oldVal);
    }
    return flag;
  }
};
var createDep = (cleanup) => {
  const dep = /* @__PURE__ */ new Map();
  dep.cleanup = cleanup;
  return dep;
};
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(
      key,
      dep = createDep(() => depsMap.delete(key))
    );
  }
  trackEffect(activeEffect, dep);
}
function trigger(target, key, val, oldVal) {
  let depsMap = targetMap.get(target);
  if (!depsMap) return;
  let dep = depsMap.get(key);
  if (!dep) return;
  triggerEffects(dep);
}

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
  return ReactiveFlags2;
})(ReactiveFlags || {});
var reactive = (target) => {
  return createReactiveObj(target);
};
function createReactiveObj(target) {
  if (!isObject(target)) return target;
  let existProxy = reactiveMap.get(target);
  if (existProxy) return existProxy;
  if (target["__v_isReactive" /* IS_REACTIVE */]) return target;
  const proxy = new Proxy(target, mutableHandler);
  reactiveMap.set(target, proxy);
  return proxy;
}
export {
  ReactiveFlags,
  activeEffect,
  effect,
  reactive,
  trackEffect,
  triggerEffects
};
//# sourceMappingURL=reactivity.js.map
