import { effect } from "@vue/reactivity";
import { ShapeFlags } from "@vue/shared";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { normalizeVNode, Text } from "./vnode";

export function createRenderer(rendererOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
  } = rendererOptions;
  // -------------------组件----------------------
  const setupRenderEfect = (instance, container) => {
    console.log("instance", instance);
    effect(function componentEffect() {
      if (!instance.isMounted) {
        // 初次渲染
        let proxyToUse = instance.proxy;
        let subTree = (instance.subTree = instance.render.call(
          proxyToUse,
          proxyToUse
        ));

        // 用render函数的返回值 继续渲染
        patch(null, subTree, container);
      } else {
        // diff算法  （核心 diff + 序列优化 watchApi 生命周期）
        // ts 一周
        // 组件库
        // 更新逻辑
      }
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
    } else {
      // 组件更新流程
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
}
  const mountElement = (vnode, container) => {
    // 递归渲染
    const { props, shapeFlag, type, children } = vnode;
    let el = (vnode.el = hostCreateElement(type));

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    console.log("ShapeFlags.TEXT_CHILDREN", ShapeFlags.TEXT_CHILDREN);
    console.log("shapeFlag", shapeFlag);
    console.log(shapeFlag & ShapeFlags.TEXT_CHILDREN);
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(el, children);// 文本比较简单 直接扔进去即可
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(children, el);
    }
    hostInsert(el, container);
  };
  const processElement = (n1, n2, container) => {
    if (n1 == null) {
      mountElement(n2, container);
    } else {
      // 元素更新
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
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
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
