import { BUILTIN_MODEL_PRESETS, findBuiltinModelPreset } from '../src/screens/modelPresets';

describe('builtin model presets', () => {
  it('includes mainstream flagship model providers', () => {
    const labels = BUILTIN_MODEL_PRESETS.map((preset) => preset.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        'Claude Code',
        'ChatGPT',
        'Grok',
        'Qwen',
        'Kimi',
        'MiniMax',
        'DeepSeek',
        'Gemini',
        'GLM',
      ]),
    );
  });

  it('provides form-ready endpoint values for every preset', () => {
    for (const preset of BUILTIN_MODEL_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.baseUrl).toMatch(/^https:\/\//);
      expect(preset.model).toBeTruthy();
      expect(preset.description).toBeTruthy();
    }
  });

  it('finds a preset by id', () => {
    expect(findBuiltinModelPreset('deepseek')?.model).toBe('deepseek-v3.2');
    expect(findBuiltinModelPreset('glm')?.model).toBe('glm-5.1');
    expect(findBuiltinModelPreset('missing')).toBeUndefined();
  });
});
