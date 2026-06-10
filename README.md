# 宗门模拟器网页试玩原型

这是一个 AI-native 纯数值驱动宗门模拟游戏原型。玩家每年输入一条宗主谕令，系统将其解析为隐藏姿态，规则系统结算数值，再根据事实边界生成年报。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

打开 `http://127.0.0.1:8787`。

默认联网 AI 配置使用 DeepSeek：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
OPENAI_MODEL=deepseek-v4-pro
```

在本地 `.env` 中填入 `DEEPSEEK_API_KEY` 后即可测试真实联网 AI。不要把 `.env` 提交到仓库。

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

`DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` 只允许保存在 `.env` 或部署平台密钥配置中。前端代码、提交历史、年报文本和调试输出都不得包含 API Key。
