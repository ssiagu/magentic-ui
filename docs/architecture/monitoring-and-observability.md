# Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** 内置错误监控 + 性能指标收集
- **Backend Monitoring:** 结构化日志 + 请求追踪 + 性能指标
- **Error Tracking**: 统一错误处理 + 错误分类 + 错误告警
- **Performance Monitoring**: 响应时间监控 + 资源使用监控 + 数据库性能监控

### Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript错误数量和类型
- API响应时间分布
- 用户交互响应时间
- 页面加载时间
- 内存使用情况

**Backend Metrics:**
- 请求速率 (RPM)
- 错误率 (按错误类型分类)
- API响应时间 (P50, P95, P99)
- 数据库查询性能
- WebSocket连接数
- 智能体执行时间
- OpenAI API调用次数和成本
- Docker容器资源使用

### Log Format

**Structured Log Format:**
```json
{
  "timestamp": "2023-12-01T10:30:00.123Z",
  "level": "INFO",
  "logger": "magentic_ui.backend.teammanager",
  "message": "Task execution started",
  "context": {
    "request_id": "req_123456789",
    "session_id": "sess_abc123",
    "run_id": "run_def456",
    "user_id": "user_789",
    "agent": "web_surfer",
    "task_type": "web_automation"
  },
  "metrics": {
    "duration_ms": 1500,
    "tokens_used": 250,
    "api_calls": 3
  },
  "trace_id": "trace_456789",
  "span_id": "span_123456"
}
```
