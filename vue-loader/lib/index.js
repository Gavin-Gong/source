const path = require('path')
const hash = require('hash-sum')
const qs = require('querystring')
const plugin = require('./plugin')
const selectBlock = require('./select')
const loaderUtils = require('loader-utils')
const { attrsToQuery } = require('./codegen/utils')
const { parse } = require('@vue/component-compiler-utils')
const genStylesCode = require('./codegen/styleInjection')
const { genHotReloadCode } = require('./codegen/hotReload')
const genCustomBlocksCode = require('./codegen/customBlocks')
const componentNormalizerPath = require.resolve('./runtime/componentNormalizer')
const { NS } = require('./plugin')

let errorEmitted = false

function loadTemplateCompiler () {
  try {
    return require('vue-template-compiler')
  } catch (e) {
    throw new Error(
      `[vue-loader] vue-template-compiler must be installed as a peer dependency, ` +
      `or a compatible compiler implementation must be passed via options.`
    )
  }
}
/**
 *
 * @param {String} source Vue 文件字符流, 一个匹配到的函数调用一次这货
 */
module.exports = function (source) {
  const loaderContext = this // webpack loader 的 ctx

  // 判断是否调用内置 plugin TODO:
  if (!errorEmitted && !loaderContext['thread-loader'] && !loaderContext[NS]) {
    loaderContext.emitError(new Error(
      `vue-loader was used without the corresponding plugin. ` +
      `Make sure to include VueLoaderPlugin in your webpack config.`
    ))
    errorEmitted = true
  }

  const stringifyRequest = r => loaderUtils.stringifyRequest(loaderContext, r)

  const {
    target, // 编译目标, 可以区分 node 还是 web
    request, // request 字符串 "/abc/loader1.js?xyz!/abc/node_modules/loader2/index.js!/abc/resource.js?rrr"
    minimize, // 是否应该被压缩
    sourceMap, // 是否生成 sm
    rootContext, // webpack 这垃圾文档, 解析配置的入口起点 一般为工作目录
    resourcePath, // 资源文件的路径。
    resourceQuery // 资源的query 参数 类似 `?xxx`
  } = loaderContext
  // console.log(resourceQuery)
  const rawQuery = resourceQuery.slice(1) // resourceQuery 是 `?xx=xx`的形式, 所以去掉第一个问号
  const inheritQuery = `&${rawQuery}`
  const incomingQuery = qs.parse(rawQuery) // `foo=bar` -> {foo: bar}
  const options = loaderUtils.getOptions(loaderContext) || {} // 通过 loaderUtils 拿到配置选项

  const isServer = target === 'node' // flag
  const isShadow = !!options.shadowMode // shadowMode opt
  const isProduction = options.productionMode || minimize || process.env.NODE_ENV === 'production' // mode
  const filename = path.basename(resourcePath) // 根据文件路径拿到文件名
  const context = rootContext || process.cwd() // ctx 配置目录
  const sourceRoot = path.dirname(path.relative(context, resourcePath))

  // 解析出一个源文件描述对象
  const descriptor = parse({
    source, // 源
    compiler: options.compiler || loadTemplateCompiler(), // 指定 compiler
    filename, // 文件名
    sourceRoot, // 文件根目录
    needMap: sourceMap // 是否需要 sm
  })

  // if the query has a type field, this is a language block request
  // e.g. foo.vue?type=template&id=xxxxx
  // and we will return early
  // 判断是不是单文件组件中的语言块类型参数, type 一般为 script style HTML, 当然也可能自定义
  // 如果指定了类型直接返回 Block
  if (incomingQuery.type) {
    return selectBlock(
      descriptor,
      loaderContext,
      incomingQuery,
      !!options.appendExtension
    )
  }

  // module id for scoped CSS & hot-reload
  const rawShortFilePath = path
    .relative(context, resourcePath)
    .replace(/^(\.\.[\/\\])+/, '')

  const shortFilePath = rawShortFilePath.replace(/\\/g, '/') + resourceQuery

  const id = hash(
    isProduction
      ? (shortFilePath + '\n' + source)
      : shortFilePath
  )

  // feature information
  const hasScoped = descriptor.styles.some(s => s.scoped)
  const hasFunctional = descriptor.template && descriptor.template.attrs.functional
  const needsHotReload = (
    !isServer &&
    !isProduction &&
    (descriptor.script || descriptor.template) &&
    options.hotReload !== false
  )

  // template
  // 处理模板渲染
  let templateImport = `var render, staticRenderFns`
  let templateRequest
  if (descriptor.template) {
    const src = descriptor.template.src || resourcePath
    const idQuery = `&id=${id}`
    const scopedQuery = hasScoped ? `&scoped=true` : ``
    const attrsQuery = attrsToQuery(descriptor.template.attrs)
    const query = `?vue&type=template${idQuery}${scopedQuery}${attrsQuery}${inheritQuery}`
    const request = templateRequest = stringifyRequest(src + query)
    templateImport = `import { render, staticRenderFns } from ${request}` // 注入渲染函数
  }

  // script
  // 处理 js 加载
  let scriptImport = `var script = {}`
  if (descriptor.script) {
    const src = descriptor.script.src || resourcePath
    const attrsQuery = attrsToQuery(descriptor.script.attrs, 'js')
    const query = `?vue&type=script${attrsQuery}${inheritQuery}`
    const request = stringifyRequest(src + query)
    scriptImport = (
      `import script from ${request}\n` +
      `export * from ${request}` // support named exports
    )
  }

  // styles
  // 处理样式
  let stylesCode = ``
  if (descriptor.styles.length) {
    stylesCode = genStylesCode(
      loaderContext,
      descriptor.styles,
      id,
      resourcePath,
      stringifyRequest,
      needsHotReload,
      isServer || isShadow // needs explicit injection?
    )
  }

  let code = `
${templateImport}
${scriptImport}
${stylesCode}

/* normalize component */
import normalizer from ${stringifyRequest(`!${componentNormalizerPath}`)}
var component = normalizer(
  script,
  render,
  staticRenderFns,
  ${hasFunctional ? `true` : `false`},
  ${/injectStyles/.test(stylesCode) ? `injectStyles` : `null`},
  ${hasScoped ? JSON.stringify(id) : `null`},
  ${isServer ? JSON.stringify(hash(request)) : `null`}
  ${isShadow ? `,true` : ``}
)
  `.trim() + `\n`

  if (descriptor.customBlocks && descriptor.customBlocks.length) {
    code += genCustomBlocksCode(
      descriptor.customBlocks,
      resourcePath,
      resourceQuery,
      stringifyRequest
    )
  }

  if (needsHotReload) {
    code += `\n` + genHotReloadCode(id, hasFunctional, templateRequest)
  }

  // Expose filename. This is used by the devtools and Vue runtime warnings.
  code += `\ncomponent.options.__file = ${
    isProduction
      // For security reasons, only expose the file's basename in production.
      ? JSON.stringify(filename)
      // Expose the file's full path in development, so that it can be opened
      // from the devtools.
      : JSON.stringify(rawShortFilePath.replace(/\\/g, '/'))
  }`

  code += `\nexport default component.exports`
  // console.log(code)
  return code
}

module.exports.VueLoaderPlugin = plugin
