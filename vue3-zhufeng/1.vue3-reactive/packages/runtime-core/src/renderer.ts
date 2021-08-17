import { effect } from "@vue/reactivity";
import { ShapeFlags } from "@vue/shared";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { queueJob } from "./scheduler";
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
    nextSibling: hostNextSibling,
  } = rendererOptions;
  // -------------------组件----------------------
  const setupRenderEfect = (instance, container) => {
    console.log("instance", instance);
    effect(
      function componentEffect() {
        if (!instance.isMounted) {
          // 初次渲染
          let proxyToUse = instance.proxy;
          let subTree = (instance.subTree = instance.render.call(
            proxyToUse,
            proxyToUse
          ));

          // 用render函数的返回值 继续渲染
          patch(null, subTree, container);
          instance.isMounted = true;
        } else {
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
      },
      {
        scheduler: queueJob,
      }
    );
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
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children); // 文本比较简单 直接扔进去即可
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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
    while (i <= el && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }

    while (i < e1 && i < e2) {
      const n1 = c1[e1];
      const n2 = c1[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      el--;
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
    }else if(i > e2) { // 新的少，老的多
      while (i <= e1) { // 卸载
        unmount(c1[i])
        i++
      }
    }else {
      
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
    const shapeFlag = n2.shageFlag;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新的儿子 是文本

      // 老的是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1); // 销毁 老 的孩子
      }

      if (c2 !== c1) {
        // 两个都是文本
        hostSetElementText(el, c2);
      }
    } else {
      // 新的数组 或者 不存在
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新老都是数组 ---> diff
          patchKeyedChildren(c1, c2, el);
        } else {
          //  新的是空的
          unmountChildren(c1);
        }
      } else {
        // 老的是文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 新的如果是 null 的话 也会这样修改
          hostSetElementText(el, "");
        }
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
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
    } else {
      // 元素更新
      console.log("元素更新");
      patchElement(n1, n2, container);
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
