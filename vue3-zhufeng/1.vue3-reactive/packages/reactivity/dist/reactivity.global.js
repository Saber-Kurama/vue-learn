var VueReactivity = (function (exports) {
  'use strict';

  const isObject = (value) => typeof value == 'object' && value !== null;
  const extend = Object.assign;
  const isArray = Array.isArray;
  const isIntegerKey = (key) => parseInt(key) + '' === key;
  let hasOwnpRroperty = Object.prototype.hasOwnProperty;
  const hasOwn = (target, key) => hasOwnpRroperty.call(target, key);

  // get 逻辑
  // 针对 浅拷贝和readonly 的一些处理，另外是收集依赖
  const get = createGetter(false, false);
  const shallowGet = createGetter(false, true);
  const readonlyGet = createGetter(true);
  const showllowReadonlyGet = createGetter(true, true);
  // set 
  // readonly 不能赋值， 另外就是 触发 依赖的 effect
  const set = createSetter();
  const shallowSet = createSetter(true);
  // 
  const mutableHandlers = {
      get,
      set
  };
  const shallowReactiveHandlers = {
      get: shallowGet,
      set: shallowSet
  };
  let readonlyObj = {
      set: (target, key) => {
          console.warn(`set on key ${key} falied`);
      }
  };
  const readonlyHandlers = extend({
      get: readonlyGet,
  }, readonlyObj);
  const shallowReadonlyHandlers = extend({
      get: showllowReadonlyGet,
  }, readonlyObj);
  function createGetter(isReadonly = false, shallow = false) {
      // 这个最好返回箭头函数
      return function get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver);
          // 浅拷贝
          if (shallow) {
              return res;
          }
          if (isObject(res)) {
              return isReadonly ? readonly(res) : reactive(res);
          }
          return res;
      };
  }
  function createSetter(shallow = false) {
      return function set(target, key, value, receiver) {
          target[key]; // 获取老的值
          isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver); // target[key] = value
          // 我们要区分是新增的 还是修改的  vue2 里无法监控更改索引，无法监控数组的长度变化  -》 hack的方法 需要特殊处理
          // 当数据更新时 通知对应属性的effect重新执行
          return result;
      };
  }

  const reactive = (target) => {
      return createReactiveObject(target, false, mutableHandlers);
  };
  const shallowReactive = (target) => {
      return createReactiveObject(target, false, shallowReactiveHandlers);
  };
  const shallowReadonly = (target) => {
      return createReactiveObject(target, true, readonlyHandlers);
  };
  const readonly = (target) => {
      return createReactiveObject(target, true, shallowReadonlyHandlers);
  };
  const reactiveMap = new WeakMap(); // 会自动垃圾回收，不会造成内存泄漏， 存储的key只能是对
  const readonlyMap = new WeakMap();
  function createReactiveObject(target, isReadonly, baseHandlers) {
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
      console.log('baseHandlers', baseHandlers);
      const proxy = new Proxy(target, baseHandlers);
      proxyMap.set(target, proxy);
      return proxy;
  }

  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=reactivity.global.js.map
