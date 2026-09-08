import * as cheerio from 'cheerio';
import { BaseScraper } from './base.js';
import { Job, ScrapeOptions } from '../types.js';
import { detectSeniority, detectWorkModel, extractStack } from '../utils/normalizer.js';
import { StorageService } from '../services/storage.js';

export class GeekHunterScraper implements BaseScraper {
  public readonly id = 'GEEKHUNTER';
  public readonly name = 'GeekHunter';
  public readonly type = 'CLT' as const;
  public readonly isFastMode = true;

  public async scrape(
    options: ScrapeOptions,
    onJobFound: (job: Job) => void,
    onProgress?: (progress: { message: string; percent?: number }) => void
  ): Promise<Job[]> {
    const keywords = (options.keywords || []).filter(Boolean);
    const searchTerms = keywords.length > 0 ? keywords : [''];
    const foundJobs: Job[] = [];

    for (const term of searchTerms) {
      if (onProgress) {
        onProgress({ message: `Consultando GeekHunter: "${term || 'todas'}"...`, percent: 45 });
      }

      try {
        const queryParam = term ? `?q=${encodeURIComponent(term)}` : '';
        const url = `https://www.geekhunter.com.br/vagas${queryParam}`;

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

        $('a[href*="/vaga/"], .job-card, .vaga-item').each((_, elem) => {
          const title = $(elem).find('h2, h3, .job-title').first().text().trim() || $(elem).text().trim().split('\n')[0];
          if (!title || title.length < 4 || title.length > 120) return;

          const rawHref = $(elem).attr('href') || $(elem).find('a').attr('href') || '';
          if (!rawHref) return;
          const jobUrl = rawHref.startsWith('http') ? rawHref : `https://www.geekhunter.com.br${rawHref}`;

          const company = $(elem).find('.company-name, .empresa').text().trim() || 'Empresa parceira GeekHunter';
          const details = $(elem).text().trim();

          const model = detectWorkModel(`${title} ${details}`);
          const seniority = detectSeniority(`${title} ${details}`);
          const stack = extractStack(`${title} ${details}`);

          const jobData = {
            title,
            company,
            location: model === 'REMOTO' ? 'Remoto Brasil' : 'Brasil',
            workModel: model,
            contractType: 'CLT' as const,
            seniorityLevel: seniority,
            url: jobUrl,
            source: 'GEEKHUNTER',
            stack,
            description: details.slice(0, 250)
          };

          const { job } = StorageService.upsertJob(jobData);
          foundJobs.push(job);
          onJobFound(job);
        });
      } catch (err) {
        console.error(`[GeekHunter] Erro ao buscar "${term}":`, err);
      }
    }

    if (onProgress) {
      onProgress({ message: `GeekHunter finalizado: ${foundJobs.length} vagas`, percent: 100 });
    }

    return foundJobs;
  }
}

