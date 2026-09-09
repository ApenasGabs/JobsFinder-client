import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { Job, SeniorityLevel, WorkModel, ContractType } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'jobs.json');

export class StorageService {
  private static jobsMap: Map<string, Job> = new Map();
  private static isInitialized = false;
  private static saveTimeout: NodeJS.Timeout | null = null;

  public static initialize(): void {
    if (this.isInitialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        const jobs: Job[] = JSON.parse(content);
        for (const job of jobs) {
          this.jobsMap.set(job.id, job);
        }
        console.log(`[Storage] Carregadas ${this.jobsMap.size} vagas do armazenamento local.`);
      }
    } catch (err) {
      console.error('[Storage] Erro ao carregar vagas:', err);
    }
    this.isInitialized = true;
  }

  public static generateJobId(source: string, url: string, title: string, company: string): string {
    const raw = `${source.toLowerCase()}:${url.trim() || `${company}:${title}`}`;
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  public static upsertJob(jobData: Omit<Job, 'id'>): { job: Job; isNew: boolean } {
    this.initialize();

    const id = this.generateJobId(jobData.source, jobData.url, jobData.title, jobData.company);
    const existing = this.jobsMap.get(id);

    const job: Job = {
      ...jobData,
      id,
      scrapedAt: existing ? existing.scrapedAt : new Date().toISOString(),
      notifiedAt: existing?.notifiedAt ?? null
    };

    const isNew = !existing;
    this.jobsMap.set(id, job);

    // Debounce na escrita em disco para poupar CPU/I/O no servidor
    this.scheduleSave();

    return { job, isNew };
  }

  public static markAsNotified(jobId: string): void {
    this.initialize();
    const job = this.jobsMap.get(jobId);
    if (job) {
      job.notifiedAt = new Date().toISOString();
      this.scheduleSave();
    }
  }

  public static markAllExistingAsNotified(): void {
    this.initialize();
    let changed = false;
    const now = new Date().toISOString();
    for (const job of this.jobsMap.values()) {
      if (!job.notifiedAt) {
        job.notifiedAt = now;
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave(0);
      console.log('[Storage] Cold Start: Todas as vagas pré-existentes foram marcadas como notificadas.');
    }
  }

  public static getUnnotifiedJobs(): Job[] {
    this.initialize();
    return Array.from(this.jobsMap.values()).filter((j) => !j.notifiedAt);
  }

  public static upsertBatch(jobs: Array<Omit<Job, 'id'>>): { totalSaved: number; totalUpdated: number } {
    let totalSaved = 0;
    let totalUpdated = 0;

    for (const j of jobs) {
      const { isNew } = this.upsertJob(j);
      if (isNew) totalSaved++;
      else totalUpdated++;
    }

    return { totalSaved, totalUpdated };
  }

  public static getJobs(filters?: {
    search?: string;
    source?: string;
    workModel?: WorkModel;
    seniority?: SeniorityLevel;
    contractType?: ContractType;
    page?: number;
    pageSize?: number;
  }): { jobs: Job[]; total: number; page: number; pageSize: number } {
    this.initialize();

    let all = Array.from(this.jobsMap.values());

    if (filters) {
      const { search, source, workModel, seniority, contractType } = filters;

      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        all = all.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.company.toLowerCase().includes(q) ||
            j.stack.some((s) => s.toLowerCase().includes(q)) ||
            (j.description && j.description.toLowerCase().includes(q))
        );
      }

      if (source && source !== 'ALL') {
        all = all.filter((j) => j.source.toUpperCase() === source.toUpperCase());
      }

      if (workModel && workModel !== 'NAO_INFORMADO') {
        all = all.filter((j) => j.workModel === workModel);
      }

      if (seniority && seniority !== 'NAO_INFORMADO') {
        all = all.filter((j) => j.seniorityLevel === seniority);
      }

      if (contractType) {
        all = all.filter((j) => j.contractType === contractType);
      }
    }

    // Ordena pelas mais recentes
    all.sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime());

    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, filters?.pageSize || 20);
    const total = all.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = all.slice(startIndex, startIndex + pageSize);

    return {
      jobs: paginated,
      total,
      page,
      pageSize
    };
  }

  public static getStats() {
    this.initialize();
    const jobs = Array.from(this.jobsMap.values());

    const bySource: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const bySeniority: Record<string, number> = {};

    for (const j of jobs) {
      bySource[j.source] = (bySource[j.source] || 0) + 1;
      byModel[j.workModel] = (byModel[j.workModel] || 0) + 1;
      bySeniority[j.seniorityLevel] = (bySeniority[j.seniorityLevel] || 0) + 1;
    }

    return {
      totalJobs: jobs.length,
      bySource,
      byModel,
      bySeniority
    };
  }

  public static clearAll(): void {
    this.jobsMap.clear();
    this.scheduleSave(0);
  }

  private static scheduleSave(delayMs = 1000): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushToDisk();
    }, delayMs);
  }

  public static flushToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.jobsMap.values()), null, 2);
      fs.writeFileSync(DATA_FILE, data, 'utf-8');
      console.log(`[Storage] Persistidas ${this.jobsMap.size} vagas em ${DATA_FILE}`);
    } catch (err) {
      console.error('[Storage] Erro ao salvar arquivo JSON:', err);
    }
  }
}

