var VueRuntimeDOM = (function (exports) {
  'use strict';

  const isObject = (value) => typeof value == 'object' && value !== null;
  const extend = Object.assign;
  const isArray = Array.isArray;
  const isString = (value) => typeof value === 'string';

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
                  patchEvent(el, key, nextValue); // 事件就是添加和删除 修改
              }
              else {
                  patchAttr(el, key, nextValue);
              }
              break;
      }
  };

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

  function createRenderer(rendererOptions) {
      const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, } = rendererOptions;
      // 处理元素
      const mountElement = (vnode, container) => {
          // 递归渲染
          const { props, shapeFlag, type, children } = vnode;
          let el = (vnode.el = hostCreateElement(type));
          if (props) {
              for (const key in props) {
                  hostPatchProp(el, key, null, props[key]);
              }
          }
          console.log('ShapeFlags.TEXT_CHILDREN', 8 /* TEXT_CHILDREN */);
          console.log('shapeFlag', shapeFlag);
          console.log(shapeFlag & 8 /* TEXT_CHILDREN */);
          // if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
          //     hostSetElementText(el, children);// 文本比较简单 直接扔进去即可
          // } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          //     mountChildren(children, el);
          // }
          hostInsert(el, container);
      };
      const processElement = (n1, n2, container) => {
          if (n1 == null) {
              mountElement(n2, container);
          }
      };
      const patch = (n1, n2, container) => {
          const { shapeFlag, type } = n2;
          console.log('n2', n2);
          switch (type) {
              case Text:
                  // 操作text
                  break;
              default:
                  if (shapeFlag & 1 /* ELEMENT */) {
                      processElement(n1, n2, container);
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

  exports.createApp = createApp;
  exports.createRenderer = createRenderer;
  exports.createVNode = createVNode;
  exports['default'] = index;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=runtime-dom.global.js.map
