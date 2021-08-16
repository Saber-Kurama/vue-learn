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
      setText: (node, text) => node.nodeValue = text
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
      const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, } = rendererOptions;
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
                  console.log('开始更新---');
              }
          }, {
              scheduler: queueJob
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
          console.log("ShapeFlags.TEXT_CHILDREN", 8 /* TEXT_CHILDREN */);
          console.log("shapeFlag", shapeFlag);
          console.log(shapeFlag & 8 /* TEXT_CHILDREN */);
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              hostSetElementText(el, children); // 文本比较简单 直接扔进去即可
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              mountChildren(children, el);
          }
          hostInsert(el, container);
      };
      const processElement = (n1, n2, container) => {
          if (n1 == null) {
              mountElement(n2, container);
          }
      };
      //----------------- 处理元素-----------------
      // -----------------文本处理-----------------
      const processText = (n1, n2, container) => {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateText(n2.children)), container);
          }
      };
      const patch = (n1, n2, container) => {
          const { shapeFlag, type } = n2;
          console.log("n2", n2);
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
