/**
 *  响应式的思考的实现
 */

// let price = 10;
// let quantity = 5;
// let total - price * quantity;
// console.log('totaal:', total);
// // 此时价格修改
// price = 20;
// // 此时希望 价格 也发生修改
// console.log('total:', total); // 此时还是 50

// // 如何实现这个 怎么实现呢 
// // 1. 需要存储 这个逻辑 price * quantity; 一个 effect
// // 2. 当数据发生修改，需要调用相应的effect  

// // 这是一个effect
// const  effect = () => {
//     total = price * quantity;
// }
// effect(); //

// track();// 存储一个 effect

// price = 20; 
// // 一个 执行  effect,  当数据发生修改
// trigger();

// 怎么实现呢

/*
 * set 是 effect的集合
 */ 
let set = new Set();
let price = 10;
let quantity = 5;
let total = price * quantity;
console.log('total:', total);
let effect = () => {
    total = price * quantity; 
}
const track = () => {
    set.add(effect)
}
track();
const trigger = () => {
    set.forEach((effect) => {
        effect();
    })
}

price = 20;
trigger();
console.log('total:', total);

quantity = 10;
trigger();
console.log('total:', total);

