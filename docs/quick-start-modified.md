# Magentic-UI 修改后快速发布指南

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**最后更新**: 2025-10-21

## 🎯 适用场景

本指南针对你已经修改了**前端**和**后端**代码后的快速版本发布流程。基于当前Git状态分析，你已修改了：

**已修改的文件**:
- `README.md` - 项目文档
- `frontend/src/components/settings/tabs/agentSettings/modelSelector/ModelSelector.tsx` - 模型选择器组件
- `frontend/src/components/settings/tabs/agentSettings/modelSelector/modelConfigForms/OpenAIModelConfigForm.tsx` - OpenAI配置表单
- `src/magentic_ui/backend/web/routes/plans.py` - 后端API路由

**新增的文件**:
- `docs/qoder/` - Qoder相关文档
- `experiments/endpoint_configs/config_zhipuai_example.yaml` - 智谱AI配置示例
- `src/magentic_ui/providers/` - 新的提供商目录
- `tests/test_zhipuai_config.py` - 智谱AI配置测试
- `tests/test_zhipuai_integration.py` - 智谱AI集成测试

## 🚀 快速发布步骤

### 1. 代码质量检查

```bash
# 后端代码检查
poe fmt      # 格式化Python代码
poe lint     # 代码规范检查
poe test     # 运行测试

# 前端代码检查
cd frontend
npm run typecheck  # TypeScript类型检查
npm run build      # 构建前端（重要：会自动复制到后端UI目录）
cd ..
```

### 2. 版本号更新

```bash
# 更新Python版本
echo "__version__ = '1.1.0'" > src/magentic_ui/version.py

# 更新前端版本
cd frontend
npm version 1.1.0 --no-git-tag-version
cd ..
```

### 3. 提交代码

```bash
# 添加所有修改
git add .

# 提交（使用约定式提交格式）
git commit -m "feat: add zhipuai AI integration and improve model selector

- Add zhipuai AI provider support
- Update model selector UI with better UX
- Improve OpenAI configuration form
- Add comprehensive tests for zhipuai integration
- Update documentation and examples"

# 推送到远程仓库
git push origin fix-qoder  # 推送到当前分支
```

### 4. 创建发布分支

```bash
# 从当前分支创建发布分支
git checkout -b release/v1.1.0

# 推送发布分支
git push origin release/v1.1.0
```

### 5. 合并到main并打标签

```bash
# 切换到main分支
git checkout main
git pull origin main

# 合并发布分支
git merge release/v1.1.0 --no-ff

# 创建版本标签
git tag -a v1.1.0 -m "Release version 1.1.0 - Zhipuai AI Integration"

# 推送更改
git push origin main
git push origin v1.1.0

# 删除发布分支
git branch -d release/v1.1.0
git push origin --delete release/v1.1.0
```

### 6. 验证自动发布

推送标签后，GitHub Actions会自动执行：

1. **Docker镜像构建和推送**
2. **PyPI包发布**
3. **文档部署到GitHub Pages**

检查GitHub Actions页面确认所有流程成功完成。

## 📋 针对你修改内容的专项验证

### 前端修改验证

```bash
# 启动前端开发服务器
cd frontend
npm run develop

# 在浏览器中访问 http://localhost:8000
# 验证以下功能：
# 1. 模型选择器显示正常
# 2. OpenAI配置表单功能正常
# 3. 智谱AI配置选项可用（如果已实现）
```

### 后端修改验证

```bash
# 启动后端服务器
magentic-ui --port 8081 --reload

# 在另一个终端测试API
curl http://localhost:8081/api/plans  # 测试plans路由
curl http://localhost:8081/health     # 测试健康检查
```

### 智谱AI集成验证

```bash
# 设置智谱AI环境变量
export ZHIPUAI_API_KEY="your-zhipuai-api-key"

# 运行智谱AI相关测试
python -m pytest tests/test_zhipuai_config.py -v
python -m pytest tests/test_zhipuai_integration.py -v
```

## 🔧 常见问题解决

### 1. 前端构建失败

```bash
# 清理缓存重新构建
cd frontend
gatsby clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 2. 后端测试失败

```bash
# 检查智谱AI配置
cat experiments/endpoint_configs/config_zhipuai_example.yaml

# 检查环境变量
echo $ZHIPUAI_API_KEY

# 重新运行测试
poe test
```

### 3. Docker镜像构建问题

```bash
# 手动构建Docker镜像
cd docker/magentic-ui-browser-docker
./build.sh

cd ../../magentic-ui-python-env
./build.sh
```

## 📊 发布检查清单

### 必要检查项
- [ ] 后端代码质量检查通过 (`poe check`)
- [ ] 前端构建成功 (`npm run build`)
- [ ] 智谱AI集成测试通过
- [ ] 版本号已更新到 1.1.0
- [ ] CHANGELOG.md 已更新
- [ ] 所有修改已提交并推送
- [ ] 版本标签已创建并推送

### 功能验证项
- [ ] 模型选择器界面正常
- [ ] OpenAI配置表单工作正常
- [ ] 智谱AI配置可用（如果已实现）
- [ ] 后端API响应正常
- [ ] WebSocket连接正常
- [ ] 文件上传功能正常

### 发布后验证
- [ ] GitHub Actions 全部成功
- [ ] Docker镜像在 GHCR 可用
- [ ] PyPI包可安装
- [ ] 文档网站已更新
- [ ] 生产环境运行正常

## 📝 发布公告模板

```markdown
# Magentic-UI v1.1.0 发布公告

## 🎉 新功能

### 智谱AI集成
- 新增智谱AI模型支持
- 支持GLM-4、GLM-3-Turbo等模型
- 兼容OpenAI API格式

### 用户界面改进
- 优化模型选择器用户体验
- 改进OpenAI配置表单界面
- 增强配置验证机制

### 开发者体验
- 新增智谱AI集成测试
- 提供完整的配置示例
- 改进错误处理和日志

## 📦 安装和升级

### 通过pip安装
```bash
pip install magentic-ui==1.1.0
```

### 通过源码安装
```bash
git clone https://github.com/microsoft/magentic-ui.git
cd magentic-ui
git checkout v1.1.0
pip install -e .
```

### Docker部署
```bash
docker pull ghcr.io/microsoft/magentic-ui-browser:v1.1.0
docker pull ghcr.io/microsoft/magentic-ui-python-env:v1.1.0
```

## 🔧 配置智谱AI

在你的 `.env` 文件中添加：
```env
ZHIPUAI_API_KEY=your-zhipuai-api-key
ZHIPUAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

## 📚 文档

- [完整文档](https://microsoft.github.io/magentic-ui/)
- [API参考](https://microsoft.github.io/magentic-ui/api)
- [更新日志](https://microsoft.github.io/magentic-ui/changelog)

## 🐛 问题反馈

如果遇到问题，请在 [GitHub Issues](https://github.com/microsoft/magentic-ui/issues) 报告。

---

感谢所有贡献者的支持！🚀
```

## ⚡ 快速命令总结

```bash
# 完整发布流程（一键复制执行）
poe check && \
echo "__version__ = '1.1.0'" > src/magentic_ui/version.py && \
cd frontend && npm version 1.1.0 --no-git-tag-version && npm run build && cd .. && \
git add . && \
git commit -m "feat: add zhipuai AI integration v1.1.0" && \
git push origin fix-qoder && \
git checkout -b release/v1.1.0 && \
git push origin release/v1.1.0 && \
git checkout main && git pull origin main && \
git merge release/v1.1.0 --no-ff && \
git tag -a v1.1.0 -m "Release version 1.1.0" && \
git push origin main && git push origin v1.1.0 && \
git branch -d release/v1.1.0 && \
git push origin --delete release/v1.1.0
```

---

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**适用版本**: v1.1.0（基于当前修改）