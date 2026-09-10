import { SeniorityLevel, WorkModel, ContractType } from '../types.js';

const KNOWN_STACKS = [
  'JavaScript', 'TypeScript', 'React', 'Node', 'Java', 'Spring', 'Python', 'Django',
  'FastAPI', 'C#', '.NET', 'PHP', 'Laravel', 'Go', 'Golang', 'Rust', 'Ruby', 'Rails',
  'Vue', 'Angular', 'Next.js', 'NestJS', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'DevOps', 'CI/CD', 'Flutter',
  'React Native', 'Kotlin', 'Swift', 'SQL', 'Terraform', 'Kafka'
];

export function detectSeniority(text: string): SeniorityLevel {
  const t = text.toLowerCase();
  if (t.includes('estágio') || t.includes('estagio') || t.includes('estagiário') || t.includes('intern')) {
    return 'ESTAGIO';
  }
  if (t.includes('júnior') || t.includes('junior') || /\bjr\b/i.test(t)) {
    return 'JUNIOR';
  }
  if (t.includes('especialista') || t.includes('principal') || t.includes('staff')) {
    return 'ESPECIALISTA';
  }
  if (t.includes('sênior') || t.includes('senior') || /\bsr\b/i.test(t) || t.includes('lead') || t.includes('tech lead')) {
    return 'SENIOR';
  }
  if (t.includes('pleno') || t.includes('mid-level') || t.includes('mid level') || /\bpl\b/i.test(t)) {
    return 'PLENO';
  }
  return 'NAO_INFORMADO';
}

export function detectWorkModel(text: string): WorkModel {
  const t = text.toLowerCase();
  if (t.includes('remoto') || t.includes('remote') || t.includes('home office') || t.includes('teletrabalho')) {
    return 'REMOTO';
  }
  if (t.includes('híbrido') || t.includes('hibrido') || t.includes('hybrid')) {
    return 'HIBRIDO';
  }
  if (t.includes('presencial') || t.includes('on-site') || t.includes('onsite') || t.includes('on site') || t.includes('no local')) {
    return 'PRESENCIAL';
  }
  return 'NAO_INFORMADO';
}

export function detectContractType(text: string, defaultType: ContractType = 'CLT'): ContractType {
  const t = text.toLowerCase();
  if (t.includes('freelance') || t.includes('freelancer') || t.includes('projeto') || t.includes('temporário')) {
    return 'FREELANCER';
  }
  if (t.includes('pj') || t.includes('pessoa jurídica') || t.includes('prestador de serviços')) {
    return 'PJ';
  }
  if (t.includes('estágio') || t.includes('estagio') || t.includes('estagiário') || t.includes('internship') || t.includes('intern')) {
    return 'ESTAGIO';
  }
  if (t.includes('clt') || t.includes('efetivo')) {
    return 'CLT';
  }
  return defaultType;
}

export function extractStack(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  const found: string[] = [];

  for (const tech of KNOWN_STACKS) {
    const techLower = tech.toLowerCase();
    // Verifica palavra exata para evitar falsos positivos
    const regex = new RegExp(`[\\s,./+()\\-_#]${techLower.replace('.', '\\.')}[\\s,./+()\\-_#]`, 'i');
    if (regex.test(t) || t.includes(` ${techLower} `)) {
      found.push(tech);
    }
  }

  return Array.from(new Set(found));
}

