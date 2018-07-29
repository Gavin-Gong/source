import { isObserver, warn, getKey } from '../util'
import { fromEvent } from 'rxjs'

// v-stream 指令
export default {
  // Example ./example/counter_dir.html
  bind (el, binding, vnode) {
    let handle = binding.value // =值
    const event = binding.arg // :参数
    const streamName = binding.expression // 表达式(未计算的)
    const modifiers = binding.modifiers // .修饰符 -> stop , prevent, TODO: self ???

    if (isObserver(handle)) {
      // 处理 handle 是流的情况
      handle = { subject: handle }
    } else if (!handle || !isObserver(handle.subject)) {
      warn(
        'Invalid Subject found in directive with key "' + streamName + '".' +
        streamName + ' should be an instance of Subject or have the ' +
        'type { subject: Subject, data: any }.',
        vnode.context // TODO: VNode 树
      )
      return
    }

    // 事件修饰符 map
    const modifiersFuncs = {
      stop: e => e.stopPropagation(),
      prevent: e => e.preventDefault()
    }
    // 如果修饰符有这个值 那么取到相对应的函数 -> 拿到一个函数数组
    var modifiersExists = Object.keys(modifiersFuncs).filter(
      key => modifiers[key]
    )

    const subject = handle.subject // 拿到配置项中的 subject
    // 这里的 onNext 可能是为了兼容 Rxjs 4 ?, bind 再修正一下 this 指向
    const next = (subject.next || subject.onNext).bind(subject)

    // vnode.componentInstance -> 组件实例
    if (!modifiers.native && vnode.componentInstance) {
      // 自定义事件的情况,  将 subscription 绑到 handle 方便之后调用
      handle.subscription = vnode.componentInstance.$eventToObservable(event).subscribe(e => {
        modifiersExists.forEach(mod => modifiersFuncs[mod](e)) // 执行函数数组
        next({
          event: e,
          data: handle.data
        }) // 传递 事件和 data
      })
    } else {
      // 原生事件
      const fromEventArgs = handle.options ? [el, event, handle.options] : [el, event]  
      handle.subscription = fromEvent(...fromEventArgs).subscribe(e => {
        modifiersExists.forEach(mod => modifiersFuncs[mod](e))
        next({
          event: e,
          data: handle.data
        })
      })

      // store handle on element with a unique key for identifying
      // multiple v-stream directives on the same node
      // 绑定 handle 到 _rxHandles
      ;(el._rxHandles || (el._rxHandles = {}))[getKey(binding)] = handle
    }
  },
  // vnode 更新之后 更新 handle.data
  update (el, binding) {
    const handle = binding.value
    const _handle = el._rxHandles && el._rxHandles[getKey(binding)]
    if (_handle && handle && isObserver(handle.subject)) {
      _handle.data = handle.data // 更新 handle.data
    }
  },
  // 指令从元素移除调用一次 -> 解绑指令上的订阅, 清空 _rxHandles 上对应的数据
  unbind (el, binding) {
    const key = getKey(binding)
    const handle = el._rxHandles && el._rxHandles[key]
    if (handle) {
      if (handle.subscription) {
        handle.subscription.unsubscribe()
      }
      el._rxHandles[key] = null
    }
  }
}
