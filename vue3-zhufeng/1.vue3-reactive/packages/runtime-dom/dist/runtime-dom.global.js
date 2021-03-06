var VueRuntimeDOM = (function (exports) {
  'use strict';

  const isObject = (value) => typeof value == 'object' && value !== null;
  const extend = Object.assign;
  const isArray = Array.isArray;
  const isFunction = (value) => typeof value == 'function';
  const isString = (value) => typeof value === 'string';
  const isIntegerKey = (key) => parseInt(key) + '' === key;
  let hasOwnpRroperty = Object.prototype.hasOwnProperty;
  const hasOwn = (target, key) => hasOwnpRroperty.call(target, key);
  const hasChanged = (oldValue, value) => oldValue !== value;

  const nodeOps = {
      createElement: tagName => document.createElement(tagName),
      remove: child => {
          const parent = child.parentNode;
          if (parent) {
              parent.removeChild(child);
          }
      },
      insert: (child, parent, anchor = null) => {
          parent.insertBefore(child, anchor); // 
      },
      querySelector: selector => document.querySelector(selector),
      setElementText: (el, text) => el.textContent = text,
      createText: text => document.createTextNode(text),
      setText: (node, text) => node.nodeValue = text,
      nextSibling: (node) => node.nextSibling
  };

  const patchAttr = (el, key, value) => {
      if (value == null) {
          el.removeAttribute(key);
      }
      else {
          el.setAttribute(key, value);
      }
  };

  const patchClass = (el, value) => {
      if (value == null) {
          value = '';
      }
      el.className = value;
  };

  const patchEvent = (el, key, value) => {
      // 对函数的缓存
      const invokers = el._vei || (el._vei || {});
      const exists = invokers[key]; // 如果不存在
      if (value && exists) { // 更新绑定事件
          exists.value = value;
      }
      else {
          const eventName = key.slice(2).toLowerCase();
          if (value) { // 之前没有绑定过现在绑定
              let invoker = invokers[key] = createInvoker(value);
              el.addEventListener(eventName, invoker);
          }
          else {
              if (exists) { // 以前绑定了 当时没有value
                  el.removeEventListener(eventName, exists);
                  // invokers[key] = undefined;
                  delete invokers[key];
              }
          }
      }
  };
  function createInvoker(value) {
      const invoker = (e) => { invoker.value(e); };
      invoker.value = value;
      return invoker;
  }

  const patchStyle = (el, prev, next) => {
      const style = el.style; //获取样式 
      if (next == null) {
          el.removeAttribute('style'); // {style:{}}  {}
      }
      else {
          // 老的里新的有没有 
          if (prev) { // {style:{color}} => {style:{background}}
              for (let key in prev) {
                  if (next[key] == null) { // 老的里有 新的里没有 需要删除
                      style[key] = '';
                  }
              }
          }
          // 新的里面需要赋值到style上
          for (let key in next) { // {style:{color}} => {style:{background}}
              style[key] = next[key];
          }
      }
  };

  // 这个里面针对的是属性操作
  const patchProp = (el, key, preValue, nextValue) => {
      switch (key) {
          case "class":
              patchClass(el, nextValue); // 比对属性
              break;
          case "style": // {style:{color:'red'}}  {style:{background:'red'}}
              patchStyle(el, preValue, nextValue);
              break;
          default:
              // 如果不是事件 才是属性
              if (/^on[^a-z]/.test(key)) {
                  console.log('??>>>>>>>');
                  patchEvent(el, key, nextValue); // 事件就是添加和删除 修改
              }
              else {
                  patchAttr(el, key, nextValue);
              }
              break;
      }
  };

  function effect(fn, options = {}) {
      // 我需要让这个effect变成响应的effect，可以做到数据变化重新执行 
      const effect = createReactiveEffect(fn, options);
      if (!options.lazy) { // 默认的effect会先执行
          effect(); // 响应式的effect默认会先执行一次
      }
      return effect;
  }
  let uid = 0;
  let activeEffect; // 存储当前的effect
  const effectStack = [];
  function createReactiveEffect(fn, options) {
      const effect = function reactiveEffect() {
          if (!effectStack.includes(effect)) { // 保证effect没有加入到effectStack中
              try {
                  effectStack.push(effect);
                  activeEffect = effect;
                  return fn(); // 函数执行时会取值  会执行get方法
              }
              finally {
                  effectStack.pop();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      effect.id = uid++; // 制作一个effect标识 用于区分effect
      effect._isEffect = true; // 用于标识这个是响应式effect
      effect.raw = fn; // 保留effect对应的原函数
      effect.options = options; // 在effect上保存用户的属性
      return effect;
  }
  // 让，某个对象中的属性 收集当前他对应的effect函数
  const targetMap = new WeakMap();
  function track(target, type, key) {
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
          depsMap.set(key, (dep = new Set));
      }
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
      }
  }
  // 找属性对应的effect 让其执行 （数组、对象）
  function trigger(target, type, key, newValue, oldValue) {
      // 如果这个属性没有 收集过effect，那不需要做任何操作
      const depsMap = targetMap.get(target);
      if (!depsMap)
          return;
      const effects = new Set(); // 这里对effect去重了
      const add = (effectsToAdd) => {
          if (effectsToAdd) {
              effectsToAdd.forEach(effect => effects.add(effect));
          }
      };
      // 我要将所有的 要执行的effect 全部存到一个新的集合中，最终一起执行
      // 1. 看修改的是不是数组的长度 因为改长度影响比较大
      if (key === 'length' && isArray(target)) {
          // 如果对应的长度 有依赖收集需要更新
          depsMap.forEach((dep, key) => {
              if (key === 'length' || key > newValue) { // 如果更改的长度 小于收集的索引，那么这个索引也需要触发effect重新执行
                  add(dep);
              }
          });
      }
      else {
          // 可能是对象
          if (key !== undefined) { // 这里肯定是修改， 不能是新增
              add(depsMap.get(key)); // 如果是新增
          }
          // 如果修改数组中的 某一个索引 怎么办？
          switch (type) { // 如果添加了一个索引就触发长度的更新
              case 0 /* ADD */:
                  if (isArray(target) && isIntegerKey(key)) {
                      add(depsMap.get('length'));
                  }
          }
      }
      effects.forEach((effect) => {
          if (effect.options.scheduler) {
              effect.options.scheduler(effect);
          }
          else {
              effect();
          }
      });
  }
  // weakMap {name:'zf',age:12}  (map) =>{name => set(effect),age => set(effect)}
  // {name:'zf',age:12} => name => [effect effect]
  // 函数调用是一个栈型结构
  // effect(()=>{ // effect1   [effect1]
  //     state.name -> effect1
  //     effect(()=>{ // effect2
  //         state.age -> effect2
  //     })
  //     state.address -> effect1
  // })

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
          if (!isReadonly) {
              // 执行 收集依赖
              track(target, 0 /* GET */, key);
          }
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
          const oldValue = target[key]; // 获取老的值
          let hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver); // target[key] = value
          if (!hadKey) {
              // 新增 
              trigger(target, 0 /* ADD */, key, value);
          }
          else if (hasChanged(oldValue, value)) {
              // 修改 
              trigger(target, 1 /* SET */, key, value);
          }
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

  function ref(value) {
      // 将普通类型变相一个对象， 使用 对象的 get set 方法
      return createRef(value);
  }
  function shallowRef(value) {
      return createRef(value, true);
  }
  const convert = (val) => (isObject(val) ? reactive(val) : val);
  class RefImpl {
      rawValue;
      shallow;
      _value;
      __v_isRef = true; // 产生的实例会被添加 __v_isRef 表示是一个ref属性
      constructor(rawValue, shallow) {
          this.rawValue = rawValue;
          this.shallow = shallow;
          this._value = shallow ? rawValue : convert(rawValue);
      }
      get value() {
          track(this, 0 /* GET */, "value");
          return this._value;
      }
      set value(newValue) {
          if (hasChanged(newValue, this.rawValue)) {
              // 判断老值和新值是否有变化
              this.rawValue = newValue; // 新值会作为老值
              this._value = this.shallow ? newValue : convert(newValue);
              trigger(this, 1 /* SET */, "value", newValue);
          }
      }
  }
  function createRef(rawValue, shallow = false) {
      return new RefImpl(rawValue, shallow);
  }
  class ObjectRefImpl {
      target;
      key;
      __v_isRef = true;
      constructor(target, key) {
          this.target = target;
          this.key = key;
      }
      get value() {
          return this.target[this.key]; // 如果原对象是响应式的就会依赖收集
      }
      set value(newValue) {
          this.target[this.key] = newValue; // 如果原来对象是响应式的 那么就会触发更新
      }
  }
  // 将响应式对象的某一个key对应的值 转化成ref 
  function toRef(target, key) {
      return new ObjectRefImpl(target, key);
  }
  function toRefs(object) {
      const ret = isArray(object) ? new Array(object.length) : {};
      for (let key in object) {
          ret[key] = toRef(object, key);
      }
      return ret;
  }

  class ComputedRefImpl {
      setter;
      _dirty = true;
      _value;
      effect;
      constructor(getter, setter) {
          this.setter = setter;
          this.effect = effect(getter, {
              lazy: true,
              scheduler: () => {
                  // 走到这一步的话 证明 值反生修改
                  if (!this._dirty) {
                      console.log('>>>');
                      this._dirty = true;
                      trigger(this, 1 /* SET */, 'value');
                  }
              }
          });
      }
      get value() {
          // 执行 effect
          trigger(this, 1 /* SET */, 'value');
          if (this._dirty) {
              this._value = this.effect();
              this._dirty = false;
          }
          track(this, 0 /* GET */, 'value');
          return this._value;
      }
      set value(newValue) {
          this.setter(newValue);
      }
  }
  /**
   *  接受 getter setter 或者一个 function
   */
  function computed(getterOrOptions) {
      let getter;
      let setter;
      if (isFunction(getterOrOptions)) {
          getter = getterOrOptions;
          setter = () => {
              console.warn("computed value must be readonly");
          };
      }
      else {
          getter = getterOrOptions.get;
          setter = getterOrOptions.set;
      }
      return new ComputedRefImpl(getter, setter);
  }

  function isVnode(vnode) {
      return vnode.__v_isVnode;
  }
  // h(‘div',{style:{color:red}},'children'); //  h方法和createApp类似
  const createVNode = (type, props, children = null) => {
      // 可以 根据 type 来区分是组件还是 普通组件
      // 根据type来区分 是元素还是组件
      // 虚拟DOM 肯定有一个蕾西
      const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
      const vnode = {
          __v_isVnode: true,
          type,
          props,
          children,
          component: null,
          el: null,
          key: props && props.key,
          shapeFlag // 判断自己的类型 和 儿子的类型 ； 主要是为了看儿子的类型是啥，做分别的处理， 父的类型是和子 不相同的
      };
      normalizeChildren(vnode, children);
      return vnode;
  };
  function normalizeChildren(vnode, children) {
      console.log('normalizeChildren', children);
      let type = 0;
      if (children == null) ;
      else if (isArray(children)) {
          type = 16 /* ARRAY_CHILDREN */;
      }
      else {
          type = 8 /* TEXT_CHILDREN */;
      }
      vnode.shapeFlag |= type;
  }
  const Text = Symbol('Text');
  function normalizeVNode(child) {
      if (isObject(child))
          return child;
      return createVNode(Text, null, String(child));
  }

  // import { createVNode } from "./vnode"
  function createAppAPI(render) {
      return function createApp(rootComponent, rootProps) {
          console.log('>>>>>>');
          const app = {
              _props: rootProps,
              _component: rootComponent,
              _container: null,
              mount(container) {
                  // let vnode = {}
                  // render(vnode,container);
                  // 1.根据组件创建虚拟节点
                  // 2.将虚拟节点和容器获取到后调用render方法进行渲染
                  // 创造虚拟节点
                  const vnode = createVNode(rootComponent, rootProps);
                  // // 调用render
                  render(vnode, container);
                  app._container = container;
              }
          };
          return app;
      };
  }

  const PublicInstanceProxyHandlers = {
      get({ _: instance }, key) {
          // 取值时 要访问 setUpState， props ,data
          const { setupState, props, data } = instance;
          if (key[0] == '$') {
              return; // 不能访问$ 开头的变量
          }
          if (hasOwn(setupState, key)) {
              return setupState[key];
          }
          else if (hasOwn(props, key)) {
              return props[key];
          }
          else if (hasOwn(data, key)) {
              return data[key];
          }
      },
      set({ _: instance }, key, value) {
          const { setupState, props, data } = instance;
          if (hasOwn(setupState, key)) {
              setupState[key] = value;
          }
          else if (hasOwn(props, key)) {
              props[key] = value;
          }
          else if (hasOwn(data, key)) {
              data[key] = value;
          }
          return true;
      }
  };

  function createComponentInstance(vnode) {
      // webcomponent 组件需要有“属性” “插槽”
      const instance = {
          vnode,
          type: vnode.type,
          props: {},
          attrs: {},
          slots: {},
          ctx: {},
          data: {},
          setupState: {},
          render: null,
          subTree: null,
          isMounted: false // 表示这个组件是否挂载过
      };
      instance.ctx = { _: instance }; // instance.ctx._
      return instance;
  }
  function setupComponent(instance) {
      const { props, children } = instance.vnode; // {type,props,children}
      // 根据props 解析出 props 和 attrs，将其放到instance上
      instance.props = props; // initProps()
      instance.children = children; // 插槽的解析 initSlot()
      // 需要先看下 当前组件是不是有状态的组件， 函数组件
      let isStateful = instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
      if (isStateful) { // 表示现在是一个带状态的组件
          // 调用 当前实例的setup方法，用setup的返回值 填充 setupState和对应的render方法
          setupStatefulComponent(instance);
      }
  }
  function setupStatefulComponent(instance) {
      // 1.代理 传递给render函数的参数
      instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
      // 2.获取组件的类型 拿到组件的setup方法
      let Component = instance.type;
      let { setup } = Component;
      // ------ 没有setup------
      if (setup) {
          let setupContext = createSetupContext(instance);
          const setupResult = setup(instance.props, setupContext); // instance 中props attrs slots emit expose 会被提取出来，因为在开发过程中会使用这些属性
          handleSetupResult(instance, setupResult);
      }
      else {
          finishComponentSetup(instance); // 完成组件的启动
      }
  }
  function handleSetupResult(instance, setupResult) {
      if (isFunction(setupResult)) {
          instance.render = setupResult;
      }
      else if (isObject(setupResult)) {
          instance.setupState = setupResult;
      }
      finishComponentSetup(instance);
  }
  function finishComponentSetup(instance) {
      let Component = instance.type;
      if (!instance.render) {
          // 对template模板进行编译 产生render函数
          // instance.render = render;// 需要将生成render函数放在实例上
          if (!Component.render && Component.template) ;
          instance.render = Component.render;
      }
      // 对vue2.0API做了兼容处理
      // applyOptions 
  }
  function createSetupContext(instance) {
      return {
          attrs: instance.attrs,
          slots: instance.slots,
          emit: () => { },
          expose: () => { }
      };
  }

  let queue = [];
  function queueJob(job) {
      console.log('job--', job);
      if (!queue.includes(job)) {
          queue.push(job);
          queueFlush();
      }
  }
  let isFlushPending = false;
  function queueFlush() {
      if (!isFlushPending) {
          isFlushPending = true;
          Promise.resolve().then(flushJobs);
      }
  }
  function flushJobs() {
      isFlushPending = false;
      // 清空时  我们需要根据调用的顺序依次刷新  , 保证先刷新父在刷新子
      queue.sort((a, b) => a.id - b.id);
      for (let i = 0; i < queue.length; i++) {
          const job = queue[i];
          job();
      }
      queue.length = 0;
  }

  function createRenderer(rendererOptions) {
      const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, nextSibling: hostNextSibling, } = rendererOptions;
      // -------------------组件----------------------
      const setupRenderEfect = (instance, container) => {
          console.log("instance", instance);
          effect(function componentEffect() {
              if (!instance.isMounted) {
                  // 初次渲染
                  let proxyToUse = instance.proxy;
                  let subTree = (instance.subTree = instance.render.call(proxyToUse, proxyToUse));
                  // 用render函数的返回值 继续渲染
                  patch(null, subTree, container);
                  instance.isMounted = true;
              }
              else {
                  // diff算法  （核心 diff + 序列优化 watchApi 生命周期）
                  // ts 一周
                  // 组件库
                  // 更新逻辑
                  console.log("开始更新---");
                  const prevTree = instance.subTree;
                  const proxyToUse = instance.proxy;
                  const nextTree = instance.render.call(proxyToUse, proxyToUse);
                  patch(prevTree, nextTree, container);
              }
          }, {
              scheduler: queueJob,
          });
      };
      const mountComponent = (initialVNode, container) => {
          // 组件的渲染流程  最核心的就是调用 setup拿到返回值，获取render函数返回的结果来进行渲染
          // 1.先有实例
          const instance = (initialVNode.component =
              createComponentInstance(initialVNode));
          // 2.需要的数据解析到实例上
          setupComponent(instance); // state props attrs render ....
          // 3.创建一个effect 让render函数执行
          setupRenderEfect(instance, container);
      };
      const processComponent = (n1, n2, container) => {
          if (n1 == null) {
              // 组件没有上一次的虚拟节点
              mountComponent(n2, container);
          }
      };
      // ------------------组件 ------------------
      //----------------- 处理元素-----------------
      function getSequence(arr) {
          // 最终的结果是索引
          const len = arr.length;
          const result = [0]; // 索引  递增的序列 用二分查找性能高
          const p = arr.slice(0); // 里面内容无所谓 和 原本的数组相同 用来存放索引
          let start;
          let end;
          let middle;
          for (let i = 0; i < len; i++) {
              // O(n)
              const arrI = arr[i];
              if (arrI !== 0) {
                  let resultLastIndex = result[result.length - 1];
                  // 取到索引对应的值
                  if (arr[resultLastIndex] < arrI) {
                      p[i] = resultLastIndex; // 标记当前前一个对应的索引
                      result.push(i);
                      // 当前的值 比上一个人大 ，直接push ，并且让这个人得记录他的前一个
                      continue;
                  }
                  // 二分查找 找到比当前值大的那一个
                  start = 0;
                  end = result.length - 1;
                  while (start < end) {
                      // 重合就说明找到了 对应的值  // O(logn)
                      middle = ((start + end) / 2) | 0; // 找到中间位置的前一个
                      if (arr[result[middle]] < arrI) {
                          start = middle + 1;
                      }
                      else {
                          end = middle;
                      } // 找到结果集中，比当前这一项大的数
                  }
                  // start / end 就是找到的位置
                  if (arrI < arr[result[start]]) {
                      // 如果相同 或者 比当前的还大就不换了
                      if (start > 0) {
                          // 才需要替换
                          p[i] = result[start - 1]; // 要将他替换的前一个记住
                      }
                      result[start] = i;
                  }
              }
          }
          let len1 = result.length; // 总长度
          let last = result[len1 - 1]; // 找到了最后一项
          while (len1-- > 0) {
              // 根据前驱节点一个个向前查找
              result[len1] = last;
              last = p[last];
          }
          return result;
      } // O(nlogn) 性能比较好 O(n^2
      // 处理元素
      const mountChildren = (children, container) => {
          for (let i = 0; i < children.length; i++) {
              let child = normalizeVNode(children[i]);
              patch(null, child, container);
          }
      };
      const mountElement = (vnode, container) => {
          // 递归渲染
          const { props, shapeFlag, type, children } = vnode;
          let el = (vnode.el = hostCreateElement(type));
          if (props) {
              for (const key in props) {
                  hostPatchProp(el, key, null, props[key]);
              }
          }
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              hostSetElementText(el, children); // 文本比较简单 直接扔进去即可
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              mountChildren(children, el);
          }
          hostInsert(el, container);
      };
      const patchProps = (oldProps, newProps, el) => {
          if (oldProps !== newProps) {
              for (let key in newProps) {
                  const prev = oldProps[key];
                  const next = newProps[key];
                  if (prev !== next) {
                      hostPatchProp(el, key, prev, next);
                  }
              }
              for (const key in oldProps) {
                  if (!(key in newProps)) {
                      hostPatchProp(el, key, oldProps[key], null);
                  }
              }
          }
      };
      const patchKeyedChildren = (c1, c2, el) => {
          // 尽量减少 比较的范围
          // sync from start 从头开始一个个比 遇到不同的就停止了
          let i = 0;
          const l2 = c2.length;
          let e1 = c1.length - 1; // prev ending index
          let e2 = l2 - 1; // next ending index;
          console.log(e2);
          while (i <= e1 && i <= e2) {
              const n1 = c1[i];
              const n2 = c2[i];
              if (isSameVNodeType(n1, n2)) {
                  patch(n1, n2, el);
              }
              else {
                  break;
              }
              i++;
          }
          while (i <= e1 && i <= e2) {
              const n1 = c1[e1];
              const n2 = c2[e2];
              if (isSameVNodeType(n1, n2)) {
                  patch(n1, n2, el);
              }
              else {
                  break;
              }
              e1--;
              e2--;
          }
          // 旧数组是 [i, e1]， 新数组是[i, e2]
          if (i > e1) {
              // 老数组少
              if (i <= e2) {
                  // 代表新的多
                  const nextPos = e2 + 1;
                  // 有没有这个节点
                  const anchor = nextPos < l2 ? c2[nextPos].el : null;
                  while (i <= e2) {
                      patch(null, c2[i], el, anchor); // 只是向后追加
                      i++;
                  }
              }
          }
          else if (i > e2) {
              // 新的少，老的多
              while (i <= e1) {
                  // 卸载
                  unmount(c1[i]);
                  i++;
              }
          }
          else {
              //
              //  console.log('更新孩子节点')
              //  hostInsert(child.el,el,anchor)
              let s1 = i;
              let s2 = i;
              const keyToNewIndexMap = new Map(); // 索引 ： 值 weakMap :key 对象
              console.log(s2, e2);
              for (let i = s2; i <= e2; i++) {
                  const childVNode = c2[i]; // child
                  keyToNewIndexMap.set(childVNode.key, i);
              }
              const toBePatched = e2 - s2 + 1;
              const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
              // 去老的里面查找 看用没有复用的
              for (let i = s1; i <= e1; i++) {
                  const oldVnode = c1[i];
                  let newIndex = keyToNewIndexMap.get(oldVnode.key);
                  if (newIndex === undefined) {
                      // 老的里的不在新的中
                      unmount(oldVnode);
                  }
                  else {
                      // 新的和旧的关系 索引的关系
                      newIndexToOldIndexMap[newIndex - s2] = i + 1;
                      patch(oldVnode, c2[newIndex], el);
                  }
              }
              // [5,3,4,0] => [1,2]
              let increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
              let j = increasingNewIndexSequence.length - 1; // 取出最后一个人的索引
              for (let i = toBePatched - 1; i >= 0; i--) {
                  let currentIndex = i + s2; // 找到h的索引
                  let child = c2[currentIndex]; // 找到h对应的节点
                  let anchor = currentIndex + 1 < c2.length ? c2[currentIndex + 1].el : null; // 第一次插入h 后 h是一个虚拟节点，同时插入后 虚拟节点会
                  if (newIndexToOldIndexMap[i] == 0) {
                      // 如果自己是0说明没有被patch过
                      patch(null, child, el, anchor);
                  }
                  else {
                      // hostInsert(child.el,el,anchor); 全部移动
                      // [1,2,3,4,5,6]
                      // [1,6,2,3,4,5]  // 最长递增子序列
                      // 这种操作 需要将节点全部的移动一遍， 我希望可以尽可能的少移动   [5,3,4,0]
                      // 3 2 1 0
                      // [1,2]    2
                      if (i != increasingNewIndexSequence[j]) {
                          hostInsert(child.el, el, anchor); // 操作当前的d 以d下一个作为参照物插入
                      }
                      else {
                          j--; // 跳过不需要移动的元素， 为了减少移动操作 需要这个最长递增子序列算法
                      }
                  }
              }
          }
      };
      const unmountChildren = (children) => {
          for (let i = 0; i < children.length; i++) {
              unmount(children[i]);
          }
      };
      const patchChildren = (n1, n2, el) => {
          const c1 = n1.children;
          const c2 = n2.children;
          // 情况
          // 1. 老有儿子，新没有儿子
          // 2. 老没有儿子，新有儿子
          // 3. 老有儿子， 新有儿子
          // 4. 老有儿子（文本）， 新有儿子（文本）
          const prevShapeFlag = n1.shapeFlag;
          const shapeFlag = n2.shapeFlag;
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              // 新的儿子 是文本
              // 老的是数组
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  unmountChildren(c1); // 销毁 老 的孩子
              }
              if (c2 !== c1) {
                  // 两个都是文本
                  hostSetElementText(el, c2);
              }
          }
          else {
              // 新的数组 或者 不存在
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      // 新老都是数组 ---> diff
                      patchKeyedChildren(c1, c2, el);
                  }
                  else {
                      //  新的是空的
                      unmountChildren(c1);
                  }
              }
              else {
                  // 老的是文本
                  if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                      // 新的如果是 null 的话 也会这样修改
                      hostSetElementText(el, "");
                  }
                  if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                      // 老的是文本或者空， 新的数组
                      mountChildren(c2, el);
                  }
              }
          }
      };
      // 元素更新
      const patchElement = (n1, n2, container) => {
          // 元素相同
          let el = (n2.el = n1.el);
          // 更新属性
          const oldProps = n1.props || {};
          const newProps = n2.props || {};
          patchProps(oldProps, newProps, el);
          // 更新孩子节点 开始 diff 算法
          patchChildren(n1, n2, el);
      };
      const processElement = (n1, n2, container) => {
          if (n1 == null) {
              mountElement(n2, container);
          }
          else {
              // 元素更新
              console.log("元素更新");
              patchElement(n1, n2);
          }
      };
      //----------------- 处理元素-----------------
      // -----------------文本处理-----------------
      const processText = (n1, n2, container) => {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateText(n2.children)), container);
          }
      };
      // -----------------文本处理-----------------
      const isSameVNodeType = (n1, n2) => {
          return n1.type === n2.type && n1.key === n2.key;
      };
      const unmount = (n1) => {
          // 如果是组件 调用的组件的生命周期等
          hostRemove(n1.el);
      };
      const patch = (n1, n2, container, anchor = null) => {
          const { shapeFlag, type } = n2;
          if (n1 && !isSameVNodeType(n1, n2)) {
              // 把以前的删掉 换成n2
              anchor = hostNextSibling(n1.el);
              unmount(n1);
              n1 = null; // 重新渲染n2 对应的内容
          }
          console.log("patch----");
          switch (type) {
              case Text:
                  // 操作text
                  processText(n1, n2, container);
                  break;
              default:
                  if (shapeFlag & 1 /* ELEMENT */) {
                      processElement(n1, n2, container);
                  }
                  else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
                      processComponent(n1, n2, container);
                  }
          }
      };
      // 告诉core 怎么渲染
      const render = (vnode, container) => {
          // core的核心, 根据不同的虚拟节点 创建对应的真实元素
          // 默认调用render 可能是初始化流程
          patch(null, vnode, container);
      };
      return {
          createApp: createAppAPI(render),
      };
  }

  function h(type, propsOrChildren, children) {
      const l = arguments.length;
      if (l == 2) {
          // 类型 + 属性 、  类型 + 孩子
          // 如果propsOrChildren 是数组 直接作为第三个参数
          if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
              if (isVnode(propsOrChildren)) {
                  return createVNode(type, null, [propsOrChildren]);
              }
              return createVNode(type, propsOrChildren);
          }
          else {
              // 如果第二个参数 不是对象 那一定是孩子
              return createVNode(type, null, propsOrChildren);
          }
      }
      else {
          if (l > 3) {
              children = Array.prototype.slice.call(arguments, 2);
          }
          else if (l === 3 && isVnode(children)) {
              children = [children];
          }
          return createVNode(type, propsOrChildren, children);
      }
  }

  // runtime-dom 核心就是  提供domAPI方法了
  // 渲染时用到的所有方法
  const rendererOptions = extend({ patchProp }, nodeOps);
  // vue中runtime-core 提供了核心的方法 用来处理渲染的，他会使用runtime-dom中的api进行渲染
  function createApp(rootComponent, rootProps = null) {
      const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps);
      let { mount } = app;
      app.mount = function (container) {
          // // 清空容器的操作 
          container = nodeOps.querySelector(container);
          container.innerHTML = '';
          mount(container); // 函数劫持
      };
      return app;
  }
  var index = {};

  exports.computed = computed;
  exports.createApp = createApp;
  exports.createRenderer = createRenderer;
  exports.createVNode = createVNode;
  exports['default'] = index;
  exports.effect = effect;
  exports.h = h;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.ref = ref;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;
  exports.shallowRef = shallowRef;
  exports.toRef = toRef;
  exports.toRefs = toRefs;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=runtime-dom.global.js.map
