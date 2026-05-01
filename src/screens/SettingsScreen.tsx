import { useEffect, useMemo, useState } from 'react';
import { Button, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PhoneBotApiClient } from '../api/phoneBotApi';
import { FormField } from '../components/FormField';
import { ScreenCard } from '../components/ScreenCard';
import { DEFAULT_MODEL, DEFAULT_OPENAI_BASE_URL } from '../config/defaults';
import type { ModelConfigDto, ModelProviderDto, ProviderModelDto } from '../types/api';
import { getErrorMessage } from '../utils/errorMessage';
import {
  activateModelConfig,
  createModelConfigFromForm,
  saveApiBaseUrl,
} from './screenActions';
import type { SettingsStorage } from '../storage/settingsStorage';
import { BUILTIN_MODEL_PROVIDERS, pickDefaultProviderModel } from './modelPresets';

type SettingsScreenProps = {
  apiBaseUrl: string;
  onApiBaseUrlChange(value: string): void;
  storage: SettingsStorage;
};

export function SettingsScreen({ apiBaseUrl, onApiBaseUrlChange, storage }: SettingsScreenProps) {
  const apiClient = useMemo(() => new PhoneBotApiClient(apiBaseUrl), [apiBaseUrl]);
  const [draftBaseUrl, setDraftBaseUrl] = useState(apiBaseUrl);
  const [configs, setConfigs] = useState<ModelConfigDto[]>([]);
  const [name, setName] = useState('');
  const [openAiBaseUrl, setOpenAiBaseUrl] = useState(DEFAULT_OPENAI_BASE_URL);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [modelProviders, setModelProviders] = useState<ModelProviderDto[]>(BUILTIN_MODEL_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState(BUILTIN_MODEL_PROVIDERS[0].id);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const selectedProvider =
    modelProviders.find((provider) => provider.id === selectedProviderId) ?? modelProviders[0];
  const selectedProviderModel =
    selectedProvider.models.find((option) => option.model === model) ??
    pickDefaultProviderModel(selectedProvider);

  useEffect(() => {
    setDraftBaseUrl(apiBaseUrl);
    void loadConfigs();
    void loadModelProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  async function loadConfigs() {
    try {
      setIsLoading(true);
      const next = await apiClient.listModelConfigs();
      setConfigs(next);
    } catch (error) {
      setStatus(`Load configs failed: ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadModelProviders() {
    try {
      const next = await apiClient.listModelProviders();
      if (next.length === 0) return;
      setModelProviders(next);
      const currentProvider = next.find((provider) => provider.id === selectedProviderId);
      if (!currentProvider) {
        selectProvider(next[0]);
      }
    } catch {
      setModelProviders(BUILTIN_MODEL_PROVIDERS);
    }
  }

  async function applyBaseUrl() {
    try {
      await saveApiBaseUrl({ storage, apiBaseUrl: draftBaseUrl });
      onApiBaseUrlChange(draftBaseUrl);
      setStatus('Saved phoneBot base URL');
    } catch (error) {
      setStatus(`Save base URL failed: ${getErrorMessage(error)}`);
    }
  }

  async function createConfig() {
    if (!name.trim() || !apiKey.trim()) {
      setStatus('Name and API key are required.');
      return;
    }
    try {
      const created = await createModelConfigFromForm({
        apiClient,
        storage,
        form: { name, baseUrl: openAiBaseUrl, apiKey, model, activate: true },
      });
      setStatus(`Activated model config: ${created.name}`);
      setApiKey('');
      await loadConfigs();
    } catch (error) {
      setStatus(`Create config failed: ${getErrorMessage(error)}`);
    }
  }

  function selectProvider(provider: ModelProviderDto) {
    const defaultModel = pickDefaultProviderModel(provider);
    setSelectedProviderId(provider.id);
    setName(provider.name);
    setOpenAiBaseUrl(provider.baseUrl);
    setModel(defaultModel.model);
    setIsProviderDropdownOpen(false);
    setIsModelDropdownOpen(false);
    setStatus(`Selected provider: ${provider.label}. Choose a model or add API key to create + activate.`);
  }

  function selectProviderModel(provider: ModelProviderDto, nextModel: ProviderModelDto) {
    setSelectedProviderId(provider.id);
    setName(provider.name);
    setOpenAiBaseUrl(provider.baseUrl);
    setModel(nextModel.model);
    setIsModelDropdownOpen(false);
    setStatus(`Selected model: ${provider.label} / ${nextModel.label}. Add API key to create + activate.`);
  }

  async function activate(id: string) {
    try {
      const result = await activateModelConfig({ apiClient, storage, id });
      setStatus(`Activated: ${result.name}`);
      await loadConfigs();
    } catch (error) {
      setStatus(`Activate failed: ${getErrorMessage(error)}`);
    }
  }

  async function probe(id: string) {
    try {
      const result = await apiClient.testModelConfig(id);
      setStatus(
        result.ok
          ? `Probe ok (HTTP ${result.status})`
          : `Probe failed (${result.status ?? 'no status'}): ${result.error ?? 'unknown'}`,
      );
    } catch (error) {
      setStatus(`Probe failed: ${getErrorMessage(error)}`);
    }
  }

  async function remove(id: string) {
    try {
      await apiClient.deleteModelConfig(id);
      setStatus('Deleted model config');
      await loadConfigs();
    } catch (error) {
      setStatus(`Delete failed: ${getErrorMessage(error)}`);
    }
  }

  return (
    <View style={styles.stack}>
      <ScreenCard
        title="phoneBot connection"
        description="Point the app at the phoneBot API the server exposes (e.g. http://localhost:8080/api)."
      >
        <FormField label="phoneBot API Base URL" value={draftBaseUrl} onChangeText={setDraftBaseUrl} />
        <Button title="Save base URL" onPress={() => void applyBaseUrl()} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScreenCard>

      <ScreenCard
        title="Provider models"
        description="Fetch provider model lists from dockerBot, then choose a service provider and model."
      >
        <View style={styles.dropdownStack}>
          <Text style={styles.dropdownLabel}>Provider</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select model provider"
            onPress={() => setIsProviderDropdownOpen((open) => !open)}
            style={styles.dropdownButton}
          >
            <View style={styles.dropdownText}>
              <Text style={styles.dropdownTitle}>{selectedProvider.label}</Text>
              <Text style={styles.dropdownDescription}>{selectedProvider.description}</Text>
            </View>
            <Text style={styles.dropdownChevron}>{isProviderDropdownOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {isProviderDropdownOpen ? (
            <View style={styles.dropdownMenu}>
              {modelProviders.map((provider) => (
                <Pressable
                  key={provider.id}
                  accessibilityRole="button"
                  onPress={() => selectProvider(provider)}
                  style={[
                    styles.dropdownOption,
                    provider.id === selectedProvider.id && styles.dropdownOptionActive,
                  ]}
                >
                  <Text style={styles.optionTitle}>{provider.label}</Text>
                  <Text style={styles.optionDescription}>{provider.baseUrl}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.dropdownLabel}>Model</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select provider model"
            onPress={() => setIsModelDropdownOpen((open) => !open)}
            style={styles.dropdownButton}
          >
            <View style={styles.dropdownText}>
              <Text style={styles.dropdownTitle}>
                {selectedProviderModel.label}
                {selectedProviderModel.isLatest ? ' · latest' : ''}
              </Text>
              <Text style={styles.dropdownDescription}>{selectedProviderModel.description}</Text>
            </View>
            <Text style={styles.dropdownChevron}>{isModelDropdownOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {isModelDropdownOpen ? (
            <View style={styles.dropdownMenu}>
              {selectedProvider.models.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => selectProviderModel(selectedProvider, option)}
                  style={[
                    styles.dropdownOption,
                    option.model === selectedProviderModel.model && styles.dropdownOptionActive,
                  ]}
                >
                  <Text style={styles.optionTitle}>
                    {option.label}
                    {option.isLatest ? ' · latest' : ''}
                  </Text>
                  <Text style={styles.optionDescription}>{option.model}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScreenCard>

      <ScreenCard
        title="OpenAI-compatible model"
        description="Add a baseUrl + api-key endpoint. The active config is what phoneBot uses for new chats."
      >
        <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. deepseek-prod" />
        <FormField label="OpenAI Base URL" value={openAiBaseUrl} onChangeText={setOpenAiBaseUrl} />
        <FormField
          label="API Key"
          value={apiKey}
          secureTextEntry
          placeholder="sk-..."
          onChangeText={setApiKey}
        />
        <FormField label="Model" value={model} onChangeText={setModel} />
        <Button title="Create + activate" onPress={() => void createConfig()} />
      </ScreenCard>

      <ScreenCard
        title="Existing model configs"
        description={isLoading ? 'Loading…' : 'Activate or remove saved configs.'}
      >
        <Button title={isLoading ? 'Refreshing…' : 'Refresh list'} onPress={() => void loadConfigs()} />
        <FlatList
          data={configs}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No model configs yet.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.configRow, item.isActive && styles.activeRow]}>
              <View style={styles.configMeta}>
                <Text style={styles.configName}>
                  {item.name} {item.isActive ? '· active' : ''}
                </Text>
                <Text style={styles.configDetail}>
                  {item.model} · {item.baseUrl}
                </Text>
                <Text style={styles.configDetail}>key: {item.apiKeyMasked}</Text>
              </View>
              <View style={styles.configActions}>
                {!item.isActive ? (
                  <Pressable onPress={() => void activate(item.id)} style={styles.actionPill}>
                    <Text style={styles.actionText}>Activate</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => void probe(item.id)} style={styles.actionPill}>
                  <Text style={styles.actionText}>Test</Text>
                </Pressable>
                <Pressable onPress={() => void remove(item.id)} style={[styles.actionPill, styles.danger]}>
                  <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </ScreenCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  status: { marginTop: 12 },
  empty: { color: '#64748b', marginTop: 12 },
  dropdownStack: { gap: 8 },
  dropdownLabel: { color: '#334155', fontSize: 12, fontWeight: '800', marginTop: 4 },
  dropdownButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  dropdownText: { flex: 1, gap: 3 },
  dropdownTitle: { color: '#1e3a8a', fontSize: 14, fontWeight: '800' },
  dropdownDescription: { color: '#64748b', fontSize: 11, lineHeight: 15 },
  dropdownChevron: { color: '#2563eb', fontSize: 12, fontWeight: '900', marginTop: 2 },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownOption: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    gap: 3,
    padding: 12,
  },
  dropdownOptionActive: { backgroundColor: '#eef2ff' },
  optionTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  optionDescription: { color: '#64748b', fontSize: 11, lineHeight: 15 },
  configRow: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    padding: 12,
  },
  activeRow: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  configMeta: { flex: 1, gap: 2 },
  configName: { color: '#0f172a', fontWeight: '700' },
  configDetail: { color: '#475569', fontSize: 12 },
  configActions: { gap: 6, justifyContent: 'flex-start' },
  actionPill: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: { color: '#1e293b', fontSize: 12, fontWeight: '700' },
  danger: { borderColor: '#fca5a5' },
  dangerText: { color: '#b91c1c' },
});
