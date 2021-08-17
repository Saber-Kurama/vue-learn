import { isArray, isObject, isString, ShapeFlags } from "@vue/shared"

export function isVnode(vnode){
  return vnode.__v_isVnode
}
// h(‘div',{style:{color:red}},'children'); //  h方法和createApp类似
export const createVNode = (type, props, children = null) => {
  // 可以 根据 type 来区分是组件还是 普通组件

  // 根据type来区分 是元素还是组件

  // 虚拟DOM 肯定有一个蕾西
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0
  const vnode = { // 一个对象
    __v_isVnode: true,
    type,
    props,
    children,
    component: null, //存放组件实例
    el: null, // 真实dom
    key: props && props.key, // diff 算法
    shapeFlag // 判断自己的类型 和 儿子的类型 ； 主要是为了看儿子的类型是啥，做分别的处理， 父的类型是和子 不相同的
  }
  normalizeChildren(vnode, children);
  return  vnode;
}

function normalizeChildren(vnode,children){
  console.log('normalizeChildren', children)
  let type = 0;
  if(children == null){ // 不对儿子进行处理

  } else if(isArray(children)){
      type = ShapeFlags.ARRAY_CHILDREN;
  } else{
      type = ShapeFlags.TEXT_CHILDREN;
  }
  vnode.shapeFlag |=  type
}

export const Text = Symbol('Text')
export function normalizeVNode(child){
  if(isObject(child)) return child;

  return createVNode(Text,null,String(child));
}