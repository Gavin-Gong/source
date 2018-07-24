import { defineReactive, isObservable, warn } from './util'
import { Subject, Subscription } from 'rxjs'

export default {
  created () {
    const vm = this // 所在组件实例 
    const domStreams = vm.$options.domStreams // 配置的选项

    // TODO: 不判断是不是数组?
    if (domStreams) {
      domStreams.forEach(key => {
        vm[key] = new Subject() // 为每个 key 绑定一个 Subject 实例
      })
    }

    const observableMethods = vm.$options.observableMethods // observable 方法
    if (observableMethods) {
      if (Array.isArray(observableMethods)) {
        observableMethods.forEach(methodName => {
          vm[ methodName + '$' ] = vm.$createObservableMethod(methodName)
        })
      } else {
        Object.keys(observableMethods).forEach(methodName => {
          vm[observableMethods[methodName]] = vm.$createObservableMethod(methodName)
        })
      }
    }

    let obs = vm.$options.subscriptions
    if (typeof obs === 'function') {
      obs = obs.call(vm)
    }
    if (obs) {
      vm.$observables = {}
      vm._subscription = new Subscription()
      Object.keys(obs).forEach(key => {
        defineReactive(vm, key, undefined)
        const ob = vm.$observables[key] = obs[key]
        if (!isObservable(ob)) {
          warn(
            'Invalid Observable found in subscriptions option with key "' + key + '".',
            vm
          )
          return
        }
        vm._subscription.add(obs[key].subscribe(value => {
          vm[key] = value
        }, (error) => { throw error }))
      })
    }
  },

  beforeDestroy () {
    // 解绑订阅
    if (this._subscription) {
      this._subscription.unsubscribe()
    }
  }
}
