export type WorkModel = 'REMOTO' | 'HIBRIDO' | 'PRESENCIAL' | 'NAO_INFORMADO';

export type ContractType = 'CLT' | 'PJ' | 'FREELANCER' | 'ESTAGIO' | 'OUTRO';

export type SeniorityLevel = 'ESTAGIO' | 'JUNIOR' | 'PLENO' | 'SENIOR' | 'ESPECIALISTA' | 'NAO_INFORMADO';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workModel: WorkModel;
  salary?: string;
  contractType: ContractType;
  seniorityLevel: SeniorityLevel;
  url: string;
  source: string;
  stack: string[];
  scrapedAt: string;
  description?: string;
  notifiedAt?: string | null; // Data/hora em que a vaga foi enviada ao WhatsApp
}

export interface ScrapeOptions {
  keywords: string[];
  sources: string[];
  contractType?: ContractType;
  seniority?: SeniorityLevel;
  companies?: string[]; // Para filtrar empresas da Gupy
  concurrency?: number;
}

export interface ScrapeProgressEvent {
  type: 'start' | 'progress' | 'job' | 'source_done' | 'done' | 'error';
  source?: string;
  job?: Job;
  message?: string;
  totalFound?: number;
  currentCompany?: string;
  progressPercent?: number;
}

export interface WhatsAppConfig {
  enabled: boolean;
  targetGroupJid: string; // Ex: '120363xxxxxx@g.us'
  targetGroupName?: string;
  sendDigestIfMoreThan: number; // Ex: se > 5 vagas de uma vez, envia em resumo
}

export interface SchedulerConfig {
  enabled: boolean;
  cronSchedule: string; // Ex: '*/30 * * * *' (a cada 30 minutos)
  lastRunAt?: string;
}

export interface AppConfig {
  searchTerms: string[];
  seniorityLevels: string[];
  contractTypes: string[];
  sources: Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    fastMode: boolean;
  }>;
  gupyCompanies: Array<{
    name: string;
    link: string;
    slug: string;
    enabled: boolean;
  }>;
  whatsapp?: WhatsAppConfig;
  scheduler?: SchedulerConfig;
}

