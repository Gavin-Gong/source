#flow

## loader

### loader 原理

1. 拿到 loaderContext

### loader 流程

## plugin

### plugin 原理

### vue-loader 中 plugin 流程

`vue-loader` 并不只是 `loader` 里面还包含了一个 `plugin`, 通过这个 `plugin` 来注入一个 `pitcher loader`, 细节按下不表, 其核心思路是利用 `plugin` 拿到 match `vue` 文件的 `rule`, 然后往其中注入 `pitcher loader`, 达到修改 `rule`的目的.

1. 标记一下已经加载了 plugin
2. 拿到 webpack 配置的 rules, 然后 RuleSet 格式化一波
3. 拿到 vue-loader 的 options
4. clone 非 vue-loader rule, 然后混入 pitcher loader 得到一个崭新的配置

## pitcher

一般来讲 loader 是从右往左的顺序运行的, 如果你了解函数式编程的话, 你可能会想起 `compose` 函数. 但是并非所有的执行都会按照套路出牌. 在 loader 上可能会有一个 `pitch` 函数会导致出现 loader 跳跃执行的情况. 实际在运行 loader 的时候是会从左到右先运行一一遍 loader 上的 `pitch` 函数, 然后再从右到左运行 loader 本体函数.

以下是带 pitch 的 loader

```js
module.export = function(src) {
  // loader logic
};

module.export.pitch = function() {
  // pitch logic
};
```

如果我们这样配置 loader 的话

```js
use: ["a-loader", "b-loader", "c-loader"];
```

就会按照下面的顺序执行

1. a-loader -> pitch
2. b-loader -> pitch
3. c-loader -> pitch
4. c-loader
5. b-loader
6. a-loader

但是, 一旦某个 pitch 函数在 return 了数据的话, 就会产生跃迁的效果. 假设 b-loader 的 pitch 函数返回了数据, 那么执行的效果是这样的

1. a-loader -> pitch
2. b-loader -> pitch
3. a-loader

另外一 loader 配置的位置属性也会影响其执行顺序

> Pitching phase: the pitch method on loaders is called in the order post, inline, normal, pre. See Pitching Loader for details.
> Normal phase: the normal method on loaders is executed in the order pre, normal, inline, post. Transformation on the source code of a module happens in this phase.

## hot module replacement (HMR)

前端开发过程中, 为了快速看到效果的操作经历了以下几个历史阶段:

1. 修改后 -> 手动刷新查看
2. 修改后 -> 利用 browser-sync 之类的工具监听文件变化, 重新载入页面 -> 刷新整个网页
3. 修改后 -> 利用 HMR 注入修改后的代码 -> 局部更新网页, 保留其他状态

### 运用 HMR

首先需要在 webpack 配置中开启该插件以及配置 `dev server`

```js
devServer: {
  hot: true,
  //...
}
plugins: {
  // ...
  new webpack.HotModuleReplacementPlugin()
}
```

然后在实际代码中

```js
if (module.hot) {
  module.hot.accept("xx.js", () => {
    // 当代码更新之后 我应该做点什么
  });
}
```

另外, 对于更新样式代码是比较黑箱的, `style-loader` 会在后台调用 `module.hot.accept`, 所以我们并不需要插入额外的逻辑到 css 文件中.

## ref

- https://webpack.js.org/api/loaders/#pitching-loader

- https://webpack.docschina.org/api/loaders/#%E8%B6%8A%E8%BF%87-loader-pitching-loader-

- https://webpack.docschina.org/concepts/hot-module-replacement/
