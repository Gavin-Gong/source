import { defineReactive, isObservable, warn } from './util'
import { Subject, Subscription } from 'rxjs'

export default {
  created () {
    const vm = this // 所在组件实例 
    const domStreams = vm.$options.domStreams // 配置的选项

    // WARNING: 不判断是不是数组?
    if (domStreams) {
      domStreams.forEach(key => {
        vm[key] = new Subject() // 为每个 key 绑定一个 Subject 实例
      })
    }

    const observableMethods = vm.$options.observableMethods // 拿到 observableMethods 选项
    if (observableMethods) {
      if (Array.isArray(observableMethods)) {
        // 如果是数组简写的话 调用$createObservableMethod 新建流
        observableMethods.forEach(methodName => {
          vm[ methodName + '$' ] = vm.$createObservableMethod(methodName)
        })
      } else {
        // 如果是对象的话, 拿到配置对象的 key 新建流方法
        Object.keys(observableMethods).forEach(methodName => {
          vm[observableMethods[methodName]] = vm.$createObservableMethod(methodName)
        })
      }
    }

    let obs = vm.$options.subscriptions // 拿到 subscriptions 配置项
    if (typeof obs === 'function') {
      // 假如是函数的话, 需要绑到 vm 跑一次拿到 对象形式的 subscriptions
      obs = obs.call(vm)
    }
    if (obs) {
      vm.$observables = {}
      vm._subscription = new Subscription() // 全局的订阅管理 -> _subscription
      Object.keys(obs).forEach(key => {
        defineReactive(vm, key, undefined) // 定义响应式数据到 vm 实例
        const ob = vm.$observables[key] = obs[key]
        if (!isObservable(ob)) {
          // warning 处理不是 Observable 
          warn(
            'Invalid Observable found in subscriptions option with key "' + key + '".',
            vm
          )
          return
        }
        // 往 _subscription 添加 subscription
        // TODO: 哪来的 subscribe 方法
        vm._subscription.add(obs[key].subscribe(value => {
          vm[key] = value // 更新 next 下来的值
        }, (error) => { throw error }))
      })
    }
  },

  beforeDestroy () {
    // 解绑所有订阅
    if (this._subscription) {
      this._subscription.unsubscribe()
    }
  }
}
