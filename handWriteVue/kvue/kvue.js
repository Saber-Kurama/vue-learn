
function defineReactive(obj, key, val) { 
  // 递归
  observe(val)
  Object.defineProperty(obj, key, {
    get() {
      console.log("get", val)
      return val;
    },
    set(v) {
      if(v !== val){
        console.log("set", key)
        val = v;
        update()
      }
    }
  })
}



function observe(obj) {
  // 判断 obj 是不是对象
  if(typeof obj !== 'object' || obj === null){
    return
  }
  new Observer(obj)
}

class Observer {
  constructor(obj){
    this.value = obj
    if(Array.isArray(obj)){

    }else{
      this.walk(obj)
    }
  }
  walk(obj) {
    Object.keys(obj).forEach((key) => {
      defineReactive(obj, key, obj[key])
    })
  }
}

class KVue {
  constructor(options){
    this.$options = options
    this.$data = options.data

    observe(this.$data)
  }
}