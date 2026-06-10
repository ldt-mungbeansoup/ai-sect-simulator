# 宗门模拟器网页试玩原型

这是一个 AI-native 纯数值驱动宗门模拟游戏原型。玩家每年输入一条宗主谕令，系统将其解析为隐藏姿态，规则系统结算数值，再根据事实边界生成年报。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

打开 `http://127.0.0.1:8787`。

## 测试模式

没有 AI Key 时，可以用测试模式验证界面和规则闭环：

```bash
AI_TEST_MODE=true npm run dev
```

测试模式只用于开发验证，不代表正式联网 AI 体验。

## 验证

```bash
npm test
npm run typecheck
npm run build
```

## 密钥安全

`OPENAI_API_KEY` 只允许保存在 `.env` 或部署平台密钥配置中。前端代码、提交历史、年报文本和调试输出都不得包含 API Key。
