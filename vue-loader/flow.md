#flow

## loader

1. 拿到 loaderContext

## plugin

1. 标记一下已经加载了 plugin
2. 拿到 webpack 配置的 rules, 然后 RuleSet 格式化一波
3. 拿到 vue-loader 的 options
4. clone 非 vue-loader rule, 然后混入 pitcher loader 得到一个崭新的配置
