/**
 * 自动监听 属性的 get 和 set
 * 自动触发 track 和 trigger
 */
let product = { price: 10, quantity: 3 }
let total = 10
let targetMap = new WeakMap();
let effect = () => {
  total = product.price * product.quantity;
};

const track = (target, key) => {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    // depsMap = new Map();
    // targetMap.set(target, depsMap);
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key);
  if (!dep) {
    // dep = new Set();
    // depsMap.set(key, dep);
    depsMap.set(key, (dep = new Set()))
  }
  dep.add(effect);
};

const trigger = (target, key) => {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let dep = depsMap.get(key)
  if(!dep){
    return;
  }
  console.log('dep', dep)
  dep.forEach(effect => {
    effect()
  });
};

const reactive = (target) => {
  const handler  = {
    get(target, property, receiver) {
      console.log('触发了 get 方法')
      track(target, property);
      return Reflect.get(target, property, receiver)
    },
    set(target, property, value, receiver) {
      // 开始 调用
      console.log('触发 set 方法')
      const result = Reflect.set(target, property, value, receiver);
      trigger(target, property); 
      console.log('result---', result)
    }
  }
  return new Proxy(target, handler)
}
let productProxy = reactive(product)
productProxy.price
productProxy.price  = 11
// console.log(productProxy.price);
// effect()
console.log('total:', total)
