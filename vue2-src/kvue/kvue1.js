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
    new Compile(options.el, this);
  }
}

// 编辑

class Compile {
  constructor(el, vm) {
    this.$vm = vm;

    this.$el = document.querySelector(el);
    this.compile(this.$el);
  }

  compile(el) {
    // 获取 所有 节点
    el.childNodes.forEach((node) => {
      // 元素
      if (node.nodeType === 1) {
        this.compileElement(node);
        // 递归
        if (node.childNodes.length > 0) {
          this.compile(node);
        }
      } else if (this.isInter(node)) {
        // 文本节点 插值文本节点
        console.log("文本节点", node.textContent);
        this.compileText(node);
      }
    });
  }

  isInter(node) {
    return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent);
  }

  isDir(attrName) {
    return attrName.startsWith("k-");
  }

  update(node, exp, dir) {
    // 1. 初始操作
    const fn = this[dir + "Updater"];
    // 1.初始化
    fn && fn(node, this.$vm[exp]);
    console.log('<><><')
    // 2.创建watcher实例
    new Watcher(this.$vm, exp, function (val) {
      console.log('???', node)
      fn && fn(node, val);
    });
  }

  textUpdater(node, val) {
    console.log('???---', val)
    node.textContent = val;
  }

  // 插值文本编译 {{}}
  compileText(node) {
    // console.log("RegExp.$1", RegExp.$1);
    // // 不考虑<p>aa{{aa}}bb</p>
    // node.textContent = this.$vm[RegExp.$1];
    this.update(node, RegExp.$1, "text");
  }

  // 编译元素
  compileElement(node) {
    const nodeAttrs = node.attributes;
    Array.from(nodeAttrs).forEach((attr) => {
      // k-text="xx"
      const attrName = attr.name; // k-text
      const exp = attr.value; // xx
      if (this.isDir(attrName)) {
        // 指令
        // 获取指令执行函数并调用
        const dir = attrName.substring(2);
        this[dir] && this[dir](node, exp);
      }
    });
  }

  // k-text 指令
  text(node, exp) {
    this.update(node, exp, "text");
  }

  html(node, exp) {
    this.update(node, exp, "html");
  }

  htmlUpdater(node, val) {
    node.innerHTML = val;
  }
}

// 监听器： 页面依赖收集
class Watcher {
  constructor(vm, key, updateFn) {
    this.vm = vm;
    this.key = key;
    this.updateFn = updateFn;

    // watchers.push(this)
    // console.log('watcherswatchers', watchers)
    // 获取一下key的值触发它的get方法，在那创建当前watcher实例和dep之间关系
    Dep.target = this
    this.vm[this.key]
    Dep.target = null
  }

  update() {
    console.log('>>>')
    this.updateFn.call(this.vm, this.vm[this.key]);
  }
}

class Dep {
  constructor() {
    this.deps = []
  }

  addDep(dep) {
    this.deps.push(dep)
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
