# API Specification

### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Magentic-UI API
  version: 1.0.0
  description: 多智能体人机协作Web自动化平台API
servers:
  - url: http://localhost:8000
    description: 本地开发服务器
  - url: https://api.magentic-ui.com
    description: 生产服务器

paths:
  /api/runs:
    get:
      summary: 获取运行列表
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
        - name: status
          in: query
          schema:
            type: string
            enum: [running, completed, failed]
      responses:
        '200':
          description: 成功返回运行列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  runs:
                    type: array
                    items:
                      $ref: '#/components/schemas/Run'
                  total:
                    type: integer

    post:
      summary: 创建新运行
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                task:
                  type: string
                session_id:
                  type: string
                config:
                  $ref: '#/components/schemas/RunConfig'
      responses:
        '201':
          description: 成功创建运行
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Run'

  /api/runs/{run_id}:
    get:
      summary: 获取特定运行详情
      parameters:
        - name: run_id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功返回运行详情
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Run'

  /api/sessions:
    get:
      summary: 获取会话列表
      responses:
        '200':
          description: 成功返回会话列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessions:
                    type: array
                    items:
                      $ref: '#/components/schemas/Session'

    post:
      summary: 创建新会话
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                config:
                  $ref: '#/components/schemas/SessionConfig'
      responses:
        '201':
          description: 成功创建会话
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Session'

  /api/settings:
    get:
      summary: 获取系统设置
      responses:
        '200':
          description: 成功返回设置
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Settings'

    put:
      summary: 更新系统设置
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                model_client_configs:
                  $ref: '#/components/schemas/ModelClientConfigs'
                mcp_agent_configs:
                  type: array
                  items:
                    $ref: '#/components/schemas/McpAgentConfig'
      responses:
        '200':
          description: 成功更新设置
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Settings'

components:
  schemas:
    Run:
      type: object
      properties:
        id:
          type: string
          format: uuid
        session_id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        task:
          type: string
        status:
          type: string
          enum: [running, completed, failed]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        config:
          $ref: '#/components/schemas/RunConfig'
        result:
          $ref: '#/components/schemas/RunResult'

    Session:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        title:
          type: string
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        config:
          $ref: '#/components/schemas/SessionConfig'

    Settings:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        key:
          type: string
        value:
          type: object
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    RunConfig:
      type: object
      properties:
        model_client_configs:
          $ref: '#/components/schemas/ModelClientConfigs'
        mcp_agent_configs:
          type: array
          items:
            $ref: '#/components/schemas/McpAgentConfig'
        cooperative_planning:
          type: boolean
        autonomous_execution:
          type: boolean
        max_turns:
          type: integer
        approval_policy:
          type: string
          enum: [always, never, auto-conservative, auto-permissive]

    ModelClientConfigs:
      type: object
      properties:
        orchestrator:
          type: object
        web_surfer:
          type: object
        coder:
          type: object
        file_surfer:
          type: object
        action_guard:
          type: object

    McpAgentConfig:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        mcp_servers:
          type: array
          items:
            type: object
            properties:
              server_name:
                type: string
              command:
                type: array
                items:
                  type: string
              args:
                type: array
                items:
                  type: string
              env:
                type: object
```
