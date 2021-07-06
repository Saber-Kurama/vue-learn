// 监听属性
function defineReactive(obj, key, val) {
  // 递归
  observe(val);
  const dep = new Dep();

  Object.defineProperty(obj, key, {
    get() {
      console.log("get", val);
      // 判断一下Dep.target是否存在，若存在则收集依赖
      Dep.target && dep.addDep(Dep.target)
      return val;
    },
    set(v) {
      if (v !== val) {
        console.log("set", key);
        val = v;
        // update()
        // console.log('watchers', watchers)
        // watchers.forEach(watcher => watcher.update())
        dep.notify()
      }
    },
  });
}

function observe(obj) {
  // 判断 obj 是不是对象
  if (typeof obj !== "object" || obj === null) {
    return;
  }
  new Observer(obj);
}

class Observer {
  constructor(obj) {
    this.value = obj;
    if (Array.isArray(obj)) {
    } else {
      this.walk(obj);
    }
  }
  walk(obj) {
    Object.keys(obj).forEach((key) => {
      defineReactive(obj, key, obj[key]);
    });
  }
}

// 将$data的key代理到vm上去，用户就可以直接使用
function proxy(vm) {
  Object.keys(vm.$data).forEach((key) => {
    Object.defineProperty(vm, key, {
      get() {
        return vm.$data[key];
      },
      set(v) {
        vm.$data[key] = v;
      },
    });
  });
}

class KVue {
  constructor(options) {
    this.$options = options;
    this.$data = options.data;

    observe(this.$data);

    // 代理
    proxy(this);

    // 编译
    // new Compile(options.el, this);
    if(this.$options.el){
      // 如果el 存在 执行挂载
      this.$mount(this.$options.el)
    }
  }
  // 组件挂载
  $mount(el) {
    // 1.获取宿主
    this.$el = document.querySelector(el);
    // 创建一个 updataComponent 方法
    const updateComponent = () => {
      
      // const dom = this.$options.render.call(this)
      // const parent = this.$el.parentElement;
      // parent.insertBefore(dom, this.$el.nextSibling)
      // parent.removeChild(this.$el);
      // this.$el = dom

      const { render } = this.$options
      // 执行 一个 render
      const vnode = render.call(this, this.$createElement)
      // 执行一个 _update
      this._update(vnode)
    }

    // 创建 一个 Watcher 对象
    new Watcher(this, updateComponent)
  }

  // 创建虚拟dom
  $createElement(tag, attr, children, elm) {
    return {tag, attr, children, elm}
  }

  _update(vnode) {
    // 上一次 虚拟 vnode
    const prevVnode = this._vnode

    if(!prevVnode){
      // 初始化
      this.__patch__(this.$el, vnode)
    }else{
      // 更新
      this.__patch__(prevVnode, vnode)
    }
  }

  __patch__(oldVnode, vnode){
    // oldVnode 是真实 DOM
    this.$$patch(oldVnode, vnode) 
  }
  $$patch(oldVnode, vnode) {
    // 源码中是 通过 createPatchFunction 创建的 patch 方法， 这边只是模拟
    // 平台相关
    
    // 1. 如果新的 vnode 没有 但是 oldVnode  存在  就是删除操作

    // 2. 如果 旧的不存在 但是新的存在 就是 新增操作

    // 3. 正常存在
    // 判断 oldVnode 是否是原生dom
    // const isRealElement = isDef(oldVnode.nodeType)
    const isRealElement = oldVnode.nodeType
    // if (!isRealElement && sameVnode(oldVnode, vnode)) {

    // }else{
          // 如果是真实 dom
          if(isRealElement){
            // oldVnode 转换成虚拟DOM
            oldVnode = emptyNodeAt(oldVnode, this)
          }
          const oldElm = oldVnode.elm
          const parentElm =  oldElm.parentElement
          this.createElm.call(this, vnode, parentElm, oldElm.nextSibling)
          parentElm.removeChild(oldElm);
          this._vnode = vnode
    // }
  }

  createElm(vnode, parentElm, refElm) {
    const children = vnode.children
    const tag = vnode.tag
    if(tag){
      const tagdom = document.createElement(tag)
      vnode.elm = tagdom
      this.createChildren(vnode, children)
      // inser
      parentElm.insertBefore(tagdom, refElm)
    }
    console.log('???xx')
  }
  createChildren(vnode, children){
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; ++i) {
        this.createElm.call(this, children[i], vnode.elm, null)
      }
    }else{
      vnode.elm.textContent = children 
      // el.textContent = vnode.children;
    }
  }
}
function emptyNodeAt(el, vm) {
  return vm.$createElement(el.tag, {}, [], el)
}
// 监听器： 页面依赖收集
class Watcher {
  constructor(vm, fn) {
    this.vm = vm;
    this.getter = fn;

    // 执行一个get 方法
    this.get()
  }

  get() {
    
    Dep.target = this;
    // get 方法
    this.getter.call(this.vm)
    Dep.target = null;
  }

  update() {
    console.log('>>>')
    // this.updateFn.call(this.vm, this.vm[this.key]);
    this.getter.call(this.vm)
  }
}

class Dep {
  constructor() {
    this.deps = new Set()
  }

  addDep(dep) {
    this.deps.add(dep)
  }

  notify() {
    this.deps.forEach(dep => dep.update())
  }
}

/**
 * 之前的逻辑 是 一个  对象 key 产生一个 dep 一个 dep 对应多个 watcher
 */
/**
 * data{
 *  people1: 'saber'
 * }
 */

/**
 *  vue2 的逻辑是   
 *  data: {
 *    people1: "saber",
 *    people2: "kurama"
 *  }
 */
