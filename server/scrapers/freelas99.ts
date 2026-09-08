import * as cheerio from 'cheerio';
import { BaseScraper } from './base.js';
import { Job, ScrapeOptions } from '../types.js';
import { extractStack } from '../utils/normalizer.js';
import { StorageService } from '../services/storage.js';

export class Freelas99Scraper implements BaseScraper {
  public readonly id = 'FREELAS_99';
  public readonly name = '99Freelas';
  public readonly type = 'FREELANCE' as const;
  public readonly isFastMode = true;

  public async scrape(
    options: ScrapeOptions,
    onJobFound: (job: Job) => void,
    onProgress?: (progress: { message: string; percent?: number }) => void
  ): Promise<Job[]> {
    const keywords = (options.keywords || []).filter(Boolean);
    const searchTerms = keywords.length > 0 ? keywords : ['programacao'];
    const foundJobs: Job[] = [];

    for (const term of searchTerms) {
      if (onProgress) {
        onProgress({ message: `Buscando projetos no 99Freelas: "${term}"...`, percent: 50 });
      }

      try {
        const url = `https://www.99freelas.com.br/projetos?q=${encodeURIComponent(term)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const html = await response.text();
        const $ = cheerio.load(html);

        $('.result-item').each((_, elem) => {
          const titleLink = $(elem).find('.title a');
          const title = titleLink.text().trim();
          if (!title) return;

          const relativeUrl = titleLink.attr('href') || '';
          const projectUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://www.99freelas.com.br${relativeUrl}`;

          const description = $(elem).find('.item-text').text().trim();
          const info = $(elem).find('.item-details').text().trim();
          const skills = $(elem).find('.skills span').map((_, s) => $(s).text().trim()).get();

          const stack = Array.from(new Set([...skills, ...extractStack(`${title} ${description}`)]));

          const jobData = {
            title: `[Projeto Freelance] ${title}`,
            company: 'Cliente 99Freelas',
            location: 'Remoto Brasil',
            workModel: 'REMOTO' as const,
            contractType: 'FREELANCER' as const,
            seniorityLevel: 'NAO_INFORMADO' as const,
            url: projectUrl,
            source: 'FREELAS_99',
            stack,
            description: `${description.slice(0, 300)}... | ${info}`
          };

          const { job } = StorageService.upsertJob(jobData);
          foundJobs.push(job);
          onJobFound(job);
        });
      } catch (err) {
        console.error(`[99Freelas] Erro ao buscar termo "${term}":`, err);
      }
    }

    if (onProgress) {
      onProgress({ message: `99Freelas finalizado: ${foundJobs.length} projetos`, percent: 100 });
    }

    return foundJobs;
  }
}

