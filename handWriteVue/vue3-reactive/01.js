// let price = 10;
// let quantity = 3;

// 需要将 操作存储起来
// let total = price * quantity;

// console.log('total: ', total)

// // effect
// let effect = () => {
//   total = price * quantity
// }

/**
 *  dep ===> Set （effect集合）
 *  track ===> 保存 effect 到 set集合
 *  trigger =====》 执行 dep 中的 effect 函数
 */
// let dep  = new Set();
// let effect = () => {
//   total = price * quantity
// }
// // 存储
// let track = () => {
//   dep.add(effect)
// }

// // 执行
// let trigger = () => {
//   dep.forEach((effect) => {
//     effect()
//   })
// }
// track();
// quantity = 4;
// trigger();
// console.log('total: ', total)
// quantity = 5;
// trigger();
// console.log('total: ', total)

/**
 *  针对对象
 *  每一个属性都是一个dep
 *  let product = { price: 10, quantity: 3 }
 */
/**
 *  dep ===> Set （effect集合）
 *  depsMap ====> Map (对象的每个 key， 每一个 key的值  是一个 set)
 *               (Map({price: Dep(Set), quantity: Dep(Set)}))
 *  track ===> 保存 effect 到 set集合
 *  trigger =====》 执行 dep 中的 effect 函数
 */
// let product = { price: 10, quantity: 3 } // 产品
// let total = product.price * product.quantity
// console.log('total: ', total)
// /**
//  * depsMap 中的每一个 key 都是一个 dep
//  */
// let depsMap = new Map();

// let effect  = () => {
//   total = product.price * product.quantity
// }

// const track = (key) => {
//   // dep 是否存在
//   let dep = depsMap.get(key)
//   if(!dep){
//     dep = new Set()
//     depsMap.set(key, dep)
//   }
//   dep.add(effect)

// }

// const trigger = (key) => {
//   let dep = depsMap.get(key)
//   if(!dep){
//     return
//   }
//   dep.forEach(effect => {
//     effect()
//   });
// }
// track('quantity')
// product.quantity = 4;
// trigger('quantity')
// console.log('total: ', total)

/**
 * 存在多个对象
 */
/**
 *  dep ===> Set （effect集合）
 *  depsMap ====> Map (对象的每个 key， 每一个 key的值  是一个 set)
 *               (Map({price: Dep(Set), quantity: Dep(Set)}))
 *  targetMap ====> WeakMap (每一个key 都是对象)
 *                  (WeakMap( { Obj(product): Map(depsMap)), Obj(User): Map(deopMap) })
 *  track ===> 保存 effect 到 set集合
 *  trigger =====》 执行 dep 中的 effect 函数
 */
let product = { price: 10, quantity: 3 };
let user = { name: "saber", age: 18 };
let total = product.price * product.quantity;
console.log('total: ', total)

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
  dep.forEach(effect => {
    effect()
  });
};

track(product, 'quantity')
product.quantity = 4;
trigger(product, 'quantity')
console.log('total: ', total)
