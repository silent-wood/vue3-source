import { isFunction } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";

class ComputedRefImpl {
  public _value;
  public effect;
  constructor(getter, public setter) { 
    // 创建一个effect，来关注当前计算属性的dirty属性
    this.effect = new ReactiveEffect(
      () => getter(this._value), // 用户传入的getter函数
      () => {
        // 计算属性依赖的值发生了变化，需要触发effect更新,还需要将dirty变成脏的
        triggerRefValue(this);

      }
    )
  }
  get value() {
    // 默认effect的dirty都是脏的，需要执行effect
    if (this.effect.dirty) {
      // effect执行过后，不脏了
      this._value = this.effect.run();
      trackRefValue(this);
    }
    return this._value
  }
  set value(newValue) {
    this.setter(newValue);
  }
}

/**
 * 1、计算属性默认维护了一个dirty属性，默认就是true，稍后运行(effect.run)过一次之后，dirty就变成false了,当依赖的属性发生变化后会再次设置成true
 * 2、计算属性也是一个effect{computedEffect}，依赖的属性会收集这个计算属性,当依赖的属性发生变化后，会让计算属性effect中的dirty变成true
 * 3、计算属性页具有收集effect的能力，依赖的值发生变化后会触发收集的effect重新执行
 */

export function computed(getterOrOption) {
  let onlyGetter = isFunction(getterOrOption);
  let getter, setter;
  if (onlyGetter) {
    getter = getterOrOption;
    setter = () => {
      console.warn("no setter");
    };
  } else {
    getter = getterOrOption.get;
    setter = getterOrOption.set;
  }
  return new ComputedRefImpl(getter, setter);
}