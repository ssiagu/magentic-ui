# Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **平台:** Vercel / Netlify / 自定义服务器
- **构建命令:** `npm run build`
- **输出目录:** `frontend/build`
- **CDN/边缘:** Vercel Edge Network / Cloudflare

**Backend Deployment:**
- **平台:** Docker容器 + 云服务 (AWS/Azure/GCP)
- **构建命令:** `pip install -e .`
- **部署方法:** Docker Compose / Kubernetes

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -e .
          pip install pytest pytest-cov

      - name: Run tests
        run: pytest tests/ --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run tests
        working-directory: ./frontend
        run: npm test -- --coverage --watchAll=false

      - name: Build
        working-directory: ./frontend
        run: npm run build

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          # 部署脚本
          echo "Deploying to production..."
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| Development | http://localhost:3000 | http://localhost:8000 | 本地开发 |
| Staging | https://staging.magentic-ui.com | https://api-staging.magentic-ui.com | 预生产测试 |
| Production | https://app.magentic-ui.com | https://api.magentic-ui.com | 生产环境 |
