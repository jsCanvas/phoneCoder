# dockerBot · phoneBot · clientBot — 架构与使用指南（中文版）

本文介绍了一个具备全自动开发和一键部署能力的 AI 智能体系统中，三个子项目之间的协同工作方式：**NestJS 后端**（`dockerBot`）、**Expo / React Native 客户端**（`phoneBot`）、**Vite / React 网页 IDE**（`clientBot`）。三类客户端共用 dockerBot 暴露的 HTTP API（路径前缀 `/api/...`）。

> 英文版原文：[dockerBot-phoneBot-clientBot-stack.md](./dockerBot-phoneBot-clientBot-stack.md)

### 一句话介绍

| 项目 | 介绍 |
| --- | --- |
| **dockerBot** | 具备全自动开发与一键部署能力的 AI 智能体系统。
提供 Git 仓库与访问令牌，即可由系统为你完成全栈开发与部署。 |
| **phoneBot** | 随时随地——掏出手机就能完成开发。 |
| **clientBot** | 支持一键全栈部署的网页智能 IDE。 |

### 上游源码仓库（GitHub）

| 项目 | 仓库地址 |
| --- | --- |
| **dockerBot** | [github.com/jsCanvas/dockerBot](https://github.com/jsCanvas/dockerBot) |
| **phoneBot** | [github.com/jsCanvas/phoneBot](https://github.com/jsCanvas/phoneBot) |
| **clientBot** | [github.com/jsCanvas/clientBot](https://github.com/jsCanvas/clientBot) |

---

## 1. 总体关系

```mermaid
flowchart LR
  subgraph backends [宿主机 · 服务端]
    API["dockerBot API\nNestJS :8080/api"]
    AGENT["Agent 沙箱\nDocker 容器"]
    TR["Traefik\n:80 · 预览路由"]
    API -->|"docker exec"| AGENT
    API -->|"项目运行时"| TR
  end
  subgraph clients [客户端 Expo 与 Web]
    PHONE["phoneBot\nExpo · iOS/Android/Web"]
    WEB["clientBot\nVite · 浏览器 IDE"]
  end
  PHONE -->|HTTPS/LAN REST + SSE| API
  WEB -->|REST + SSE\n常见为代理转发| API
```

| 子项目 | GitHub | 本工作区路径 | 主要职责 |
| --- | --- | --- | --- |
| **dockerBot** | [jsCanvas/dockerBot](https://github.com/jsCanvas/dockerBot) | `task/dockerBot/` | **权威后端**：工程与 Git、文件、加密模型配置、面向多轮会话的 **SSE** 聊天、**沙箱容器**内执行 Agent、MCP / Skills、通过宿主 `docker.sock` 编排 Docker 运行时、配合 Traefik 的预览域名等。 |
| **phoneBot** | [jsCanvas/phoneBot](https://github.com/jsCanvas/phoneBot) | `task/phoneBot/` | 官方 **移动/多端** UI（Expo）：六个 Tab 与 dockerBot 路由一一对应；同时托管与 clientBot 共享的 TypeScript 模块（`api/`、`hooks/`、`chat/`、`types/` 等）。 |
| **clientBot** | [jsCanvas/clientBot](https://github.com/jsCanvas/clientBot) | `task/clientBot/` | **网页 IDE**（类 VS Code 外壳）：Monaco、文件树、输出/终端/端口等面板、侧栏聊天并支持 `@` / `/` 提及；通过路径别名 **`@phoneBot/*`** 复用 phoneBot 逻辑。 |

**命名说明（重要）。** Compose 栈里仍大量使用 `PHONEBOT_*` 环境变量、`phonebot-api` / `phonebot-agent` 一类容器名，以及 `dockerBot/package.json` 中的 npm 包名 `phonebot` 等——这些属于 **历史基础设施命名**。在产品与对外文档语境下，编排服务称为 **dockerBot**。请勿把目录 **`phoneBot/`**（**客户端应用**）与 **`PHONEBOT_` 前缀**（**服务端部署**）混为一谈。

---

## 2. dockerBot（后端）

### 2.1 是什么

dockerBot 是 **NestJS** 应用，通过 Docker Compose 与以下组件一同部署：

- 长期运行的 **Agent 沙箱** 镜像（Claude Code、路由、工具链等）；
- **Traefik**：为预览站点提供形如 `<slug>.<BASE_DOMAIN>` 的路由。

数据持久化采用 SQLite，存放在配置的数据目录下（`PHONEBOT_DATA_DIR`，默认 `./data`）。模型凭证等敏感字段使用 `PHONEBOT_ENCRYPTION_KEY`（64 位十六进制，即 32 字节）配合 **AES-256-GCM** 加密落盘。

### 2.2 前置条件

- 安装 **Docker Engine / Desktop**，且具备 **Compose V2**（`docker compose` 命令）。
- 系统提供 **`openssl`**（`./scripts/start.sh` 在未配置密钥时可用来生成占位替换）。

### 2.3 初次配置与启动

在 **`dockerBot/`** 目录下：

```bash
cp .env.example .env
# 若 PHONEBOT_ENCRYPTION_KEY 仍为占位符，可先交给 start.sh 自动生成，否则请手动填入 32 字节十六进制。

./scripts/start.sh          # 前台：构建镜像并附着到 Compose 日志
# ./scripts/start.sh -d     # 后台 /  detached
./scripts/start.sh down     # 停止并移除本仓库 Compose 启动的容器
```

- **REST 基地址：** `http://localhost:8080/api`（或换成本机局域网 IP + `/api`）。
- Traefik **仪表盘地址**会因配置略有不同，`scripts/start.sh` 的输出里会提示（本地配置常见 `:8081`）。

API 一览、cURL 示例、安全说明及 npm 脚本（如 `npm run start:dev`、测试、lint），详见 **`dockerBot/README.md`** 与 **`docs/plans/`** 下的设计稿（若有 `2026-04-28-dockerBot-design.md` 等）。

### 2.4 客户端必填配置项

各客户端仅需配置一项以 **`/api` 结尾** 的 **API Base URL**，例如：

- 局域网：`http://192.168.1.10:8080/api`
- 本地开发常用（经 Vite 代理）：`http://127.0.0.1:5173/api`（见 clientBot §4.4）

---

## 3. phoneBot（Expo 多端客户端）

### 3.1 是什么

phoneBot 为 **Expo（React Native）** 应用，目标平台包括 **iOS、Android 与 Web**（`npm run web`）。它仍是 **共享 TypeScript 模块的源头**：clientBot 所依赖的 `PhoneBotApiClient`、SSE 流式钩子 `useAgentSession`、聊天负载与提及、`SettingsStorage` 形状、DTO 类型等均定义于此。

历史上的类名 **`PhoneBotApiClient`** 容易误导——实际请求的 HTTP 服务端是 dockerBot；命名来自代码演进时期，并不代表存在另一套「phoneBot 后端」产品。

### 3.2 安装与运行

```bash
cd phoneBot
npm install
npm run web           # 在笔记本浏览器中最快验证
npm start             # 打开 Expo CLI，可选真机 / 模拟器
```

### 3.3 指向后端地址

在 **设置 → dockerBot connection**：

- **dockerBot API Base URL** 填例如：`http://主机:8080/api`。
- **手机访问本机后端**时，若 dockerBot 跑在电脑上，请使用电脑的 **局域网 IP**。

配置以 JSON 写入 AsyncStorage，键名 **`phonebot.client.settings`**（与 Web 端 `clientBot` 逻辑等价，参见 §4）。

### 3.4 自检

```bash
npm run typecheck
npm test
```

Tab 与接口对应关系见 **`phoneBot/README.md`**。

### 3.5 phoneBot 界面截图

| 设置 | 项目 | 聊天 | 文件 |
| :---: | :---: | :---: | :---: |
| ![设置](images/model.jpeg) | ![项目](images/project.jpeg) | ![聊天](images/chat.jpeg) | ![文件](images/files.jpeg) |

| 预览 | Docker 运行时 | Git |
| :---: | :---: | :---: |
| ![预览](images/preview.jpeg) | ![Docker](images/docker.jpeg) | ![Git](images/gitpush.jpeg) |

---

## 4. clientBot（网页 IDE）

### 4.1 是什么

clientBot 是一套 **Vite + React 18** 的单页应用，交互布局模仿 IDE：

- 活动栏与资源管理器；
- Monaco 编辑 UTF-8 文本；
- 底部面板（OUTPUT、简易终端条、端口/运行时）；
- 右侧聊天：`useAgentSession` + dockerBot **SSE**。

**不复制**一层网络/SDK：`tsconfig` 与 **`vite.config.ts`** 将 `@phoneBot/*` 解析到 **`../phoneBot/src/*`**；并为构建提供 `@react-native-async-storage/async-storage` 的极简 **shim**。

#### 截图 — clientBot 网页 IDE

![clientBot 网页 IDE：资源管理器、Monaco、含预览的端口/Docker 面板、附带技能的 AI 聊天。](images/client.jpeg)

_示意：左侧工程树与运行时入口、居中代码编辑、底部端口及预览链路、右侧由 SSE 驱动的助手及 `docker-runtime` / `fullstack-scaffold` 等上下文技能。_

### 4.2 安装与运行

```bash
cd clientBot
npm install
npm run dev          # 默认 http://localhost:5173（见 vite 配置）
npm run build
npm run preview
```

### 4.3 工作台设置（交互）

应用内提供 **Workspace settings（工作台设置）** 对话框：

- **连接（Connection）：** 编辑 API Base URL 并向 dockerBot 校验/保存；
- **项目 / 模型：** 与移动端相同的 CRUD 流程（全部由 dockerBot 承载）。

浏览器侧持久化经由 `WebPersistence` 写入 **`localStorage`**，键名同样为 **`phonebot.client.settings`**（结构上与 AsyncStorage 方案对齐）。

### 4.4 Vite 代理（推荐本地联动）

```text
clientBot/vite.config.ts
  proxy: { '/api' → http://127.0.0.1:8080 }
```

开发时可将连接地址设为 **`http://127.0.0.1:5173/api`**：浏览器只请求 Vite 开发服务器，由 Vite 将 `/api/*` **转发到** dockerBot 的 `8080` 端口。部分沙箱或对 `localhost` 解析有特殊限制的环境，优先考虑 **`127.0.0.1`**。

### 4.5 国际化

默认界面语言为 **英文**，可选用 **简体中文（zh-CN）**；所选语言会持久保存（参见 `clientBot/src/i18n/`）。

### 4.6 共享模块心智图

| `phoneBot/src/` 区域 | clientBot 中典型用途 |
| --- | --- |
| `api/phoneBotApi.ts` | HTTP 与 multipart |
| `hooks/useAgentSession.ts` | SSE 聊天流 |
| `chat/` | 负载拼装、`@` / `/` 补全来源 |
| `screens/screenActions.ts`、`screens/fileTree.ts` | 工程切换、会话、文件树合并等 |
| `types/api.ts` | DTO 类型 |

---

## 5. 典型端到端流程

### 5.1 仅本机：后端 + 网页 IDE

1. 启动 dockerBot（`./scripts/start.sh` 或 `./scripts/start.sh -d`）。
2. 在 clientBot「连接」中填写 `http://127.0.0.1:8080/api`，若走 Vite 代理则用 `http://127.0.0.1:5173/api`。
3. **创建/选择工程** → 绑定 **模型配置** → 新建 **会话** → 在聊天里下达任务；资源管理器中文件列表由 dockerBot 文件接口驱动。

### 5.2 仅本机：后端 + 手机

1. 启动 dockerBot，保证 `:8080` 可被局域网访问（监听 `0.0.0.0` 或配合端口映射）。
2. phoneBot：**设置 → dockerBot API Base URL** → `http://<局域网IP>:8080/api`。

### 5.3 停止各层进程

| 目标 | 命令 / 操作 |
| --- | --- |
| 关掉承载 API + 沙箱 + Traefik 的 Compose 栈 | `cd dockerBot && ./scripts/start.sh down` |
| 重启栈 | `./scripts/start.sh restart` |
| 查日志（透传给 `docker compose`） | `./scripts/start.sh logs -f api`（详见脚本头部说明） |
| 退出 Expo / Vite | 在对应终端 **Ctrl+C** |

---

## 6.延伸阅读

| 主题 | 位置 |
| --- | --- |
| dockerBot 特性、cURL、npm 脚本 | `dockerBot/README.md` |
| phoneBot Tab ↔ API、流式协议说明 | `phoneBot/README.md` |
| 实现级设计 / 里程碑 | `docs/plans/*.md` |
| 内置技能（Docker runtime 约定等） | `dockerBot/src/skills/builtin/*.md` |

---

## 7.协作与变更纪律

凡是触及 **REST 或 SSE 契约** 的改动，建议顺序：**先改 dockerBot 服务端**，再同步 **`phoneBot/src` 下共享类型与调用**，最后若仅有界面/文案再在 **clientBot** 收尾。这样能在一套 **`@phoneBot`** 别名下维持手机与 Web **类型一致**，减少分叉实现。
