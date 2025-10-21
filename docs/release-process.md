# Magentic-UI 版本发布流程

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**最后更新**: 2025-10-21

## 📋 目录

1. [版本管理策略](#版本管理策略)
2. [发布类型和周期](#发布类型和周期)
3. [发布前准备](#发布前准备)
4. [标准发布流程](#标准发布流程)
5. [紧急发布流程](#紧急发布流程)
6. [发布后验证](#发布后验证)
7. [回滚流程](#回滚流程)
8. [发布检查清单](#发布检查清单)

## 🎯 版本管理策略

### 语义化版本控制

Magentic-UI 使用 [语义化版本控制](https://semver.org/lang/zh-CN/) (Semantic Versioning)：

**版本格式**: `MAJOR.MINOR.PATCH`

- **MAJOR (主版本号)**: 不兼容的API修改
- **MINOR (次版本号)**: 向下兼容的功能性新增
- **PATCH (修订号)**: 向下兼容的问题修正

**示例**:
- `1.0.0` → `1.1.0` (新增功能)
- `1.1.0` → `1.1.1` (修复bug)
- `1.1.1` → `2.0.0` (重大更新，不兼容变更)

### 分支策略

```
main (生产分支)
├── develop (开发分支)
├── feature/* (功能分支)
├── release/* (发布分支)
└── hotfix/* (热修复分支)
```

**分支说明**:
- `main`: 生产环境代码，只包含稳定的发布版本
- `develop`: 开发环境代码，集成最新的功能
- `feature/*`: 新功能开发分支
- `release/*`: 发布准备分支
- `hotfix/*`: 紧急修复分支

## 📅 发布类型和周期

### 发布类型

#### 1. 主版本发布 (Major Release)
- **频率**: 每年1-2次
- **内容**: 重大架构更新、不兼容的API变更
- **准备时间**: 至少2-3个月
- **影响**: 需要用户手动迁移

#### 2. 次版本发布 (Minor Release)
- **频率**: 每月1-2次
- **内容**: 新功能、重要改进
- **准备时间**: 2-4周
- **影响**: 向下兼容，无需迁移

#### 3. 修订版本发布 (Patch Release)
- **频率**: 根据需要（通常每周）
- **内容**: Bug修复、安全更新
- **准备时间**: 1-3天
- **影响**: 仅修复问题，无功能变更

### 发布周期示例

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  v1.0.0     │    │  v1.1.0     │    │  v1.2.0     │
│  Major      │    │  Minor      │    │  Minor      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ├─ v1.0.1 (Patch)   ├─ v1.1.1 (Patch)   ├─ v1.2.1 (Patch)
       ├─ v1.0.2 (Patch)   ├─ v1.1.2 (Patch)   └─ v1.2.2 (Patch)
       └─ v1.0.3 (Patch)
```

## 🛠️ 发布前准备

### 1. 功能完整性检查

#### 代码质量检查
```bash
# 后端代码检查
poe check  # 运行所有检查（格式化、lint、类型检查、测试）

# 前端代码检查
cd frontend
npm run typecheck
npm run build  # 确保构建成功
npm test       # 运行测试（如果有）

# 端到端测试
pytest tests/e2e/
```

#### 文档更新检查
- [ ] API文档是否最新
- [ ] README.md是否更新
- [ ] CHANGELOG.md是否更新
- [ ] 架构文档是否同步更新
- [ ] 用户手册是否需要更新

### 2. 版本号更新

#### Python版本更新
```python
# src/magentic_ui/version.py
__version__ = "1.2.3"
```

#### 前端版本更新
```json
// frontend/package.json
{
  "version": "1.2.3"
}
```

#### 依赖项版本检查
```bash
# 检查过时的依赖
pip list --outdated
npm outdated

# 更新依赖（谨慎操作）
pip install --upgrade package-name
npm update package-name
```

### 3. CHANGELOG更新

```markdown
# CHANGELOG.md

## [Unreleased]

### Added
- 新功能描述

### Changed
- 变更描述

### Deprecated
- 废弃功能描述

### Removed
- 移除功能描述

### Fixed
- 修复的问题

### Security
- 安全修复

---

## [1.2.3] - 2025-10-21

### Added
- 新增智谱AI模型支持
- 添加文件上传功能
- 支持自定义MCP服务器

### Fixed
- 修复模型选择器显示问题
- 解决WebSocket连接稳定性问题
- 修复内存泄漏问题

### Changed
- 优化前端构建性能
- 更新OpenAI SDK到最新版本
- 改进错误处理机制

### Security
- 更新依赖项以修复安全漏洞
```

## 🚀 标准发布流程

### 步骤1: 创建发布分支

```bash
# 从develop分支创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/v1.2.3

# 如果没有develop分支，从main创建
git checkout main
git pull origin main
git checkout -b release/v1.2.3
```

### 步骤2: 发布准备

```bash
# 更新版本号
echo "__version__ = '1.2.3'" > src/magentic_ui/version.py
cd frontend && npm version 1.2.3 --no-git-tag-version && cd ..

# 更新CHANGELOG
# 编辑 CHANGELOG.md，将 [Unreleased] 部分移动到版本号下

# 提交版本更新
git add .
git commit -m "chore: prepare for v1.2.3 release"
```

### 步骤3: 最终测试

```bash
# 运行完整测试套件
poe test

# 构建前端
cd frontend && npm run build && cd ..

# 本地集成测试
python -m magentic_ui.backend.web.app --port 8081 &
# 测试各个功能模块
kill %1

# Docker集成测试
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 步骤4: 代码审查和合并

```bash
# 推送发布分支
git push origin release/v1.2.3

# 创建Pull Request
# 在GitHub上创建 PR: release/v1.2.3 -> main
# 等待代码审查通过

# 合并到main分支
git checkout main
git pull origin main
git merge release/v1.2.3 --no-ff
git tag -a v1.2.3 -m "Release version 1.2.3"

# 合并回develop分支（如果存在）
git checkout develop
git pull origin develop
git merge release/v1.2.3 --no-ff
```

### 步骤5: 推送和触发发布

```bash
# 推送所有更改
git push origin main
git push origin develop
git push origin v1.2.3

# 删除发布分支
git branch -d release/v1.2.3
git push origin --delete release/v1.2.3
```

### 步骤6: 自动化发布

推送标签后，GitHub Actions会自动执行以下操作：

1. **构建Docker镜像**
   ```yaml
   # .github/workflows/docker-build-push.yml
   name: Build and Push Docker Images
   on:
     push:
       tags:
         - 'v*'
   ```

2. **发布到PyPI**
   ```yaml
   # .github/workflows/publish-pypi.yml
   name: Publish to PyPI
   on:
     push:
       tags:
         - 'v*'
   ```

3. **部署文档**
   ```yaml
   # .github/workflows/deploy-docs.yml
   name: Deploy Documentation
   on:
     push:
       tags:
         - 'v*'
   ```

## 🚨 紧急发布流程

### 触发条件

- 生产环境出现严重安全漏洞
- 核心功能失效影响大量用户
- 数据损坏或丢失风险
- 性能问题导致服务不可用

### 紧急发布步骤

```bash
# 1. 从main分支创建hotfix分支
git checkout main
git pull origin main
git checkout -b hotfix/v1.2.4-fix-critical-bug

# 2. 修复问题
# ... 修改代码 ...

# 3. 测试修复
poe test
# 运行针对性测试

# 4. 提交修复
git add .
git commit -m "fix: critical security vulnerability in model validation"

# 5. 直接合并到main并打标签
git checkout main
git merge hotfix/v1.2.4-fix-critical-bug
git tag -a v1.2.4 -m "Hotfix: critical security fix"

# 6. 推送发布
git push origin main
git push origin v1.2.4

# 7. 合并回develop分支（如果存在）
git checkout develop
git pull origin develop
git merge hotfix/v1.2.4-fix-critical-bug
git push origin develop

# 8. 清理分支
git branch -d hotfix/v1.2.4-fix-critical-bug
git push origin --delete hotfix/v1.2.4-fix-critical-bug
```

### 紧急发布通知

```bash
# 1. 立即通知团队
# 发送紧急邮件/Slack通知

# 2. 更新CHANGELOG
echo "## [1.2.4] - $(date +%Y-%m-%d)
### Security
- Critical security vulnerability fix in model validation" >> CHANGELOG.md

# 3. 发布安全公告
# 在GitHub Releases中创建安全公告
# 发送用户通知邮件
```

## ✅ 发布后验证

### 1. 自动化验证检查

```bash
# 检查Docker镜像是否成功构建
docker pull ghcr.io/microsoft/magentic-ui-browser:v1.2.3
docker pull ghcr.io/microsoft/magentic-ui-python-env:v1.2.3

# 检查PyPI包是否发布成功
pip install magentic-ui==1.2.3

# 检查文档是否更新
curl -I https://microsoft.github.io/magentic-ui/
```

### 2. 功能验证清单

#### 基础功能测试
- [ ] 应用启动正常
- [ ] 用户界面加载完整
- [ ] API接口响应正常
- [ ] 数据库连接正常
- [ ] WebSocket连接正常

#### 核心功能测试
- [ ] 智能体创建和执行
- [ ] 模型切换功能
- [ ] 文件上传功能
- [ ] MCP服务器集成
- [ ] 实时消息传递

#### 集成测试
- [ ] OpenAI API调用
- [ ] 智谱AI API调用（如果启用）
- [ ] Docker容器通信
- [ ] 浏览器自动化功能
- [ ] 代码执行环境

### 3. 性能监控

```bash
# 监控关键指标
# - 响应时间
# - 内存使用
# - CPU使用率
# - 错误率
# - 用户活跃度

# 设置告警
# 如果指标异常，立即通知团队
```

### 4. 用户反馈收集

```bash
# 1. 监控GitHub Issues
# 2. 查看用户讨论和反馈
# 3. 检查社区论坛
# 4. 分析使用统计数据

# 记录反馈并分配优先级
# 计划下一个版本改进
```

## 🔄 回滚流程

### 回滚触发条件

- 发布后发现严重bug
- 性能显著下降
- 安全问题未完全解决
- 用户投诉激增

### 回滚步骤

#### 1. 快速回滚（Docker环境）

```bash
# 回滚到上一个稳定版本
docker-compose down
docker pull ghcr.io/microsoft/magentic-ui-browser:v1.2.2
docker pull ghcr.io/microsoft/magentic-ui-python-env:v1.2.2

# 更新docker-compose.yml中的镜像版本
# 重新启动服务
docker-compose up -d
```

#### 2. 代码回滚

```bash
# 1. 创建回滚分支
git checkout main
git pull origin main
git checkout -b rollback/v1.2.4

# 2. 回滚到上一个稳定标签
git revert v1.2.3  # 创建反向提交
git tag -a v1.2.4 -m "Rollback to v1.2.2 due to critical issues"

# 3. 推送回滚
git push origin main
git push origin v1.2.4

# 4. 触发新版本发布
# GitHub Actions会自动构建和推送v1.2.4
```

#### 3. 数据库回滚（如需要）

```bash
# 如果发布了数据库迁移，需要回滚数据库
alembic downgrade -1  # 回滚上一个迁移

# 或者回滚到特定版本
alembic downgrade <revision_hash>
```

### 回滚后通知

```markdown
# 发布回滚公告

## 🚨 紧急回滚通知

**版本**: v1.2.4
**回滚原因**: 发现严重性能问题
**回滚到**: v1.2.2

**影响用户**: 所有用户
**预计修复时间**: 24-48小时

**临时解决方案**:
- 继续使用v1.2.2版本
- 避免使用受影响的功能

我们对此造成的不便深表歉意，正在紧急修复问题。
```

## 📝 发布检查清单

### 发布前检查 (Pre-Release)

#### 代码质量
- [ ] 所有测试通过 (`poe test`)
- [ ] 代码格式化完成 (`poe fmt`)
- [ ] 代码检查通过 (`poe lint`)
- [ ] 类型检查通过 (`poe pyright`)
- [ ] 前端构建成功 (`npm run build`)

#### 版本管理
- [ ] 版本号已更新
- [ ] CHANGELOG已更新
- [ ] 版本标签已创建
- [ ] 发布分支已创建

#### 文档更新
- [ ] README.md已更新
- [ ] API文档已同步
- [ ] 架构文档已更新
- [ ] 用户手册已更新
- [ ] 迁移指南已准备（如需要）

#### 测试验证
- [ ] 单元测试全部通过
- [ ] 集成测试全部通过
- [ ] 端到端测试全部通过
- [ ] 性能测试通过
- [ ] 安全测试通过

#### 发布准备
- [ ] 发布公告已准备
- [ ] 用户通知已准备
- [ ] 监控告警已配置
- [ ] 回滚计划已准备

### 发布中检查 (During Release)

#### 构建和部署
- [ ] Docker镜像构建成功
- [ ] PyPI包发布成功
- [ ] 文档部署成功
- [ ] 所有环境更新完成

#### 验证测试
- [ ] 生产环境启动正常
- [ ] 核心功能验证通过
- [ ] 性能指标正常
- [ ] 监控系统正常

### 发布后检查 (Post-Release)

#### 监控和反馈
- [ ] 错误监控正常
- [ ] 性能监控正常
- [ ] 用户反馈收集
- [ ] 问题跟踪和处理

#### 清理工作
- [ ] 发布分支已删除
- [ ] 临时文件已清理
- [ ] 发布记录已归档
- [ ] 团队通知已发送

#### 后续计划
- [ ] 收集用户反馈
- [ ] 分析发布数据
- [ ] 计划下一个版本
- [ ] 更新发布流程文档

---

**注意**: 此流程文档会根据项目发展持续优化和完善。如发现问题或有改进建议，请及时反馈给项目维护者。

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu