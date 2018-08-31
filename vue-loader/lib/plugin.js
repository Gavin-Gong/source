const qs = require('querystring')
const RuleSet = require('webpack/lib/RuleSet')

const id = 'vue-loader-plugin'
const NS = 'vue-loader' // namespace

class VueLoaderPlugin {
  apply (compiler) {
    // add NS marker so that the loader can detect and report missing plugin
    if (compiler.hooks) {
      // webpack 4
      // 运行 compilation 创建之后的钩子函数
      // console.log('compiler')
      compiler.hooks.compilation.tap(id, compilation => {
        // console.log('compilation')
        // 加载完一个模块后加载后调用的钩子函数, TODO:
        compilation.hooks.normalModuleLoader.tap(id, loaderContext => {
          // console.log(id)
          loaderContext[NS] = true // 标记已经有 vueLoaderPlugin 了
        })
      })
    } else {
      // webpack < 4
      // 针对 webpack 4 的配置 跳过不看
      compiler.plugin('compilation', compilation => {
        compilation.plugin('normal-module-loader', loaderContext => {
          loaderContext[NS] = true
        })
      })
    }

    // use webpack's RuleSet utility to normalize user rules
    const rawRules = compiler.options.module.rules
    const { rules } = new RuleSet(rawRules) // 用 webpack 内置的工具函数转化 rawRules, -> 统一 rules
    console.log(rules)
    // find the rule that applies to vue files
    let vueRuleIndex = rawRules.findIndex(createMatcher(`foo.vue`))
    // 处理一下找不到的情况 尝试一下 html
    if (vueRuleIndex < 0) {
      vueRuleIndex = rawRules.findIndex(createMatcher(`foo.vue.html`))
    }
    // 拿到 Vue rule 配置了, 先假装有吧
    const vueRule = rules[vueRuleIndex]

    // 没有配置 vue loader, 抛出错误
    if (!vueRule) {
      throw new Error(
        `[VueLoaderPlugin Error] No matching rule for .vue files found.\n` +
        `Make sure there is at least one root-level rule that matches .vue or .vue.html files.`
      )
    }
    // 处理使用 oneOf 的情况
    if (vueRule.oneOf) {
      throw new Error(
        `[VueLoaderPlugin Error] vue-loader 15 currently does not support vue rules with oneOf.`
      )
    }

    // get the normlized "use" for vue files
    const vueUse = vueRule.use
    // get vue-loader options
    // 拿到 vue-loader 的 index
    const vueLoaderUseIndex = vueUse.findIndex(u => {
      return /^vue-loader|(\/|\\|@)vue-loader/.test(u.loader) // / \ @
    })

    // 报错没使用 vue-loader
    if (vueLoaderUseIndex < 0) {
      throw new Error(
        `[VueLoaderPlugin Error] No matching use for vue-loader is found.\n` +
        `Make sure the rule matching .vue files include vue-loader in its use.`
      )
    }

    // make sure vue-loader options has a known ident so that we can share
    // options by reference in the template-loader by using a ref query like
    // template-loader??vue-loader-options
    const vueLoaderUse = vueUse[vueLoaderUseIndex] // 拿到针对 Vue 文件的 use配置项
    vueLoaderUse.ident = 'vue-loader-options' // 标记 ident
    vueLoaderUse.options = vueLoaderUse.options || {} // 处理 options 为空的情况

    // for each user rule (expect the vue rule), create a cloned rule
    // that targets the corresponding language blocks in *.vue files.
    // clone 非 vue rules
    const clonedRules = rules
      .filter(r => r !== vueRule)
      .map(cloneRule)

    // global pitcher (responsible for injecting template compiler loader & CSS
    // post loader)
    // 重头戏 注入模板和 css
    const pitcher = {
      loader: require.resolve('./loaders/pitcher'),
      resourceQuery: query => {
        const parsed = qs.parse(query.slice(1))
        return parsed.vue != null // TODO: why not !==
      },
      options: {
        cacheDirectory: vueLoaderUse.options.cacheDirectory,
        cacheIdentifier: vueLoaderUse.options.cacheIdentifier
      }
    }

    // replace original rules
    compiler.options.module.rules = [
      pitcher, // pitcher loader rule
      ...clonedRules, // 非 vue-loader rules
      ...rules // normlize 之后的 rules
    ]
  }
}

/**
 * @desc 创建匹配器
 * @param {String} fakeFile 文件名 string
 * @example
 */
function createMatcher (fakeFile) {
  // rule 是 webpack 配置中的 rule item
  return (rule, i) => {
    // #1201 we need to skip the `include` check when locating the vue rule
    const clone = Object.assign({}, rule) // clone 一份
    delete clone.include // 删除 include prop
    const normalized = RuleSet.normalizeRule(clone, {}, '')
    return (
      !rule.enforce && // 正常顺序的 loader
      normalized.resource &&
      normalized.resource(fakeFile)
    )
  }
}

/**
 * @desc clone rules
 * @param {Array} rule 配置规则
 */
function cloneRule (rule) {
  const { resource, resourceQuery } = rule
  // Assuming `test` and `resourceQuery` tests are executed in series and
  // synchronously (which is true based on RuleSet's implementation), we can
  // save the current resource being matched from `test` so that we can access
  // it in `resourceQuery`. This ensures when we use the normalized rule's
  // resource check, include/exclude are matched correctly.
  let currentResource
  const res = Object.assign({}, rule, {
    resource: {
      test: resource => {
        currentResource = resource
        return true
      }
    },
    resourceQuery: query => {
      const parsed = qs.parse(query.slice(1))
      if (parsed.vue == null) {
        return false
      }
      if (resource && parsed.lang == null) {
        return false
      }
      const fakeResourcePath = `${currentResource}.${parsed.lang}`
      if (resource && !resource(fakeResourcePath)) {
        return false
      }
      if (resourceQuery && !resourceQuery(query)) {
        return false
      }
      return true
    }
  })

  if (rule.oneOf) {
    res.oneOf = rule.oneOf.map(cloneRule)
  }

  return res
}

VueLoaderPlugin.NS = NS
module.exports = VueLoaderPlugin
