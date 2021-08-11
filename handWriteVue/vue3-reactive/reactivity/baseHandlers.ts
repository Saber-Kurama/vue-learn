import { Target, ReactiveFlags } from "./reactive";

const get = /*#__PURE__*/ createGetter();

function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    //  ReactiveFlags 是响应式对象 附加的 key
    // if (key === ReactiveFlags.IS_REACTIVE) { // 是否是响应式
    //   return !isReadonly;
    // } else if (key === ReactiveFlags.IS_READONLY) { // 是否是只读
    //   return isReadonly;
    // } else if (
    //   key === ReactiveFlags.RAW &&
    //   receiver ===
    //     (isReadonly
    //       ? shallow
    //         ? shallowReadonlyMap
    //         : readonlyMap
    //       : shallow
    //       ? shallowReactiveMap
    //       : reactiveMap
    //     ).get(target)
    // ) {
    //   return target;
    // }
    
    // // 数组情况
    // const targetIsArray = isArray(target)
    console.log("get", key);
    console.log("target", target);
    const res = Reflect.get(target, key, receiver);
    // tack 啥的
    return res;
  };
}
const set = /*#__PURE__*/ createSetter();
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    const result = Reflect.set(target, key, value, receiver);
    return false;
  };
}
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  // deleteProperty,
  // has,
  // ownKeys
};
