/**
 *  自动触发 track 和 trigger
 */

/**
 * Reflect
 */
// 1. Reflect.apply() // 返回值是调用完带着指定参数和 this 值的给定的函数后返回的结果。
// 该方法与ES5中Function.prototype.apply()方法类似

// console.log(Reflect.apply(Math.floor, undefined, [1.75]));
// console.log(Reflect.apply(''.charAt, 'ponies', [3]));

// 2. Reflect.construct() // 以target（如果newTarget存在，则为newTarget）函数为构造函数，argumentList为其初始化参数的对象实例。
// Reflect.construct允许你使用可变的参数来调用构造函数 ，这和使用new操作符搭配对象展开符调用一样。
// var obj = new Foo(...args);
// var obj = Reflect.construct(Foo, args);

// function OneClass() {
//   this.name = 'one';
// }

// function OtherClass() {
//   this.name = 'other';
// }

// // 创建一个对象:
// var obj1 = Reflect.construct(OneClass, args, OtherClass);

// // 与上述方法等效:
// var obj2 = Object.create(OtherClass.prototype);
// OneClass.apply(obj2, args);

// console.log(obj1.name); // 'one'
// console.log(obj2.name); // 'one'

// console.log(obj1 instanceof OneClass); // false
// console.log(obj2 instanceof OneClass); // false

// console.log(obj1 instanceof OtherClass); // true
// console.log(obj2 instanceof OtherClass); // true

// 3. Reflect.defineProperty(target, propertyKey, attributes) ==> Bool
// 静态方法 Reflect.defineProperty() 基本等同于 Object.defineProperty() 方法，唯一不同是返回 Boolean 值。

// 4. Reflect.deleteProperty(target, propertyKey) ===> Boolean 值表明该属性是否被成功删除。
// 静态方法 Reflect.deleteProperty() 允许用于删除属性。它很像 delete operator ，但它是一个函数。

// 5. Reflect.get(target, propertyKey[, receiver]) ===> 属性的值。
// Reflect.get()方法与从 对象 (target[propertyKey]) 中读取属性类似，但它是通过一个函数执行来操作的。

// 6. Reflect.getOwnPropertyDescriptor(target, propertyKey) ==> 如果属性存在于给定的目标对象中，则返回属性描述符；否则，返回 undefined。
// 静态方法 Reflect.getOwnPropertyDescriptor() 与 Object.getOwnPropertyDescriptor() 方法相似。如果在对象中存在，则返回给定的属性的属性描述符。否则返回 undefined。

// 7. Reflect.getPrototypeOf(target) ===> 给定对象的原型。如果给定对象没有继承的属性，则返回 null。
//静态方法 Reflect.getPrototypeOf() 与 Object.getPrototypeOf() 方法几乎是一样的。都是返回指定对象的原型（即内部的 [[Prototype]] 属性的值）。

// 8. Reflect.has(target, propertyKey) ===> 一个 Boolean 类型的对象指示是否存在此属性。
// 静态方法 Reflect.has() 作用与 in 操作符 相同。

// 9. Reflect.isExtensible(target) ===> Boolean 返回一个 Boolean 值表明该对象是否可扩展。
// 静态方法 Reflect.isExtensible() 判断一个对象是否可扩展 （即是否能够添加新的属性）。与它 Object.isExtensible() 方法相似，但有一些不同，详情可见 differences。

// 10. Reflect.ownKeys(target) ===> 由目标对象的自身属性键组成的 Array。 
// 静态方法 Reflect.ownKeys() 返回一个由目标对象自身的属性键组成的数组。

// 11. Reflect.preventExtensions(target) ==> Boolean 返回一个 Boolean 值表明目标对象是否成功被设置为不可扩展。
// 静态方法 Reflect.preventExtensions() 方法阻止新属性添加到对象 (例如：防止将来对对象的扩展被添加到对象中)。该方法与 Object.preventExtensions()相似，但有一些不同点。详情可见 differences。

// 12. Reflect.set(target, propertyKey, value[, receiver]) ===> 返回一个 Boolean 值表明是否成功设置属性。
// 静态方法 Reflect.set() 工作方式就像在一个对象上设置一个属性。

// 13. Reflect.setPrototypeOf(target, prototype) ===> 返回一个 Boolean 值表明是否原型已经成功设置。
// 除了返回类型以外，静态方法 Reflect.setPrototypeOf() 与 Object.setPrototypeOf() 方法是一样的。它可设置对象的原型（即内部的 [[Prototype]] 属性）为另一个对象或 null，如果操作成功返回 true，否则返回 false。