/**
 * Proxy  代理
 */

// 1. handler.apply() 方法用于拦截函数的调用。

// 该方法会拦截目标对象的以下操作:
// * proxy(...args)
// * Function.prototype.apply() 和 Function.prototype.call()
// * Reflect.apply()

function sum(a, b) {
  return a + b;
}
const handler = {
  apply: function(target, thisArg, argumentsList) {
    console.log(`Calculate sum: ${argumentsList}`);
    // expected output: "Calculate sum: 1,2"

    return target(argumentsList[0], argumentsList[1]) * 10;
  }
};
const proxy1 = new Proxy(sum, handler);
console.log(sum(1, 2));
// expected output: 3
console.log(proxy1(1, 2));
// expected output: 30

// 2. handler.construct()

// var p = new Proxy(target, {
//   construct: function(target, argumentsList, newTarget) {
//   }
// });

// handler.construct() 方法用于拦截new 操作符. 为了使new操作符在生成的Proxy对象上生效，用于初始化代理的目标对象自身必须具有[[Construct]]内部方法（即 new target 必须是有效的）
// 该拦截器可以拦截以下操作:
// * new proxy(...args)
// * Reflect.construct()

// 3. handler.defineProperty()
// handler.defineProperty() 用于拦截对对象的 Object.defineProperty() 操作。

// 4. handler.deleteProperty()

// 5. handler.get()

// 6. handler.getOwnPropertyDescriptor()

// 7. handler.getPrototypeOf()

// 8. handler.has()

// 9. handler.isExtensible()

// 10. handler.ownKeys()

// 11. handler.preventExtensions()

// 12. handler.set()

// 13. handler.setPrototypeOf()

