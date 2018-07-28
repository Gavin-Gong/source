/* global Vue */

import { install } from './util'
import rxMixin from './mixin'
import streamDirective from './directives/stream'
import watchAsObservable from './methods/watchAsObservable'
import fromDOMEvent from './methods/fromDOMEvent'
import subscribeTo from './methods/subscribeTo'
import eventToObservable from './methods/eventToObservable'
import createObservableMethod from './methods/createObservableMethod'

export default function VueRx (Vue) {
  install(Vue) // 这个有点迷
  Vue.mixin(rxMixin) // 全局混合
  Vue.directive('stream', streamDirective) // 注册指令 -> v-stream

  // 一言不合写到原型上去
  Vue.prototype.$watchAsObservable = watchAsObservable
  Vue.prototype.$fromDOMEvent = fromDOMEvent
  Vue.prototype.$subscribeTo = subscribeTo
  Vue.prototype.$eventToObservable = eventToObservable // 将 Vue 内部事件转化为 Observale
  Vue.prototype.$createObservableMethod = createObservableMethod
}

// auto install
if (typeof Vue !== 'undefined') {
  Vue.use(VueRx)
}
