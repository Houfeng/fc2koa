# fc2koa

fc2koa 可以便捷的在 Aliyun 的 Serverless 中跑 koa 应用，目前暂仅支持 HTTP 触发器。

## 安装

```bash
npm install fc2koa --save
```

## 使用

通过 fc2koa 在 Aliyun Serverless 的函数中使用 koa 示例

```js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello fc2koa!';
});

exports.handler = fc2koa(app);
```