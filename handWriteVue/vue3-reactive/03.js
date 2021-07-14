/**
 * 希望的 effect 的时候才会 触发 get
 */
let targetMap = new WeakMap();
let activeEffect = null;

const effect = (eff) => {
  activeEffect = eff;
  activeEffect();
  activeEffect = null;
};

const track = (target, key) => {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = new Set()));
    }
    // 添加 activeEffect

    dep.add(activeEffect);
  }
};
const trigger = (target, key) => {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  dep.forEach((effect) => {
    effect();
  });
};

const reactive = (target) => {
  const handler = {
    get(target, property, receiver) {
      // if (activeEffect) {
      //   console.log("get 方法触发");
      //   track(target, property);
      // }
      // return Reflect.get(target, property, receiver);
      let result = Reflect.get(target, property, receiver)
      track(target, property) // If this reactive property (target) is GET inside then track the effect to rerun on SET
      return result
    },
    set(target, property, value, receiver) {
      const oldValue = target[property];
      const result = Reflect.set(target, property, value, receiver);
      if (result && oldValue != value) {
        trigger(target, property);
      }
    },
  };
  return new Proxy(target, handler);
};

let product = reactive({ price: 10, quantity: 3 });
let total = 0;
// let salePrice = 0;
// effect(() => {
//   total = product.price * product.quantity
// })
/**
 * 如何定义 ref
 * ref 是什么，ref 返回一个响应式对象，这个对象拥有.value 值指向内部的值
 */
// 1. 这是一种方式 但是vue3 不是用的这种方式
// const ref =  (initValue) => {
//   return reactive({value: initValue})
// }

// javascript 的 get 和 set
// const user = {
//   firstName: 'sa',
//   lastName: 'ber',
//   get fullName() {
//     return this.firstName + ' '+this.lastName
//   },
//   set fullName(value) {
//     [this.firstName, this.lastName] = value.split(' ')
//   }
// }
// console.log(user.fullName)
// user.fullName = 'sabsad asdasd'
// console.log(user.fullName)
const ref = (initValue) => {
  let raw = initValue
  let preValue = null;
  const r = {
    set value(val) {
      preValue = raw
      raw = val;
      if(raw !== preValue){
        console.log('triggertriggertrigger')
        trigger(r, "value");
      }
        // trigger(r, "value");
    },
    get value() {

      // 不执行 当前 活跃的 effect
      // if (effect !== activeEffect || effect.allowRecurse) {
      //   effects.add(effect)
      // }
      if(activeEffect && preValue !== raw){
        console.log('tracktracktrack')
        track(r, "value");
      }
      
      return raw;
    },
  };
  return r;
};

let salePrice = ref(0);

effect(() => {
  console.log('effecteffecteffect1');
   total = salePrice.value * product.quantity 
 });

effect(() => {
  console.log('<><><><>')
  // salePrice.value = 10
  salePrice.value = product.price * 0.9
});
console.log('==================')
salePrice.value = 10;

// effect(() => {
//   console.log('<><><><>11')
//   salePrice.value = 10;
//   // salePrice.value = product.price * 0.9
// });



console.log("total1: ", total);

product.quantity = 5;

console.log(
  `price: ${product.price}, quantity: ${product.quantity} ,salePrice: ${salePrice.value},  total: ${total}`
);

product.price = 20;

console.log(
  `price: ${product.price}, quantity: ${product.quantity} ,salePrice: ${salePrice.value},  total: ${total}`
);
