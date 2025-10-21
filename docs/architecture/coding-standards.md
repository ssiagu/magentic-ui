# Coding Standards

### Critical Fullstack Rules

- **类型安全优先**: 前端必须使用TypeScript，后端使用Pydantic进行数据验证
- **API一致性**: 所有API响应必须遵循统一的格式规范，包含错误处理结构
- **异步操作**: 所有I/O操作必须使用async/await模式，避免阻塞操作
- **错误处理**: 每个API端点必须有适当的错误处理和用户友好的错误消息
- **安全性验证**: 所有用户输入必须经过验证和清理，防止注入攻击
- **环境隔离**: 绝不在代码中硬编码敏感信息，必须使用环境变量
- **资源管理**: 所有资源（数据库连接、文件句柄、WebSocket连接）必须有适当的清理机制
- **测试覆盖**: 新功能必须包含相应的单元测试和集成测试
- **文档更新**: API变更必须同步更新OpenAPI规范和前端类型定义
- **容器化原则**: 所有依赖必须在Dockerfile中明确定义，确保环境一致性

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |
| Functions | camelCase | snake_case | `getUserData()` / `get_user_data()` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Files | kebab-case | snake_case | `user-service.ts` / `user_service.py` |
| Classes | PascalCase | PascalCase | `UserService` / `UserService` |
