
interface Ref {}
export interface Target {
  // [ReactiveFlags.SKIP]?: boolean
  // [ReactiveFlags.IS_REACTIVE]?: boolean
  // [ReactiveFlags.IS_READONLY]?: boolean
  // [ReactiveFlags.RAW]?: any
}

export const reactiveMap = new WeakMap<Target, any>()

// only unwrap nested ref
export type UnwrapNestedRefs<T> = T extends Ref ? T : T

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: Object) {
  // // if trying to observe a readonly proxy, return the readonly version.
  // if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
  //   return target
  // }
  return createReactiveObject(
    target,
    // false,
    // mutableHandlers,
    // mutableCollectionHandlers,
    reactiveMap
  )
}

function createReactiveObject(target: Target, proxyMap: WeakMap<Target, any>) {
  // 边界判断
  // if (!isObject(target)) {
  //   if (__DEV__) {
  //     console.warn(`value cannot be made reactive: ${String(target)}`)
  //   }
  //   return target
  // }
  const proxy = new Proxy(
    target,
    // targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
    baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
}
let ss = reactive({name: 5})