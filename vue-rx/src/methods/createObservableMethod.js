import { share } from 'rxjs/operators'
import { Observable } from 'rxjs'
import { warn } from '../util'

/**
 * @name Vue.prototype.$createObservableMethod
 * @description Creates an observable from a given function name.
 * @param {String} methodName Function name
 * @param {Boolean} [passContext] Append the call context at the end of emit data? 是否传递 上下文 vm this
 * @return {Observable} Hot stream
 */
export default function createObservableMethod (methodName, passContext) {
  const vm = this
  // 当实例上存在这个方法就 warning
  if (vm[methodName] !== undefined) {
    warn(
      'Potential bug: ' +
      `Method ${methodName} already defined on vm and has been overwritten by $createObservableMethod.` +
      String(vm[methodName]),
      vm
    )
  }

  // 定义工厂函数
  const creator = function (observer) {
    vm[methodName] = function () {
      const args = Array.from(arguments) // 拿到函数参数
      if (passContext) {
        // 传递 this, 直接 vm 不就好了?
        args.push(this)
        observer.next(args) // next 参数, 传递
      } else {
        if (args.length <= 1) {
          // 处理 0 或者 1个参数的情况, 以单参数的形式
          observer.next(args[0])
        } else {
          // 传递一个数组
          observer.next(args)
        }
      }
    }
    // 返回一个删除该方法的函数, unsubscribe 的时候会调用这个函数删除创建的方法
    return function () {
      delete vm[methodName]
    }
  }

  // Must be a hot stream otherwise function context may overwrite over and over again
  return new Observable(creator).pipe(share()) // share 操作符用来变成 hot Observable
}
