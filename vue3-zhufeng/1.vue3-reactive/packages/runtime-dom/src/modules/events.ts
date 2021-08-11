export const patchEvent = (el, key, value) => {
  // 对函数的缓存
  const invokers = el._vei || (el._vei || {})
  const exists = invokers[key]; // 如果不存在
  if(value && exists){ // 更新绑定事件
    exists.value = value;
  }else{
    const eventName = key.slice(2).toLowerCase()
    if(value){ // 之前没有绑定过现在绑定
      let invoker = invokers[key] = createInvoker(value);
       el.addEventListener(eventName,invoker)
    }else{
      if(exists){ // 以前绑定了 当时没有value
        el.removeEventListener(eventName,exists);
        // invokers[key] = undefined;
        delete invokers[key]
      }
    }
  }
}

function createInvoker(value) {
  const invoker = (e) => { invoker.value(e)} 
  invoker.value = value;
  return invoker
}