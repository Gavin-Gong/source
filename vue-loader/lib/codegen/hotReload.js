// 拿到 vue-hot-reload-api 的绝对路径
const hotReloadAPIPath = JSON.stringify(require.resolve('vue-hot-reload-api'))

/**
 * @desc 生成模板重载代码
 * @param {*} id
 * @param {*} request
 */
const genTemplateHotReloadCode = (id, request) => {
  return `
    module.hot.accept(${request}, function () {
      api.rerender('${id}', {
        render: render,
        staticRenderFns: staticRenderFns
      })
    })
  `.trim()
}

/**
 * @desc 生成热重载代码
 * @param {*} id
 * @param {*} functional
 * @param {*} templateRequest
 */
exports.genHotReloadCode = (id, functional, templateRequest) => {
  return `
/* hot reload */
if (module.hot) {
  var api = require(${hotReloadAPIPath})
  api.install(require('vue'))
  if (api.compatible) {
    module.hot.accept()
    if (!module.hot.data) {
      api.createRecord('${id}', component.options)
    } else {
      api.${functional ? 'rerender' : 'reload'}('${id}', component.options)
    }
    ${templateRequest ? genTemplateHotReloadCode(id, templateRequest) : ''}
  }
}
  `.trim()
}
