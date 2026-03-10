# GitHub 中文 UI 扩展

Chrome / Edge 扩展，将 GitHub 网页界面中的英文文案汉化为中文（Manifest V3）。

## 构建

```bash
npm install
npm run build
```

产物在 `dist/` 目录。

## 加载到 Chrome

1. 打开 `chrome://extensions`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择项目下的 `dist` 目录

## 使用

在 GitHub 任意页面点击扩展图标，通过开关启用/禁用汉化。
