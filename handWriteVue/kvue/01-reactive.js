
function defineReactive(obj, key, val) { 
  
  // 递归 为啥 要把递归放到这 ？ 为了 val 是 object 对象
  // defineReactive(obj, key , {name: 'saber'}) 这种
  observe(val)

  Object.defineProperty(obj, key, {
    get() {
      console.log("get", val)
      return val;
    },
    set() {
      if(v !== val){
        console.log("set", key)
        val = v;
      }
    }
  })
}

function observe(obj) {
  // 判断 obj 是不是对象
  if(typeof obj !== 'object' || obj === null){
    return
  }

  Object.keys(obj).forEach((key) => {
    defineReactive(obj, key, obj[key])
  })
}