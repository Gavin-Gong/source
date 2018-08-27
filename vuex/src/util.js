/**
 * Get the first item that pass the test
 * by second argument function
 *
 * @param {Array} list
 * @param {Function} f
 * @return {*}
 */
export function find (list, f) {
  return list.filter(f)[0]
}

/**
 * Deep copy the given object considering circular structure.
 * This function caches all nested objects and its copies.
 * If it detects circular structure, use cached copy to avoid infinite loop.
 * @desc 深度拷贝, 深度优先
 * @param {*} obj
 * @param {Array<Object>} cache
 * @return {*}
 * TODO: 为什么针对 circular obj 呢
 */
export function deepCopy (obj, cache = []) {
  // just return if obj is immutable value
  // 处理非对象
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  // 遍历缓存队列看是不是有 copy 的对象 有 copy 的就返回 copy 的
  const hit = find(cache, c => c.original === obj)
  if (hit) {
    return hit.copy
  }

  // 初始化这份 copy
  const copy = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  // cache 走一轮
  cache.push({
    original: obj,
    copy
  })

  // 真正的递归 copy 操作
  Object.keys(obj).forEach(key => {
    // 递归
    copy[key] = deepCopy(obj[key], cache)
  })

  return copy
}

/**
 * @desc 遍历对象
 */
export function forEachValue (obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key))
}

/**
 * @desc 判断是不是对象
 */
export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

/**
 * @desc 判断是不是 Promise, TODO: why not instanceof
 */
export function isPromise (val) {
  return val && typeof val.then === 'function'
}

/**
 * @desc 条件断言
 */
export function assert (condition, msg) {
  if (!condition) throw new Error(`[vuex] ${msg}`)
}
