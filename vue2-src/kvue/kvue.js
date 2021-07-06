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
      // 执行 一个 _render
      const dom = this.$options.render.call(this)
      const parent = this.$el.parentElement;
      parent.insertBefore(dom, this.$el.nextSibling)
      parent.removeChild(this.$el);
      this.$el = dom
      // 执行一个 _update 
    }

    // 创建 一个 Watcher 对象
    new Watcher(this, updateComponent)
  }
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
