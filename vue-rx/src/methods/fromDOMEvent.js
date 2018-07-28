import { Observable, Subscription, NEVER } from 'rxjs'

export default function fromDOMEvent (selector, event) {
  // 不存在 DOM 事件的荒漠
  if (typeof window === 'undefined') {
    // TODO(benlesh): I'm not sure if this is really what you want here,
    // but it's equivalent to what you were doing. You might want EMPTY

    // 我一个值都不会发出, 但是我还是一个 Observable 啊
    return NEVER
  }

  const vm = this
  const doc = document.documentElement
  const obs$ = new Observable(observer => {
    function listener (e) {
      if (!vm.$el) return // $el 为空直接 return
      if (selector === null && vm.$el === e.target) return observer.next(e) // selector == null 默认为组件 $el
      var els = vm.$el.querySelectorAll(selector) // 拿到可能元素集
      var el = e.target // 实际触发的元素
      for (var i = 0, len = els.length; i < len; i++) {
        if (els[i] === el) return observer.next(e) // 确认到第一个元素 就直接 next 值 停止判断接下来的元素
      }
    }
    doc.addEventListener(event, listener) // 监听事件
    // Returns function which disconnects the $watch expression
    // 返回一个 Subscription 用于 unsubscribe 的时候解绑
    return new Subscription(() => {
      doc.removeEventListener(event, listener) // unsubscribe 的时候解除监听
    })
  })

  return obs$
}
