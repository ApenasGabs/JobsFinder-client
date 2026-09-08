import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppConfig } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.resolve(__dirname, '../../config/search.config.json');

export class ConfigService {
  private static cachedConfig: AppConfig | null = null;

  public static getConfig(): AppConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        this.cachedConfig = JSON.parse(raw);
        return this.cachedConfig!;
      }
    } catch (err) {
      console.error('[ConfigService] Erro ao carregar config:', err);
    }

    // Fallback padrão
    this.cachedConfig = {
      searchTerms: ['java', 'react', 'node', 'fullstack'],
      seniorityLevels: ['ESTAGIO', 'JUNIOR', 'PLENO', 'SENIOR'],
      contractTypes: ['CLT', 'PJ', 'FREELANCER'],
      sources: [],
      gupyCompanies: []
    };
    return this.cachedConfig;
  }

  public static updateConfig(newConfig: Partial<AppConfig>): AppConfig {
    const current = this.getConfig();
    const updated = { ...current, ...newConfig };
    this.cachedConfig = updated;

    try {
      const configDir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigService] Erro ao salvar config:', err);
    }

    return updated;
  }
}

