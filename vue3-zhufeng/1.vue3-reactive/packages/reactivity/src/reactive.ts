import { isObject } from "@vue/shared";
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from "./baseHandlers";

export const reactive = (target) => {
  return createReactiveObject(target, false, mutableHandlers);
};

export const shallowReactive = (target) => {
  return createReactiveObject(target, false, shallowReactiveHandlers);
};

export const shallowReadonly = (target) => {
  return createReactiveObject(target, true, readonlyHandlers);
};

export const readonly = (target) => {
  return createReactiveObject(target, true, shallowReadonlyHandlers);
};

const reactiveMap = new WeakMap(); // 会自动垃圾回收，不会造成内存泄漏， 存储的key只能是对
const readonlyMap = new WeakMap();

export function createReactiveObject(target, isReadonly, baseHandlers) {
  // 如果目标不是对象 没法拦截了，reactive这个api只能拦截对象类型
  // 其他的边界考虑
  if (!isObject(target)) {
    return target;
  }
  const proxyMap = isReadonly ? readonlyMap : reactiveMap;
  const existProxy = proxyMap.get(target);
  if (existProxy) {
    return existProxy; // 如果已经被代理了 直接返回即可
  }
  console.log('baseHandlers', baseHandlers)
  const proxy  = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy)
  return proxy
}
