import { Subscription } from 'rxjs'

/**
 * @desc 订阅一个 observable, 然后让 vue-rx 来接管 unsubscribe 时机
 * @param {*} observable 
 * @param {*} next 
 * @param {*} error 
 * @param {*} complete 
 */
export default function subscribeTo (observable, next, error, complete) {
  const subscription = observable.subscribe(next, error, complete) // subscribe 然后获得一个 subscription

  // vue-rx 把一个组件中所有的订阅关系都放到 _subscription 中来管理,
  // 没有 _subscription 则新建一个, 然后把上面拿到的 subscription 添加到 _subscription,
  // 一旦 _subscription 解除订阅 -> 那么 subscription 也会解除订阅
  // 在 beforeDestory 生命函数的时候会把 _subscription 以及 add 上去的 subscription 全部 unsubscribe
  ;(this._subscription || (this._subscription = new Subscription())).add(subscription)

  // 返回一个订阅关系, 说明我还可以控制它的订阅嘛
  return subscription
}
