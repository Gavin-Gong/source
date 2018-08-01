export default function (Vue) {
  const version = Number(Vue.version.split('.')[0])

  if (version >= 2) {
    Vue.mixin({ beforeCreate: vuexInit }) // 全局 混合
  } else {
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [vuexInit].concat(options.init)
        : vuexInit
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */

  function vuexInit () {
    const options = this.$options
    // store injection
    // 注入 store but TODO: store 可能是函数???
    if (options.store) {
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      // 每一个初始化的组件都会跑一次, 虽然我们只注入到根组件,
      // but 按照从父到子的初始化顺序, 没有配置 store 选项的组件就会从 父组件中取到 store
      // 层层注入 完美
      this.$store = options.parent.$store
    }
  }
}
