var VueRuntimeDOM = (function (exports) {
  'use strict';

  const extend = Object.assign;

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

  function createRenderer(rendererOptions) {
      return {
          createApp: (rootComponent, rootProps) => { }
      };
  }

  // runtime-dom 核心就是  提供domAPI方法了
  // 渲染时用到的所有方法
  extend({ patchProp }, nodeOps);
  // vue中runtime-core 提供了核心的方法 用来处理渲染的，他会使用runtime-dom中的api进行渲染
  function createApp(rootComponent, rootProps = null) {
      const app = createRenderer().createApp(rootComponent, rootProps);
      // let {mount} = app
      app.mount = function (container) {
          // // 清空容器的操作 
          // container = nodeOps.querySelector(container);
          // container.innerHTML = '';
          // mount(container); // 函数劫持
          // // 将组件 渲染成dom元素 进行挂载
      };
      return app;
  }
  var index = {};

  exports.createApp = createApp;
  exports['default'] = index;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=runtime-dom.global.js.map
