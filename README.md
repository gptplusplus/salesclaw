# SalesClaw - 医药销售 AI 认知决策平台

[![Backend Tests](https://img.shields.io/badge/backend%20tests-119%20passed-brightgreen)](backend/tests)
[![Backend Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)](backend/tests)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-6%20passed-brightgreen)](frontend/src/__tests__)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

SalesClaw 是一个面向医药销售领域的 AI 认知决策平台，构建从感知→推理→规划→执行→学习的完整认知闭环。

系统定位为"AI决策中枢"，不处理数据录入，数据由 ERP/CRM/工作协同系统提供，专注于**分析、推理、决策**。

SalesClaw DEMO, 展示如何使用 SalesClaw 进行智能决策，真实业务基于OpenClaw实现。

## ✨ 核心特性

### 1. 本体驱动的领域建模

- **5 大领域本体**：收入目标管理、客户管理、费用管理、医学事务、合规管理
- **统一对象模型**：所有业务实体统一为 `OntologyObject`，通过 `objectType` 区分
- **知识图谱**：对象间通过语义关系（WORKS_AT、PRESCRIBES、INFLUENCES 等）建立连接
- **业务公理**：业务规则约束

### 2. 11 种推理引擎

| 推理类型 | 端点 | 功能 |
|---------|------|------|
| 因果推理 | `/api/reasoning/causal` | 分析对象间因果关系链 |
| 时序推理 | `/api/reasoning/temporal` | 分析时间序列趋势变化 |
| 一致性校验 | `/api/reasoning/validate` | 检测数据不一致和异常值 |
| 隐式关系挖掘 | `/api/reasoning/implicit-relations` | 发现未显式定义的关系 |
| 溯因/类比/反事实/层次/多步/约束检查/协调推理 | - | 完整认知推理能力 |

### 3. 实时智能感知与建议

| 功能 | 端点 | 说明 |
|------|------|------|
| 感知分析 | `POST /api/perception/run` | 基于数据库实时数据生成实体感知（异常检测/风险评分/忠诚度） |
| 主动建议 | `GET /api/suggestions/` | 基于处方量、目标达成率生成主动优化建议 |
| 数据洞察 | `GET /api/insights/` | 基于数据模式生成群体洞察（高影响力医生、低处方量群体等） |

### 4. Agent 执行闭环

- **8 种工具**：`get_customer_context`、`get_compliance_risks`、`get_sales_target_status`、`execute_action`、`create_visit_record`、`update_doctor_sentiment`、`flag_compliance_risk`、`send_notification`
- **执行日志**：所有 Agent 动作记录到 `execution_logs` 表，可追溯审计
- **审批流程**：pending → approved → executed，状态全生命周期管理

### 5. 智能交互

- **聊天 AI**：数据上下文 + OpenAI API 兼容接口
- **WebSocket 实时推送**：`/api/ws/{user_id}` 支持风险预警、动作状态变化、提醒更新
- **断线重连**：指数退避自动重连（最多 3 次），连接状态可视化

<br />


## 🚀 快速开始

### 环境要求

- Python 3.11+
- Node.js 20+
- SQLite（内置）

### 1. 克隆项目

```bash
git clone <repository-url>
cd salesclaw
```

### 2. 后端启动

```bash
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件设置 SECRET_KEY 等

# 启动服务
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 <http://localhost:8000> 启动，API 文档访问 <http://localhost:8000/docs>

### 3. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 <http://localhost:5173> 启动

### 4. 桌面应用打包（macOS）

```bash
cd frontend

# 先构建前端
npm run build

# 打包 macOS 应用
npx tauri build
```

产物位置：
- DMG 安装包：`frontend/src-tauri/target/release/bundle/dmg/SalesClaw_*.dmg`
- App 目录：`frontend/src-tauri/target/release/bundle/macos/SalesClaw.app`


## 📁 项目结构

```
salesclaw/
├── backend/                    # FastAPI 后端
│   ├── models/                # SQLAlchemy 模型
│   │   ├── ontology.py        # 本体核心模型
│   │   ├── domain.py          # 领域模型（Doctor/Hospital/Product 等）
│   │   ├── inference.py       # 推理规则与结果
│   │   ├── execution.py       # 执行日志（新增）
│   │   └── ...
│   ├── routers/               # API 路由
│   │   ├── ontology.py        # 本体对象 CRUD
│   │   ├── reasoning.py       # 推理引擎 API
│   │   ├── perception.py      # 感知分析 API
│   │   ├── suggestions.py     # 主动建议 API
│   │   ├── insights.py        # 数据洞察 API
│   │   ├── actions.py         # 动作审批/执行 API
│   │   ├── effects.py         # 决策效果追踪
│   │   └── ...
│   ├── services/              # 业务逻辑层
│   │   ├── ontology_service.py
│   │   ├── reasoning_service.py
│   │   ├── action_service.py  # 动作服务（含执行日志）
│   │   └── ...
│   ├── agents/                # Agent 框架
│   │   ├── cognitive_graph.py # LangGraph 认知图谱
│   │   ├── tools.py           # Agent 工具集
│   │   └── state.py           # Agent 状态定义
│   ├── schemas/               # Pydantic 模型
│   ├── tests/                 # 测试（119 个，覆盖率 92%）
│   ├── seed.py                # 演示数据初始化
│   ├── main.py                # FastAPI 应用入口
│   └── requirements.txt
│
├── frontend/                   # React + TypeScript 前端
│   ├── src/
│   │   ├── contexts/          # React Context
│   │   │   ├── OntologyContext.tsx      # 聚合导出
│   │   │   ├── ObjectContext.tsx        # 数据管理
│   │   │   ├── PerceptionContext.tsx    # 感知引擎
│   │   │   └── CognitiveContext.tsx     # 认知交互
│   │   ├── api/               # API 客户端
│   │   │   ├── client.ts      # HTTP + WebSocket 客户端
│   │   │   └── hooks.ts       # React Query Hooks
│   │   ├── perception/        # 感知引擎
│   │   ├── interaction/       # 交互引擎
│   │   ├── components/        # UI 组件
│   │   ├── decision/          # 决策引擎
│   │   ├── planning/          # 规划引擎
│   │   ├── agent/             # 认知代理
│   │   └── ...
│   ├── src-tauri/             # Tauri 桌面应用配置
│   ├── package.json
│   └── vite.config.ts
│
└── .trae/documents/
    ├── project-summary.md     # 项目总结报告
    └── p0-p1-p2-improvement-plan.md  # 改进计划
```

## 🔌 API 概览

### 认证

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 本体管理

- `GET /api/ontology/objects` - 获取对象列表
- `GET /api/ontology/{type}/{id}` - 获取单个对象
- `POST /api/ontology/{type}` - 创建对象
- `PUT /api/ontology/{type}/{id}` - 更新对象
- `DELETE /api/ontology/{type}/{id}` - 删除对象
- `POST /api/ontology/{type}/{id}/action` - 执行动作

### 感知与洞察

- `POST /api/perception/run` - 运行感知分析（异常检测/风险评分/忠诚度）
- `GET /api/perception/{entity_id}` - 获取单个实体感知结果
- `GET /api/suggestions/` - 获取主动优化建议
- `GET /api/insights/` - 获取数据洞察

### 推理引擎

- `POST /api/reasoning/validate` - 一致性校验
- `POST /api/reasoning/causal?source_id={id}&depth=2` - 因果推理
- `POST /api/reasoning/temporal?object_id={id}` - 时序推理
- `POST /api/reasoning/implicit-relations` - 隐式关系挖掘
- `GET /api/inference/rules` - 获取推理规则列表
- `POST /api/inference/rules/{rule_id}/execute` - 执行推理规则

### 动作管理

- `GET /api/actions/pending` - 获取待审批动作
- `POST /api/actions/{action_id}/approve` - 批准动作
- `POST /api/actions/{action_id}/reject` - 拒绝动作
- `POST /api/actions/{action_id}/execute` - 执行动作
- `GET /api/actions/execution-logs` - 查询执行日志

### 决策效果

- `GET /api/effects/{decision_id}` - 获取决策效果指标

### 聊天

- `POST /api/chat` - 发送聊天消息

### 实时通信

- `ws /api/ws/{user_id}` - WebSocket 连接

完整 API 文档见 <http://localhost:8000/docs>

## 🧪 测试

### 后端测试

```bash
cd backend
python -m pytest tests/ -v --cov=services --cov=routers --cov-report=html
```

- 119 个测试，全部通过
- 代码覆盖率 92%

### 前端测试

```bash
cd frontend
npm test
```

- 6 个核心测试（DecisionRecommendationEngine），全部通过

## 🔧 配置

### 环境变量

创建 `backend/.env` 文件：

```env
# JWT 密钥（生产环境必须修改）
SECRET_KEY=your-secret-key-here

# CORS 允许来源（逗号分隔）
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# LLM 配置（可选）
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=your-openai-api-key
LLM_MODEL=gpt-5.5
```

### LLM 集成

系统支持 OpenAI API 兼容接口：

- 配置 `LLM_API_URL`、`LLM_API_KEY`、`LLM_MODEL` 环境变量即可启用
- 未配置时自动降级为关键词匹配模式
- 支持本地 Ollama 等兼容服务

### 数据架构

系统不处理数据录入，数据由外部系统同步：

```
ERP/CRM/工作协同系统  →  数据同步  →  SalesClaw 数据库  →  AI 分析/推理/决策  →  前端展示
                                                                ↓
                                                         用户审批/执行
                                                                ↓
                                                         执行日志（可追溯）
```

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📜 许可证

MIT License

---

**SalesClaw** - 让医药销售决策更智能 🧠
