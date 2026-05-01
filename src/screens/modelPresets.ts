import type { ModelProviderDto, ProviderModelDto } from '../types/api';

export type BuiltinModelPreset = ModelProviderDto & { model: string };

export const BUILTIN_MODEL_PROVIDERS: ModelProviderDto[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    name: 'claude-code',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'Claude flagship coding models via an OpenAI-compatible router endpoint.',
    models: [
      {
        id: 'anthropic/claude-opus-4.6',
        label: 'Claude Opus 4.6',
        model: 'anthropic/claude-opus-4.6',
        description: 'Latest Claude flagship reasoning and coding model.',
        isLatest: true,
      },
      {
        id: 'anthropic/claude-sonnet-4.6',
        label: 'Claude Sonnet 4.6',
        model: 'anthropic/claude-sonnet-4.6',
        description: 'Balanced Claude model for coding and agent workflows.',
      },
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    name: 'chatgpt',
    baseUrl: 'https://api.openai.com/v1',
    description: 'OpenAI ChatGPT flagship and reasoning models.',
    models: [
      {
        id: 'gpt-5.2',
        label: 'GPT-5.2',
        model: 'gpt-5.2',
        description: 'Latest OpenAI flagship general model.',
        isLatest: true,
      },
      { id: 'o3', label: 'o3', model: 'o3', description: 'OpenAI reasoning model.' },
      { id: 'gpt-4.1', label: 'GPT-4.1', model: 'gpt-4.1', description: 'Stable GPT model.' },
    ],
  },
  {
    id: 'grok',
    label: 'Grok',
    name: 'grok',
    baseUrl: 'https://api.x.ai/v1',
    description: 'xAI Grok flagship models.',
    models: [
      {
        id: 'grok-4.1-fast',
        label: 'Grok 4.1 Fast',
        model: 'grok-4.1-fast',
        description: 'Latest fast Grok flagship model.',
        isLatest: true,
      },
      { id: 'grok-4', label: 'Grok 4', model: 'grok-4', description: 'Grok flagship model.' },
    ],
  },
  {
    id: 'qwen',
    label: 'Qwen',
    name: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: 'Alibaba Cloud DashScope OpenAI-compatible Qwen models.',
    models: [
      {
        id: 'qwen3-max',
        label: 'Qwen3 Max',
        model: 'qwen3-max',
        description: 'Latest Qwen flagship model.',
        isLatest: true,
      },
      {
        id: 'qwen3-coder-plus',
        label: 'Qwen3 Coder Plus',
        model: 'qwen3-coder-plus',
        description: 'Qwen coding-focused model.',
      },
      { id: 'qwen-max', label: 'Qwen Max', model: 'qwen-max', description: 'Stable Qwen model.' },
    ],
  },
  {
    id: 'kimi',
    label: 'Kimi',
    name: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    description: 'Moonshot AI Kimi flagship models.',
    models: [
      {
        id: 'kimi-k2-thinking',
        label: 'Kimi K2 Thinking',
        model: 'kimi-k2-thinking',
        description: 'Latest Kimi reasoning model.',
        isLatest: true,
      },
      {
        id: 'kimi-k2-0711-preview',
        label: 'Kimi K2 Preview',
        model: 'kimi-k2-0711-preview',
        description: 'Kimi K2 preview model.',
      },
    ],
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    name: 'minimax',
    baseUrl: 'https://api.minimax.io/v1',
    description: 'MiniMax flagship models.',
    models: [
      {
        id: 'minimax-m2.7',
        label: 'MiniMax M2.7',
        model: 'minimax-m2.7',
        description: 'Latest MiniMax flagship model.',
        isLatest: true,
      },
      { id: 'minimax-m2', label: 'MiniMax M2', model: 'minimax-m2', description: 'Stable MiniMax model.' },
      { id: 'MiniMax-M1', label: 'MiniMax M1', model: 'MiniMax-M1', description: 'MiniMax reasoning model.' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek chat and reasoning models.',
    models: [
      {
        id: 'deepseek-v3.2',
        label: 'DeepSeek V3.2',
        model: 'deepseek-v3.2',
        description: 'Latest DeepSeek flagship chat model.',
        isLatest: true,
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek Reasoner',
        model: 'deepseek-reasoner',
        description: 'DeepSeek reasoning model.',
      },
      { id: 'deepseek-chat', label: 'DeepSeek Chat', model: 'deepseek-chat', description: 'Stable chat model.' },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    name: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    description: 'Google Gemini OpenAI-compatible models.',
    models: [
      {
        id: 'gemini-3-pro-preview',
        label: 'Gemini 3 Pro Preview',
        model: 'gemini-3-pro-preview',
        description: 'Latest Gemini Pro preview model.',
        isLatest: true,
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        model: 'gemini-2.5-pro',
        description: 'Stable Gemini Pro model.',
      },
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        model: 'gemini-2.5-flash',
        description: 'Fast Gemini model.',
      },
    ],
  },
  {
    id: 'glm',
    label: 'GLM',
    name: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    description: 'Zhipu AI / Z.ai GLM flagship models through an OpenAI-compatible endpoint.',
    models: [
      {
        id: 'glm-5.1',
        label: 'GLM-5.1',
        model: 'glm-5.1',
        description: 'Latest GLM flagship model for agentic, reasoning, and coding tasks.',
        isLatest: true,
      },
      {
        id: 'glm-5',
        label: 'GLM-5',
        model: 'glm-5',
        description: 'GLM flagship high-performance model.',
      },
      {
        id: 'glm-4.7',
        label: 'GLM-4.7',
        model: 'glm-4.7',
        description: 'GLM coding and agentic task model.',
      },
      {
        id: 'glm-4.5',
        label: 'GLM-4.5',
        model: 'glm-4.5',
        description: 'GLM hybrid reasoning model.',
      },
    ],
  },
];

export const BUILTIN_MODEL_PRESETS: BuiltinModelPreset[] = BUILTIN_MODEL_PROVIDERS.map(
  (provider) => {
    const model = pickDefaultProviderModel(provider);
    return { ...provider, model: model.model };
  },
);

export function pickDefaultProviderModel(provider: ModelProviderDto): ProviderModelDto {
  return provider.models.find((model) => model.isLatest) ?? provider.models[0];
}

export function findBuiltinModelPreset(id: string): BuiltinModelPreset | undefined {
  return BUILTIN_MODEL_PRESETS.find((preset) => preset.id === id);
}
