/**
 * @desc 判断是否懒计算
 */
export function isComputedLazy (item) {
  return item.hasOwnProperty('lazy') && item.lazy
}

/**
 * @desc 判断是否懒计算过了
 */
export function isLazyActive (vm, key) {
  return vm[lazyActivePrefix + key]
}

// prefix
const lazyActivePrefix = 'async_computed$lazy_active$',
      lazyDataPrefix = 'async_computed$lazy_data$'

/**
 * @desc 初始化懒计算
 */
export function initLazy (data, key) {
  data[lazyActivePrefix + key] = false
  data[lazyDataPrefix + key] = null
}

/**
 * @desc 执行懒计算 => 其实是另一种方式配置 computed
 */
export function makeLazyComputed (key) {
  return {
    get () {
      this[lazyActivePrefix + key] = true
      return this[lazyDataPrefix + key]
    },
    set (value) {
      // 计算属性默认只有 getter ，也可以提供一个 setter
      this[lazyDataPrefix + key] = value
    }
  }
}

export function silentSetLazy (vm, key, value) {
  vm[lazyDataPrefix + key] = value
}
export function silentGetLazy (vm, key) {
  return vm[lazyDataPrefix + key]
}
