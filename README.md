# [dockerBot](https://github.com/jsCanvas/dockerBot) · [phoneBot](https://github.com/jsCanvas/phoneBot) · [clientBot](https://github.com/jsCanvas/clientBot) — Architecture & Usage Guide

Chinese version: [`dockerBot-phoneBot-clientBot-stack.zh-CN.md`](./dockerBot-phoneBot-clientBot-stack.zh-CN.md)

This article describes how the three subprojects in an AI agent system—featuring fully automated development and one-click deployment—collaborate with each other: the **NestJS backend** (`dockerBot`), the **Expo/React Native mobile client** (`phoneBot`), and the **Vite/React web IDE** (`clientBot`). 
Provide a Git repository and access token, and the system will take care of full-stack development and deployment, with mobile support so you can build anytime, anywhere—right from your phone.

### Upstream repositories (GitHub)

| Project | Repository |
| --- | --- |
| **dockerBot** | [github.com/jsCanvas/dockerBot](https://github.com/jsCanvas/dockerBot) |
| **phoneBot** | [github.com/jsCanvas/phoneBot](https://github.com/jsCanvas/phoneBot) |
| **clientBot** | [github.com/jsCanvas/clientBot](https://github.com/jsCanvas/clientBot) |

---

## 1. High-level relationship

```mermaid
flowchart LR
  subgraph backends [Host Server]
    API["dockerBot API\nNestJS :8080/api"]
    AGENT["Agent sandbox\nDocker container"]
    TR["Traefik\n:80 / preview"]
    API -->|"docker exec"| AGENT
    API -->|"project runtime"| TR
  end
  subgraph clients [Clients Expo and Web]
    PHONE["phoneBot\nExpo · iOS/Android/Web"]
    WEB["clientBot\nVite · Browser IDE"]
  end
  PHONE -->|HTTPS/LAN REST + SSE| API
  WEB -->|REST + SSE| API
```

| Package | GitHub | Introduction | Primary role |
| --- | --- | --- | --- |
| **dockerBot** | [jsCanvas/dockerBot](https://github.com/jsCanvas/dockerBot) | An AI agent system with fully automated development and one-click deployment. Provide a Git repository and access token, and I’ll handle the full-stack development and deployment for you. | Authoritative backend: projects, Git, files, encrypted model configs, multi-turn chat with **SSE**, agent runs in a **sandbox container**, MCP/Skills, Docker runtime orchestration via host `docker.sock`, Traefik-friendly previews. |
| **phoneBot** | [jsCanvas/phoneBot](https://github.com/jsCanvas/phoneBot) | Anytime, anywhere—pull out your phone and get development done. | First-party **mobile/desktop-style** UI (Expo): six tabs mapped 1:1 to dockerBot routes. Ships the canonical TypeScript modules shared with clientBot (`api/`, `hooks/`, `chat/`, `types/`, etc.). |
| **clientBot** | [jsCanvas/clientBot](https://github.com/jsCanvas/clientBot) | A web-based intelligent IDE with one-click full-stack deployment support. | **Web IDE** (VS Code–like shell): Monaco editor, file tree, terminal/output panels, sidebar chat with `@`/`/` mentions — reuses phoneBot logic via path alias **`@phoneBot/*`**. |

---

## 2. dockerBot (backend)

### 2.1 What it is

dockerBot is a **NestJS** application packaged with Docker Compose alongside:

- a long-lived **agent sandbox** image (Claude Code, router, toolchain),
- **Traefik** for routing preview URLs (`<slug>.<BASE_DOMAIN>`).

Persistence is SQLite under the configured data directory (`PHONEBOT_DATA_DIR`, default `./data`). Model credentials and sensitive fields are encrypted at rest (AES-256-GCM) using `PHONEBOT_ENCRYPTION_KEY` (64 hex chars).

### 2.2 Prerequisites

- Docker Engine / Docker Desktop with **Compose V2**
- `openssl` (used by `./scripts/start.sh` when generating keys)

### 2.3 First-time setup & run

From `dockerBot/`:

```bash
cp .env.example .env
# Ensure PHONEBOT_ENCRYPTION_KEY is set to 32-byte hex if not auto-filled by start.sh.

./scripts/start.sh          # foreground: build + attach to compose logs
# ./scripts/start.sh -d      # detach (background)
./scripts/start.sh down     # stop and remove compose stack containers
```

- **REST base URL:** `http://localhost:8080/api` (or your host/IP + `/api`).
- Traefik dashboard (local profile) is referenced in `scripts/start.sh` output (commonly `:8081`).

For API tables, curls, security notes, and npm scripts (`npm run start:dev`, tests, lint), see **[dockerBot/design.md](https://github.com/jsCanvas/dockerBot/blob/main/design.md)**

### 2.4 What clients must configure

Clients only need a single **API base URL** string that ends with `/api`:

- LAN example: `http://192.168.1.10:8080/api`
- Typical local dev behind Vite proxy: `http://127.0.0.1:5173/api` (see clientBot §4.4)

---

## 3. phoneBot (Expo mobile / multi-platform client)

### 3.1 What it is

phoneBot is an **Expo (React Native)** application. It targets **iOS, Android, and web** (`npm run web`). It remains the **source of truth** for shared TS modules consumed by clientBot (`PhoneBotApiClient`, SSE streaming hook `useAgentSession`, chat payloads, mentions, settings storage interfaces, API DTO types).

Despite the historical name **`PhoneBotApiClient`**, the HTTP server is dockerBot — the client is naming from the codebase era, not a separate backend product.

### 3.2 Install & run

```bash
cd phoneBot
npm install
npm run web           # fastest on a laptop browser
npm start             # Expo Dev Tools for device/simulator
```

### 3.3 Pointing at the backend

In **Settings → dockerBot connection**:

- Set **dockerBot API Base URL** to e.g. `http://HOST:8080/api`.
- On a physical phone, use your machine’s LAN IP if the backend runs on your PC.

Persisted JSON lives in AsyncStorage under key **`phonebot.client.settings`** (same logical shape as web `clientBot`; see §4).

### 3.4 Verify

```bash
npm run typecheck
npm test
```

Tab ↔ endpoint mapping is documented in **[phoneBot/design.md](https://github.com/jsCanvas/phoneBot/blob/main/design.md)**.

### 3.5 Screenshots (phoneBot UI)

| Settings | Projects | Chat | Files |
| :---: | :---: | :---: | :---: |
| ![Settings](images/model.jpeg) | ![Projects](images/project.jpeg) | ![Chat](images/chat.jpeg) | ![Files](images/files.jpeg) |

| Preview | Docker runtime | Git |
| :---: | :---: | :---: |
| ![Preview](images/preview.jpeg) | ![Docker](images/docker.jpeg) | ![Git](images/gitpush.jpeg) |

---

## 4. clientBot (Web IDE)

### 4.1 What it is

clientBot is a **Vite + React 18** SPA styled like an IDE:

- Activity bar & explorer
- Monaco for UTF-8 text files
- Bottom panels (_OUTPUT_, terminal strip, ports/runtime)
- Right-side chat wired to **`useAgentSession`** and dockerBot SSE

It **does not duplicate** networking logic: **`tsconfig`** and **`vite.config.ts`** map `@phoneBot/*` → `../phoneBot/src/*`. A small shim replaces `@react-native-async-storage/async-storage` for builds.

#### Screenshot — clientBot Web IDE

![clientBot Web IDE: explorer, Monaco editor, Ports panel with Docker preview URL, AI chat with skills.](images/client.jpeg)

_The screenshot shows file tree & runtime hints, centered code editing, Docker/ports tooling with preview, and the SSE-backed assistant—with skills such as `docker-runtime` / `fullstack-scaffold` in context._

### 4.2 Install & run

```bash
cd clientBot
npm install
npm run dev      # http://localhost:5173 (default port in vite.config)
npm run build
npm run preview
```

### 4.3 Workspace settings UX

The app opens a **Workspace settings** modal:

- **Connection:** API Base URL draft + save (against dockerBot).
- **Project / Models:** same CRUD flows as mobile (hosted REST on dockerBot).

Web persistence uses **`localStorage`** via `WebPersistence`, key **`phonebot.client.settings`** (mirrors AsyncStorage-backed settings shape).

### 4.4 Vite proxy (recommended local pairing)

```text
clientBot/vite.config.ts
  proxy: { '/api' → http://127.0.0.1:8080 }
```

Therefore you may set Connection to **`http://127.0.0.1:5173/api`** so the browser only talks to Vite while developing; Vite forwards `/api/*` to dockerBot `:8080`. Avoid `localhost` in some sandboxed setups if `/etc/hosts` resolution differs — `127.0.0.1` is predictable.

### 4.5 Internationalization

Default UI language is **English** with optional **Chinese (zh-CN)**; locale is persisted (see `clientBot/src/i18n/`).

### 4.6 Shared modules (mental model)

| Shared area (under `phoneBot/src/`) | Typical use in clientBot |
| --- | --- |
| `api/phoneBotApi.ts` | HTTP + multipart |
| `hooks/useAgentSession.ts` | SSE chat stream |
| `chat/` | payloads, `@`/`/` completions |
| `screens/screenActions.ts`, `screens/fileTree.ts` | project/session/actions |
| `types/api.ts` | DTOs |

---

## 5. Typical end-to-end workflows

### 5.1 Local: backend + web IDE only

1. Start dockerBot (`./scripts/start.sh` or `./scripts/start.sh -d`).
2. In clientBot Connection, use `http://127.0.0.1:8080/api` **or** `http://127.0.0.1:5173/api` if using the Vite proxy.
3. Create/select a **project**, attach a **model config**, create a **session**, chat — files appear under the explorer from dockerBot file APIs.

### 5.2 Local: backend + phone

1. Start dockerBot; bind `:8080` on `0.0.0.0` or use LAN IP forwarding.
2. phoneBot Settings → dockerBot API Base URL → `http://<LAN-ip>:8080/api`.

### 5.3 Stopping workloads

| Goal | Command / action |
| --- | --- |
| Stop Compose stack hosting dockerBot API + sandbox + Traefik | `cd dockerBot && ./scripts/start.sh down` |
| Restart stack | `./scripts/start.sh restart` |
| Inspect logs | `./scripts/start.sh logs -f api` (passthrough — see script header) |
| Shut down Expo / Vite | Ctrl+C in the respective dev terminal |

---

## 6. Further reading

| Topic | Location |
| --- | --- |
| dockerBot features, curls, npm scripts | [dockerBot/design.md](https://github.com/jsCanvas/dockerBot/blob/main/design.md) |
| phoneBot tab ↔ API map, streaming notes | [phoneBot/design.md](https://github.com/jsCanvas/phoneBot/blob/main/design.md) |
| Built-in Skills (Docker runtime scaffold, etc.) | `dockerBot/src/skills/builtin/*.md` |

---
