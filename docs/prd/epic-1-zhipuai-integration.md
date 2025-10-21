# 史诗: 智谱AI集成 - Brownfield Enhancement

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**Epic ID**: epic-1
**创建日期**: 2025-10-21
**状态**: Ready for Review

## 史诗目标

为Magentic-UI平台集成智谱AI模型提供商，实现OpenAI与智谱AI的无缝切换，提供用户前端配置base_url和模型选择的能力，以最小的代码改动增强系统的AI模型选择灵活性。

## 现有系统上下文

**当前相关功能:**
- 系统已集成OpenAI API作为主要的AI模型提供商
- 已有ModelClientFactory支持多提供商架构设计
- 现有前端采用React + TypeScript + Ant Design
- 已实现ModelClientConfigs数据模型用于管理不同智能体的模型配置

**技术栈:**
- 后端: FastAPI + SQLModel + Python 3.12
- 前端: React/Gatsby + TypeScript + Ant Design
- AI SDK: OpenAI Python SDK 1.0+
- 架构: 已有的多提供商模型客户端抽象层

**集成点:**
- `src/magentic_ui/backend/`: 模型客户端工厂和配置管理
- `frontend/src/components/`: AI配置界面组件
- `docs/architecture.md`: 架构文档中的OpenAI集成层
- 数据库: ModelClientConfigs表存储AI提供商配置

## 增强详情

**添加/更改内容:**
1. 扩展现有的ZhipuAIModelClient实现，确保与智谱AI API完全兼容
2. 在前端添加模型提供商选择界面，支持用户配置base_url和选择智谱AI模型
3. 更新ModelClientConfigs以支持智谱AI特定的配置参数
4. 实现前端向后端的配置同步机制

**集成方式:**
- 利用现有的ModelClientFactory工厂模式
- 扩展现有的AI配置UI组件，而非创建新界面
- 保持现有API接口兼容性，仅增加智谱AI相关配置选项
- 使用现有的OpenAI Python SDK连接智谱AI的OpenAI兼容接口

**成功标准:**
- 用户可以在前端界面选择OpenAI或智谱AI作为模型提供商
- 支持手动配置智谱AI的base_url (`https://open.bigmodel.cn/api/paas/v4/`)
- 用户可以从智谱AI模型列表中选择可用模型（glm-4.6, glm-4.5-air等）
- 配置变更能够实时生效，无需重启服务
- 现有OpenAI功能保持完全兼容和可用

## 用户故事

1. **Story 1**: 扩展智谱AI模型客户端实现 - 完善后端ZhipuAIModelClient，确保完整支持智谱AI的OpenAI兼容API
2. **Story 2**: 前端模型提供商配置界面 - 在现有设置页面添加提供商选择和模型配置功能
3. **Story 3**: 配置同步与验证机制 - 实现前后端配置同步和连通性测试功能

## 兼容性要求

- [x] 现有OpenAI APIs保持不变
- [x] 数据库schema变更向后兼容（仅新增字段）
- [x] UI变更遵循现有Ant Design设计模式
- [x] 性能影响最小（配置变更不影响现有API调用性能）

## 风险缓解

**主要风险**: 智谱AI API的细微差异可能影响现有功能
**缓解措施**:
- 在非生产环境中充分测试所有智谱AI模型调用场景
- 实现配置回滚机制，允许用户快速切换回OpenAI
- 添加详细的错误日志和用户友好的错误提示

**回滚计划**:
- 前端提供"重置为OpenAI"配置按钮
- 后端保留默认OpenAI配置作为安全回退选项
- 数据库备份现有的ModelClientConfigs配置

## 完成定义

- [ ] 所有用户故事完成并满足验收标准
- [ ] 现有OpenAI功能通过回归测试验证
- [ ] 智谱AI集成功能通过端到端测试
- [ ] 配置界面用户接受度测试通过
- [ ] 架构文档更新包含智谱AI集成说明
- [ ] 用户使用文档和故障排除指南完成

## 验证检查清单

**范围验证:**

- [x] 史诗可在1-3个故事内完成
- [x] 无需重大架构文档更新
- [x] 增强功能遵循现有模式
- [x] 集成复杂度可控

**风险评估:**

- [x] 对现有系统风险较低
- [x] 回滚计划可行
- [x] 测试方法覆盖现有功能
- [x] 团队对集成点有充分了解

**完整性检查:**

- [x] 史诗目标清晰且可实现
- [x] 用户故事范围适当
- [x] 成功标准可衡量
- [x] 依赖关系已识别

## Story Manager交接

**Story Manager交接:**

"请为这个brownfield epic开发详细的用户故事。关键考虑事项：

- 这是对现有运行{{Python + FastAPI + React}}系统的增强
- 集成点: ModelClientFactory, ModelClientConfigs数据模型, 前端设置页面
- 需遵循的现有模式: 工厂模式创建模型客户端, Ant Design UI组件, RESTful API设计
- 关键兼容性要求: 保持OpenAI现有功能完全可用, 数据库变更向后兼容
- 每个用户故事必须包含验证现有功能保持完整的测试

该史诗应在维护系统完整性的同时，实现{{智谱AI无缝集成，提供模型提供商选择灵活性}}。"

---

## 成功标准

史诗创建成功时：

1. 增强范围清晰定义且大小适当
2. 集成方式尊重现有系统架构
3. 对现有功能的风险最小化
4. 用户故事逻辑排序以实现安全实施
5. 兼容性要求明确指定
6. 回滚计划可行且已文档化

## 重要说明

- 此任务专门用于小型brownfield增强
- 如果范围增长超过3个用户故事，考虑完整的brownfield PRD流程
- 始终优先考虑现有系统完整性而非新功能
- 当不确定范围或复杂性时，升级到完整的brownfield规划

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**最后更新**: 2025-10-21