import { currentInstance } from "./component";

export function provide(key, value) {
  // 子节点用的是父节点的
  // 父       子, 子组件提供的心得属性和父组件的provide是没有关系的
  // { a: 1}  { a: 1, b:2 }
  if (!currentInstance) return // 建立在组件基础上
  // 获取父组件的provide
  const parentProvide = currentInstance.parent?.provodes;
  let provides = currentInstance.provides;

  // 在创建组件的时候是直接使用的父组件的或者创建的一个空的，所以可以直接判断
  if (parentProvide === provides) {
    // 如果在子组件上新增了 provides 需要拷贝一份全薪的
    provides = currentInstance.provides = Object.create(parentProvide);
  }
  provides[key] = value;
}

export function inject(key, defaultValue) {
  if (!currentInstance) return // 建立在组件基础上
  const provides = currentInstance.parent?.provides;
  if (provides && key in provides) {
    return provides[key]; // 直接从provides中取值
  } else {
    return defaultValue; // 默认值
  }
}