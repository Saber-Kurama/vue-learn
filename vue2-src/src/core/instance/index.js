import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 扩展 _init 方法
initMixin(Vue)
// 状态 $data $props
stateMixin(Vue)
// 事件
eventsMixin(Vue)
// 生命周期？
lifecycleMixin(Vue)
// reader
renderMixin(Vue)

export default Vue
