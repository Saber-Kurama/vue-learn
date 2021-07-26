  // 这个是一个模拟 
  // 在 vue3 中真实使用的 是 set
  let activeEffect = null
  class Dep {
    constructor(val) {
     this.subscribers = new Set()
     this._value = val
    }
    depend() {
      if(activeEffect){
        this.subscribers.add(activeEffect)
      }
      
    }
    notify(){
      this.subscribers.forEach((effect) => {
        effect()
      })
    }

    get value() {
      this.depend()
      return this._value
    }
    set value(val){
      this._value = val
      this.notify()
    }
    
  }
  // const dep = new Dep(1);
  const msg = new Dep('hello')
  const ok = new Dep(true)

  function watchEffect(effetct) {
    activeEffect = effetct
    effetct();
    activeEffect = null
  }

  watchEffect(() => {
      // dep.depend()
      // console.log('执行副作用', dep.value)
      console.log('执行副作用')
      if(ok.value){
        console.log('消息', msg.value)
      }
    }
  )

  // dep.notify()
  // console.log(dep.value) 
  // dep.value = 2
  msg.value = 'saber'
  ok.value = false
  msg.value = 'name'
  ok.value = true
/**
 * // 1. 响应式原理的核心 就是 再次 执行 
 * watchEffect 存储了 副作用
 * dep.notify(); 执行一次副作用
 * dep.depend() 添加存储副作用 
 * 
 * 可以通过 get 和 set 自动监听
 * 
 * watchEffect 中的 if 条件的处理
 * 当 ok.value 为false的时候 ，删除 msg.value 的依赖
 * 因为 ok.value 为 false 的 msg.value 不应该触发副作用
 * 
 * 需要 watchEffect 清除依赖 重新收集 
 * 
 */
