  // 这个是一个模拟 
  // 在 vue3 中真实使用的 是 set
  let activeEffect = null
  class Dep {
    constructor() {
     this.subscribers = new Set() 
    }
    depend() {
      this.subscribers.add()
    }
    notify(){
      this.subscribers.forEach((effect) => {

      })
    }
  }
  const dep = new Dep();

  function watchEffect(effetc) {
    let 
  }

  function watchEffect(effect) {
    dep.depend()
    console.log('执行副作用')
  }

  console.log('???xx')

/**
 * // 1. 响应式原理的核心 就是 再次 执行 
 * watchEffect 存储了 副作用
 * dep.notify(); 执行一次副作用 
 */
