export let Vue
export let warn = function () {}

// NOTE(benlesh): the value of this method seems dubious now, but I'm not sure
// if this is a Vue convention I'm just not familiar with. Perhaps it would
// be better to just import and use Vue directly?
export function install (_Vue) {
  Vue = _Vue
  warn = Vue.util.warn || warn
}

// TODO(benlesh): as time passes, this should be updated to use RxJS 6.1's
// `isObservable` method. But wait until you're ready to drop support for Rx 5
/**
 * @desc 根据对象是否有 subscribe 函数判断是否为 Observable
 */
export function isObservable (ob) {
  return ob && typeof ob.subscribe === 'function'
}

/**
 * @desc 判断是否为 subject
 */
export function isObserver (subject) {
  return subject && (
    typeof subject.next === 'function'
  )
}

/**
 * @desc 定义响应值 -> 没有对应的key在实例上就调用 Vue 内置的 defineReactive + 否则就更新值
 * @param {*} vm Vue 实例
 * @param {*} key key
 * @param {*} val val
 */
export function defineReactive (vm, key, val) {
  if (key in vm) {
    vm[key] = val
  } else {
    Vue.util.defineReactive(vm, key, val)
  }
}

/**
 * @desc Vue 指令工具函数
 * @param {*} binding 
 */
export function getKey (binding) {
  return [binding.arg].concat(Object.keys(binding.modifiers)).join(':')
}
