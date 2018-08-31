const qs = require('querystring')
const loaderUtils = require('loader-utils')
const { compileTemplate } = require('@vue/component-compiler-utils')

// Loader that compiles raw template into JavaScript functions.
// This is injected by the global pitcher (../pitch) for template
// selection requests initiated from vue files.

module.exports = function (source) {
  const loaderContext = this
  const query = qs.parse(this.resourceQuery.slice(1))
  // although this is not the main vue-loader, we can get access to the same
  // vue-loader options because we've set an ident in the plugin and used that
  // ident to create the request for this loader in the pitcher.
  const options = loaderUtils.getOptions(loaderContext) || {}
  const { id } = query
  const isServer = loaderContext.target === 'node'
  const isProduction = loaderContext.minimize || process.env.NODE_ENV === 'production'
  const isFunctional = query.functional

  // allow using custom compiler via options
  // 允许自定义 compiler
  const compiler = options.compiler || require('vue-template-compiler')
  const compilerOptions = Object.assign({}, options.compilerOptions, {
    scopeId: query.scoped ? `data-v-${id}` : null, // 用于 scoped 样式
    comments: query.comments
  }) // inline 优先级大于 options

  // for vue-component-compiler
  const finalOptions = {
    source,
    filename: this.resourcePath,
    compiler,
    compilerOptions,
    // allow customizing behavior of vue-template-es2015-compiler
    transpileOptions: options.transpileOptions,
    transformAssetUrls: options.transformAssetUrls || true,
    isProduction,
    isFunctional,
    optimizeSSR: isServer && options.optimizeSSR !== false
  }

  // 编译
  const compiled = compileTemplate(finalOptions)

  // tips -> 输出tips
  if (compiled.tips && compiled.tips.length) {
    compiled.tips.forEach(tip => {
      loaderContext.emitWarning(tip)
    })
  }

  // errors -> 格式化输出警告
  if (compiled.errors && compiled.errors.length) {
    loaderContext.emitError(
      `\n  Error compiling template:\n${pad(compiled.source)}\n` +
        compiled.errors.map(e => `  - ${e}`).join('\n') +
        '\n'
    )
  }

  // 拿到编译后的代码, 其实就是把 Vue 组件里面的 template 在本地转译成 render 函数(VNode)表示方法
  // 而不是放到实际环境中中做这一步
  const { code } = compiled

  // finish with ESM exports
  // var res = Vue.compile('<div><span>{{ msg }}</span></div>')
  // new Vue({
  //   data: {
  //     msg: 'hello'
  //   },
  //   render: res.render,
  //   staticRenderFns: res.staticRenderFns
  // })
  return code + `\nexport { render, staticRenderFns }` // 导出 render 和 staticRenderFns
}

function pad (source) {
  return source
    .split(/\r?\n/)
    .map(line => `  ${line}`)
    .join('\n')
}
