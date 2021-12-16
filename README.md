# fc2koa

fc2koa 可以便捷的在 Aliyun 的 Serverless 中跑 koa 应用，目前暂仅支持 HTTP 触发器。

## 安装

```bash
npm install fc2koa
```

## 使用

```js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello fc2koa!';
});

exports.handler = fc2koa(app);
```