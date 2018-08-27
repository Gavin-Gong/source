// Credits: borrowed code from fcomb/redux-logger

import { deepCopy } from '../util'

/**
 * @desc 内置的 logger plugin 工厂函数
 */
export default function createLogger ({
  collapsed = true, // 合并
  filter = (mutation, stateBefore, stateAfter) => true, // 过滤器 -> 只 log 特定的东东
  transformer = state => state, // state 转化器
  mutationTransformer = mut => mut, // mut 转化器
  logger = console // 自定义的 console, 与原生 API 保持一致
} = {}) {
  return store => {
    let prevState = deepCopy(store.state)

    store.subscribe((mutation, state) => {
      if (typeof logger === 'undefined') {
        return
      }
      const nextState = deepCopy(state)

      // 针对需要过滤的进行处理
      if (filter(mutation, prevState, nextState)) {
        // 生成时间戳
        const time = new Date()
        const formattedTime = ` @ ${pad(time.getHours(), 2)}:${pad(time.getMinutes(), 2)}:${pad(time.getSeconds(), 2)}.${pad(time.getMilliseconds(), 3)}`
        const formattedMutation = mutationTransformer(mutation)
        const message = `mutation ${mutation.type}${formattedTime}`
        const startMessage = collapsed
          ? logger.groupCollapsed
          : logger.group

        // render
        try {
          startMessage.call(logger, message)
        } catch (e) {
          console.log(message)
        }

        logger.log('%c prev state', 'color: #9E9E9E; font-weight: bold', transformer(prevState))
        logger.log('%c mutation', 'color: #03A9F4; font-weight: bold', formattedMutation)
        logger.log('%c next state', 'color: #4CAF50; font-weight: bold', transformer(nextState))

        try {
          logger.groupEnd()
        } catch (e) {
          logger.log('—— log end ——')
        }
      }

      prevState = nextState // 更新最新的状态
    })
  }
}

/**
 * @desc 利用空数组重复join
 * @param {String} str 重复的字符串
 * @param {Number} timer 重复的次数
 */
function repeat (str, times) {
  return (new Array(times + 1)).join(str)
}

/**
 * @desc 补全左边缺位
 * @param {Number} num 传入的数字
 * @param {Number} maxLength 恒定长度
 */
function pad (num, maxLength) {
  return repeat('0', maxLength - num.toString().length) + num //  num 不 String 一下真是不放心
}
