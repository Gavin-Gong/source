import { Observable, Subscription } from 'rxjs'

/**
 * @desc 将 watcher 转化为 Observable
 * @param {*} expOrFn 要监听的表达式或者函数 => watch 可以使用表达式和函数作为参数
 * @param {*} options Vue watch API 的附加选项 例如 { deep: true, immdediate: true }
 */
export default function watchAsObservable (expOrFn, options) {
  const vm = this // Vue 实例
  const obs$ = new Observable(observer => {
    let _unwatch

    // watch 函数
    const watch = () => {
      // watch 一个表达式, 并赋值保存 解除 watch 的函数 => $watch 返回一个接触 watch 函数, 类比 Rx Observable
      _unwatch = vm.$watch(expOrFn, (newValue, oldValue) => {
        observer.next({ oldValue: oldValue, newValue: newValue })
      }, options)
    }

    // if $watchAsObservable is called inside the subscriptions function,
    // because data hasn't been observed yet, the watcher will not work.
    // in that case, wait until created hook to watch.

    // 根据实例上的 _data 判断是够初始化 data了 (created 之前, beforeCreate 之后 初始化响应式数据)
    if (vm._data) {
      // 此时应该在 created 周期之后
      watch()
    } else {
      vm.$once('hook:created', watch) // 内置钩子一次监听, 一旦 created 就开始 watch
    }

    // Returns function which disconnects the $watch expression
    // 在 unsubscribe 的时候解绑 watch 函数
    return new Subscription(() => {
      _unwatch && _unwatch() // 解除 watch
    })
  })

  return obs$
}
