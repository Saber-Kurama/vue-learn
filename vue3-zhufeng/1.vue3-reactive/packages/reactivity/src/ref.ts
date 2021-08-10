import { hasChanged, isArray, isObject } from "@vue/shared/src";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOrTypes } from "./operators";
import { reactive } from "./reactive";

export function ref(value) {
  // 将普通类型变相一个对象， 使用 对象的 get set 方法
  return createRef(value);
}

export function shallowRef(value) {
  return createRef(value, true)
}

const convert = (val) => (isObject(val) ? reactive(val) : val);

class RefImpl {
  private _value;
  public __v_isRef = true; // 产生的实例会被添加 __v_isRef 表示是一个ref属性
  constructor(public rawValue, public shallow) {
    this._value = shallow ? rawValue : convert(rawValue);
  }
  get value() {
    track(this, TrackOpTypes.GET, "value");
    return this._value;
  }
  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) {
      // 判断老值和新值是否有变化
      this.rawValue = newValue; // 新值会作为老值
      this._value = this.shallow ? newValue : convert(newValue);
      trigger(this, TriggerOrTypes.SET, "value", newValue);
    }
  }
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow);
}

class ObjectRefImpl {
  public __v_isRef = true;
  constructor(public target, public key) {}
  get value(){ // 代理  
      return this.target[this.key] // 如果原对象是响应式的就会依赖收集
  }
  set value(newValue){
      this.target[this.key] = newValue; // 如果原来对象是响应式的 那么就会触发更新
  }
}

// 将响应式对象的某一个key对应的值 转化成ref 
export function toRef(target, key) { // 可以把一个对象的值转化成 ref类型
  return new ObjectRefImpl(target, key)
}

export function toRefs(object){ // object 可能传递的是一个数组 或者对象
  const ret = isArray(object) ? new Array(object.length) :{}
  for(let key in object){
      ret[key] = toRef(object,key);
  }
  return ret;
}

