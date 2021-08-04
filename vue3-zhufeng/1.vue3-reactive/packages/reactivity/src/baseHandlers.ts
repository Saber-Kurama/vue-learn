import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from "@vue/shared"
import { reactive, readonly } from "./reactive"

// get 逻辑
// 针对 浅拷贝和readonly 的一些处理，另外是收集依赖
const get = createGetter(false, false)
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true);
const showllowReadonlyGet = createGetter(true, true)

// set 
// readonly 不能赋值， 另外就是 触发 依赖的 effect
const set = createSetter();
const shallowSet = createSetter(true)

// 
export const mutableHandlers =  {
  get,
  set
}

export const shallowReactiveHandlers =  {
  get: shallowGet,
  set: shallowSet
}

let readonlyObj = {
  set: (target, key) => {
      console.warn(`set on key ${key} falied`)
  }
}
export const readonlyHandlers = extend({
  get: readonlyGet,
}, readonlyObj)
export const shallowReadonlyHandlers = extend({
  get: showllowReadonlyGet,
}, readonlyObj)

function createGetter( isReadonly = false, shallow = false) {
  // 这个最好返回箭头函数
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver);
    if(!isReadonly){
        // 执行 收集依赖
    }
    // 浅拷贝
    if(shallow) {
      return res
    }
    if(isObject(res)){
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  } 
}

function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {

    const oldValue = target[key]; // 获取老的值

    let hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target,key);

    const result = Reflect.set(target, key, value, receiver); // target[key] = value


    if(!hadKey){
        // 新增 
        // trigger(target,TriggerOrTypes.ADD,key,value);
    }else if(hasChanged(oldValue,value)){
        // 修改 
        // trigger(target,TriggerOrTypes.SET,key,value,oldValue)
    }


    // 我们要区分是新增的 还是修改的  vue2 里无法监控更改索引，无法监控数组的长度变化  -》 hack的方法 需要特殊处理


    // 当数据更新时 通知对应属性的effect重新执行


    return result;
}
}
