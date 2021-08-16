export const nodeOps = {
  createElement: tagName => document.createElement(tagName),
  remove: child => {// 删除
      const parent = child.parentNode;
      if(parent){
        parent.removeChild(child)
      }
  },
  insert: (child, parent, anchor = null) => {
    parent.insertBefore(child, anchor); // 
  },
  querySelector: selector => document.querySelector(selector),
  setElementText: (el, text) => el.textContent = text,
  createText: text => document.createTextNode(text),
  setText: (node, text) => node.nodeValue = text,
  nextSibling: (node) => node.nextSibling 
}