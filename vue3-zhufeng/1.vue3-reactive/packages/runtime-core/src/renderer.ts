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
          } else {
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
    console.log(e2);
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      } else {
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
    } else if (i > e2) {
      // 新的少，老的多
      while (i <= e1) {
        // 卸载
        unmount(c1[i]);
        i++;
      }
    } else {
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
        } else {
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
        let anchor =
          currentIndex + 1 < c2.length ? c2[currentIndex + 1].el : null; // 第一次插入h 后 h是一个虚拟节点，同时插入后 虚拟节点会
        if (newIndexToOldIndexMap[i] == 0) {
          // 如果自己是0说明没有被patch过
          patch(null, child, el, anchor);
        } else {
          // hostInsert(child.el,el,anchor); 全部移动
          // [1,2,3,4,5,6]
          // [1,6,2,3,4,5]  // 最长递增子序列
          // 这种操作 需要将节点全部的移动一遍， 我希望可以尽可能的少移动   [5,3,4,0]
          // 3 2 1 0
          // [1,2]    2
          if (i != increasingNewIndexSequence[j]) {
            hostInsert(child.el, el, anchor); // 操作当前的d 以d下一个作为参照物插入
          } else {
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
