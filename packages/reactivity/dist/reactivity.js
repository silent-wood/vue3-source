// packages/shared/src/index.ts
var isObject = (value) => {
  return value !== null && typeof value === "object";
};

// packages/reactivity/src/effect.ts
var activeEffect = void 0;
function preCleanupEffect(effect2) {
  effect2._depsLength = 0;
  effect2._trackId++;
}
function postCleanupEffect(effect2) {
  if (effect2.deps.length > effect2._depsLength) {
    for (let i = effect2._depsLength; i < effect2.deps.length; i++) {
      cleanDepEffect(effect2.deps[i], effect2);
    }
    effect2.deps.length = effect2._depsLength;
  }
}
var ReactiveEffect = class {
  // 创建的effect是响应式的
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    // 用于记录当前effect执行了几次，防止一个属性多次访问，只收集一次
    this._depsLength = 0;
    this._running = 0;
    // 是否正在执行
    this.deps = [];
    // [new Set(), new Set] 记录effect依赖的属性列表
    this.active = true;
  }
  run() {
    if (!this.active) return this.fn();
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanupEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanupEffect(this);
      activeEffect = lastEffect;
    }
  }
  stop() {
    this.active = false;
  }
};
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size === 0) {
    dep.cleanup();
  }
}
function trackEffect(effect2, dep) {
  if (dep.get(effect2) !== effect2._trackId) {
    dep.set(effect2, effect2._trackId);
    let oldDep = effect2.deps[effect2._depsLength];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect2);
      }
      effect2.deps[effect2._depsLength++] = dep;
    } else {
      effect2._depsLength++;
    }
  }
}
function triggerEffects(dep) {
  for (const effect2 of dep.keys()) {
    if (!effect2._running) {
      if (effect2.scheduler) {
        effect2.scheduler();
      }
    }
  }
}
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
}

// packages/reactivity/src/reactiveEffect.ts
var targetMap = /* @__PURE__ */ new WeakMap();
var createDep = (cleanup, name) => {
  const dep = /* @__PURE__ */ new Map();
  dep.cleanup = cleanup;
  dep.name = name;
  return dep;
};
function track(target, key) {
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(
      key,
      dep = createDep(() => depsMap.delete(key), key)
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

// packages/reactivity/src/baseHandler.ts
var mutableHandler = {
  // 原始对象，属性，代理对象
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) return true;
    target["__v_isReactive" /* IS_REACTIVE */] = true;
    track(target, key);
    const result = Reflect.get(target, key, receiver);
    if (isObject(result)) {
      return reactive(result);
    }
    return result;
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
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return createRef(value);
}
function createRef(value) {
  return new RefImpl(value);
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.__v_isRef = true;
    // 保存值
    this.dep = /* @__PURE__ */ new Set();
    this._value = toReactive(rawValue);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = newValue;
      this.rawValue = newValue;
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      ref2.dep = createDep(() => ref2.dep = void 0, "undefined")
    );
  }
}
function triggerRefValue(ref2) {
  let dep = ref2.dep;
  if (dep) {
    triggerEffects(dep);
  }
}
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
    // ref标识
    this.dep = /* @__PURE__ */ new Set();
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function isRef(ref2) {
  return !!ref2.__v_isRef;
}
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function toRefs(object) {
  const ret = {};
  for (const key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
function proxyRefs(object) {
  return new Proxy(object, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      return isRef(res) ? res.value : res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      if (isRef(oldValue)) {
        oldValue.value = value;
      } else {
        Reflect.set(target, key, value, receiver);
      }
      return true;
    }
  });
}
function unRef(ref2) {
  return isRef(ref2) ? ref2.value : ref2;
}
export {
  ReactiveFlags,
  activeEffect,
  effect,
  isRef,
  proxyRefs,
  reactive,
  ref,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  triggerEffects,
  unRef
};
//# sourceMappingURL=reactivity.js.map
