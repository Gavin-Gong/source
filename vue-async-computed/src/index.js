import {
  initLazy,
  isComputedLazy,
  isLazyActive,
  makeLazyComputed,
  silentGetLazy,
  silentSetLazy,
} from './lazy'

const prefix = '_async_computed$'

const AsyncComputed = {
  install (Vue, pluginOptions) {
    pluginOptions = pluginOptions || {}

    // 更新策略 -> 其实是子覆盖父
    Vue.config
      .optionMergeStrategies
      .asyncComputed = Vue.config.optionMergeStrategies.computed

    Vue.mixin({
      // 混入钩子函数
      beforeCreate () {
        const optionData = this.$options.data // 定义的数据

        // 处理没有原生 computed 的情况
        if (!this.$options.computed) this.$options.computed = {}

        // 遍历异步计算属性，用
        for (const key in this.$options.asyncComputed || {}) {
          // 加 preifx 防止重复,  -> 将 asyncComputed 转为 computed
          this.$options.computed[prefix + key] = getterFn(key, this.$options.asyncComputed[key])
        }

        // 劫持或者改写原 data选项
        this.$options.data = function vueAsyncComputedInjectedDataFn () {
          // 处理 根组件和普通组件之间 数据对象不一致的情况
          const data = (
            (typeof optionData === 'function')
              ? optionData.call(this)
              : optionData
          ) || {}
          // 遍历 asyncComputed
          for (const key in this.$options.asyncComputed || {}) {
            const item = this.$options.asyncComputed[key] // 拿到值
            // 根据传入的配置 判断是否懒计算
            if (isComputedLazy(item)) {
              initLazy(data, key)
              this.$options.computed[key] = makeLazyComputed(key)
            } else {
              data[key] = null // 初始化值,  让其响应式
            }
          }
          return data
        }
      },
      // 混入钩子函数
      created () {
        // 遍历 asyncComputed 赋值默认值
        for (const key in this.$options.asyncComputed || {}) {
          const item = this.$options.asyncComputed[key],
                value = generateDefault.call(this, item, pluginOptions) // 根据全局配置 本地配置 混合取得取得默认值
          if (isComputedLazy(item)) {
            silentSetLazy(this, key, value)
          } else {
            this[key] = value // 设置默认值
          }
        }
        // 遍历 asyncComputed
        for (const key in this.$options.asyncComputed || {}) {
          let promiseId = 0 // 为每个属性的 watch 分配一个 ID 保证当前 Promise 的一致性
          // watch asyncComputed 计算属性 => 一旦依赖值发生变更 => 触发异步操作并赋值 => 从 Promise 中取出值 => 赋值给 data
          this.$watch(prefix + key, newPromise => {
            const thisPromise = ++promiseId

            // 处理不是 Promise 实例的情况
            if (!newPromise || !newPromise.then) {
              newPromise = Promise.resolve(newPromise)
            }

            // 拿到 Promise 里面的值
            newPromise.then(value => {
              if (thisPromise !== promiseId) return
              this[key] = value
            }).catch(err => {
              // 处理错误

              if (thisPromise !== promiseId) return

              // 全局错误钩子处理
              if (pluginOptions.errorHandler === false) return

              // 没有全局错误钩子函数配置就使用原生的 log
              const handler = (pluginOptions.errorHandler === undefined)
                ? console.error.bind(console, 'Error evaluating async computed property:')
                : pluginOptions.errorHandler

              // 是否输出原始错误
              if (pluginOptions.useRawError) {
                handler(err)
              } else {
                handler(err.stack)
              }
            })
          }, { immediate: true })
        }
      }
    })
  }
}
/**
 * @desc 取得最终的计算属性函数
 */
function getterFn (key, fn) {
  if (typeof fn === 'function') return fn // fn 为函数就直接返回

  let getter = fn.get

  // 有 watch函数 配置的话
  if (fn.hasOwnProperty('watch')) {
    getter = function getter () {
      fn.watch.call(this) // 调用 watch 函数
      return fn.get.call(this)
    }
  }
  if (isComputedLazy(fn)) {
    const nonLazy = getter
    getter = function lazyGetter () {
      if (isLazyActive(this, key)) {
        return nonLazy.call(this)
      } else {
        return silentGetLazy(this, key)
      }
    }
  }
  return getter
}

/**
 * @desc 处理默认值情况
 * @param {*}  默认值值或者函数
 * @param {*} pluginOptions 插件传入的选项
 */
function generateDefault (fn, pluginOptions) {
  let defaultValue = null
  // 局部默认值
  if ('default' in fn) {
    defaultValue = fn.default
  } else if ('default' in pluginOptions) {
    // 全局默认值
    defaultValue = pluginOptions.default
  }
  // 函数默认值
  if (typeof defaultValue === 'function') {
    return defaultValue.call(this)
  } else {
    return defaultValue
  }
}

export default AsyncComputed

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
