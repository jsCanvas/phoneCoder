# phoneBot

Expo React Native + react-native-web client for the **dockerBot** AI coding
service (`/dockerBot`). Replaces the original phoneClaw integration.

## Features

The app is six-tab and maps 1:1 with the dockerBot HTTP API surface:

| Tab        | What you can do                                                                       | dockerBot endpoints used                                                                 |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Settings   | Configure dockerBot base URL; CRUD multiple OpenAI-compatible model configs; activate or test any of them. | `GET/POST/PATCH/DELETE /model-configs`, `POST /model-configs/:id/activate`, `POST /model-configs/:id/test` |
| Projects   | List existing projects, create a new project (optionally cloning a Git URL with token) and pick the active one. | `GET/POST/DELETE /projects`                                                             |
| Chat       | Manage multi-turn sessions, stream agent runs, attach images, toggle skills/MCP servers, abort running runs. Inline tokens (`@image`, `#file`, `#dir/`, `/skill`, `/mcp`) are extracted client-side. | `POST /projects/:id/sessions`, `GET /projects/:id/sessions`, `POST /sessions/:sid/messages` (SSE), `POST /projects/:id/attachments`, `GET /skills`, `GET /mcp-servers` |
| Files      | Browse the project file tree, read individual files, edit and save with optimistic concurrency (`expectedSha`), delete files. | `GET /projects/:id/files`, `GET/PUT/DELETE /projects/:id/files/content`                |
| Preview    | Bring the Docker runtime up/down, view status, open the routed preview URL, tail container logs. | `POST /projects/:id/runtime/up`, `POST /projects/:id/runtime/down`, `GET /projects/:id/runtime`, `GET /projects/:id/runtime/logs` (SSE) |
| Git        | Inspect git status; one-click commit-and-push.                                        | `GET /projects/:id/git/status`, `POST /projects/:id/git/commit-and-push`                |

## Screenshots

| Settings | Projects | Chat | Files | Preview | Docker | Git |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ![Settings](images/model.jpeg) | ![Projects](images/project.jpeg) | ![Chat](images/chat.jpeg) | ![Files](images/files.jpeg) | ![Preview](images/preview.jpeg) | ![Docker](images/docker.jpeg) | ![Git](images/gitpush.jpeg) |

The client persists `apiBaseUrl`, the selected `projectId`, the selected
`sessionId` and the active model config id in `AsyncStorage` under the
`dockerBot.client.settings` key.

## Streaming protocol

dockerBot emits *named* SSE events on the chat endpoint
(`event: tool-use`, `event: assistant-text`, ...). The default browser
`EventSource` only invokes `onmessage` for unnamed frames, so the client
uses a streamed `fetch` body + a custom `SseFrameParser`
(`src/events/sseParser.ts`). The parser is fed by the
`useAgentSession` hook and reduced via `reduceAgentEvent` into an
`AgentTimelineState` that drives `<AgentTimeline />`.

Supported events: `run-started`, `assistant-text`, `tool-use`,
`tool-result`, `file-changed`, `token-usage`, `run-completed`, `error`.

## Run

```bash
cd phoneBot
npm install
npm run web         # browser (recommended for laptops)
npm start           # interactive Expo CLI for iOS / Android / web
```

On a phone, point Settings → "dockerBot API Base URL" at your server's LAN
address, e.g. `http://192.168.1.10:8080/api`.

## Verify

```bash
npm run typecheck   # strict TS, no errors
npm test            # 37 unit tests
```

## Package layout

```
src/
  api/dockerBotApi.ts          # typed REST client (+ multipart helper, SSE URL builder)
  config/defaults.ts          # default base URL / model
  chat/                       # token parsing + send-payload builder
  events/                     # SSE frame parser, event types, reducer
  hooks/useAgentSession.ts    # streaming session hook
  navigation/                 # tabs + MobileAppShell
  screens/                    # Settings/Projects/Chat/Files/Preview/Git
  components/                 # FormField, ScreenCard, AgentTimeline
  storage/settingsStorage.ts  # AsyncStorage-backed persistence
  types/api.ts                # types mirroring dockerBot DTOs
test/                         # Jest tests for every pure module above
```

## Migration from phoneClaw

The previous client targeted the legacy `phoneClaw` Nest service whose
API was a singleton `model-config`, fire-and-forget chat, and an unnamed
SSE event stream per project. This rewrite:

- Replaces the singleton model config with the dockerBot multi-config CRUD.
- Switches chat from project-scoped fire-and-forget to **session-scoped
  multi-turn streaming** with named SSE events.
- Adds the **Files** tab (read/write workspace content with OCC).
- Replaces `preview/start` with `runtime/up` + status / logs.
- Replaces single-step `git/commit` with one-click `commit-and-push`.

Old screens, types, tests and the `PhoneClawApiClient` were removed.
