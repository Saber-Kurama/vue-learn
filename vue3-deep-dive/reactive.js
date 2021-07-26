let activeEffect = null
/**
 *  代理 的很多方法 可以做到 对应的处理方式
 *  可以解决数组的问题
 */
/**
 *  为什么 使用 WeakMap 
 *  1. WeakMap 的key 是对象
 *  2. WeakMap 中key的对象被垃圾回收之后， WeakMap 中的存储也会被回收 所以 WeakMap 不能迭代 
 */
const targetMap = new WeakMap()
class Dep {
  subscribers = new Set();
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
}

function watchEffect(effetct) {
    activeEffect = effetct
    effetct();
    activeEffect = null
}

// 怎么找到 对应的 dep 呢 
// 有 target 和 key
// 定义一个全局对象
function getDep (target, key) {
    let depsMap = targetMap.get(target)
    if(!depsMap){
     targetMap.set(target, depsMap = new Map()) 
    }
    let dep = depsMap.get(key)
    if(!dep){
        depsMap.set( key, dep = new Dep())
    }
    return dep
}
const proxyHandler = {
    get(target, key, receiver) {
        const dep = getDep(target, key) 
        dep.depend()
        return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
        Reflect.set(target, key, value, receiver)
        const dep = getDep(target, key) 
        console.log(dep)
        return dep.notify()
    },
    // 除了 get 和 set 之外 我们还有其他的方法 来接受监听 并做响应式
    // owerKeys

}

function reactive(raw) {
    // vue 2 的方案 
    // Object.keys(raw).forEach(key => {
    //     // 针对每一个 key 
        // let dep = new Dep();
    //     let value = raw[key]; 
    //     Object.defineProperty(raw, key, {
    //         get(){
    //             dep.depend()
    //             return value
    //         },
    //         set(newVal){
    //             value = newVal
    //             return dep.notify()
    //         }
    //     })
    // })
    return new Proxy(raw, proxyHandler)
}
const rcount = reactive({count: 1})
// const arr1 = reactive([])
watchEffect(() => {
    console.log(rcount.count)
})
// watchEffect(() => {
//     console.log('arr1', arr1)
// })

// rcount.count++
arr1.push('name')