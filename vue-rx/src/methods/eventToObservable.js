import { Observable } from 'rxjs'

/**
 * @see {@link https://vuejs.org/v2/api/#vm-on}
 * @param {String||Array} evtName Event name
 * @return {Observable} Event stream
 */
export default function eventToObservable (evtName) {
  const vm = this
  const evtNames = Array.isArray(evtName) ? evtName : [evtName] // 如果事件名不是数组就转化为数组, 方便之后统一处理
  const obs$ = new Observable(observer => {
    // 
    const eventPairs = evtNames.map(name => {
      const callback = msg => observer.next({ name, msg }) // 定义监听事件的回调函数
      vm.$on(name, callback) // 监听事件
      return { name, callback }
    })
    // WARNING: 为什么要返回函数??
    return () => {
      // Only remove the specific callback
      eventPairs.forEach(pair => vm.$off(pair.name, pair.callback)) // 移除事件监听
    }
  })

  return obs$
}
