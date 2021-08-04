import { isArray, isIntegerKey } from "@vue/shared";
import { TriggerOrTypes } from "./operators";

export function effect(fn, options: any = {}) {
  // 变成响应式effect
  const effect = createReactiveEffect(fn, options);
  if (!options.lazy) {
    // 不是 延迟 就直接执行
    effect();
  }
  return effect;
}
let uid = 0;
let activeEffect; // 存储当前的effect
const effectStack = [];
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    if (!effectStack.includes(effect)) {
      // 保证effect没有加入到effectStack中
      try {
        effectStack.push(effect);
        activeEffect = effect;
        return fn(); // 函数执行时会取值  会执行get方法
      } finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };
  effect.id = uid++;
  effect._isEffect = true;
  effect.raw = fn; // 保留原生方法
  effect.options = options;
  return effect;
}

const targetMap = new WeakMap();
export function track(target, type, key) { // 可以拿到当前的effect
    //  activeEffect; // 当前正在运行的effect
    if (activeEffect === undefined) { // 此属性不用收集依赖，因为没在effect中使用
        return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map));
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set))
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
}

// 找属性对应的effect 让其执行 （数组、对象）
export function trigger(target, type, key?, newValue?, oldValue?) {

  // 如果这个属性没有 收集过effect，那不需要做任何操作
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effects = new Set(); // 这里对effect去重了
  const add = (effectsToAdd) => {
      if (effectsToAdd) {
          effectsToAdd.forEach(effect => effects.add(effect));
      }
  }
  // 我要将所有的 要执行的effect 全部存到一个新的集合中，最终一起执行

  // 1. 看修改的是不是数组的长度 因为改长度影响比较大
  if (key === 'length' && isArray(target)) {
      // 如果对应的长度 有依赖收集需要更新
      depsMap.forEach((dep, key) => {
          if (key === 'length' || key > newValue) { // 如果更改的长度 小于收集的索引，那么这个索引也需要触发effect重新执行
              add(dep)
          }
      })
  } else {
      // 可能是对象
      if (key !== undefined) { // 这里肯定是修改， 不能是新增
          add(depsMap.get(key)); // 如果是新增
      }
      // 如果修改数组中的 某一个索引 怎么办？
      switch (type) {  // 如果添加了一个索引就触发长度的更新
          case TriggerOrTypes.ADD:
              if (isArray(target) && isIntegerKey(key)) {
                  add(depsMap.get('length'));
              }
      }
  }
  effects.forEach((effect: any) => effect())
}

/**
 *  一些案例
 */
// 解决这样的问题 我们需要一个栈
// effect(() => {
//   state.name = 'saber'
//   effect( () => {
//     state.age = 10
//   })
//   effect.address = 'xx'
// })
//  防止重复添加 需要判断栈中是否已经存在
// effect(() => {
//   state.num++
// })
