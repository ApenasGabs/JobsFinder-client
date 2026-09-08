import { ScraperRegistry } from '../scrapers/base.js';
import { GupyScraper } from '../scrapers/gupy.js';
import { RemoteOKScraper } from '../scrapers/remoteok.js';
import { ProgramathorScraper } from '../scrapers/programathor.js';
import { Freelas99Scraper } from '../scrapers/freelas99.js';
import { GeekHunterScraper } from '../scrapers/geekhunter.js';
import { Job, ScrapeOptions, ScrapeProgressEvent } from '../types.js';
import { StorageService } from './storage.js';

export class CrawlerService {
  private static isRegistered = false;
  private static isRunning = false;

  public static initialize(): void {
    if (this.isRegistered) return;

    ScraperRegistry.register(new GupyScraper());
    ScraperRegistry.register(new RemoteOKScraper());
    ScraperRegistry.register(new ProgramathorScraper());
    ScraperRegistry.register(new Freelas99Scraper());
    ScraperRegistry.register(new GeekHunterScraper());

    StorageService.initialize();
    this.isRegistered = true;
    console.log('[CrawlerService] Todos os scrapers registrados com sucesso.');
  }

  public static isScraping(): boolean {
    return this.isRunning;
  }

  public static async executeScrape(
    options: ScrapeOptions,
    onProgress: (event: ScrapeProgressEvent) => void
  ): Promise<{ totalFound: number; durationMs: number; jobs: Job[] }> {
    this.initialize();

    if (this.isRunning) {
      throw new Error('Uma busca já está em andamento. Aguarde a conclusão.');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const collectedJobs: Job[] = [];

    onProgress({
      type: 'start',
      message: 'Iniciando varredura unificada de vagas...',
      totalFound: 0
    });

    try {
      const selectedSources = (options.sources && options.sources.length > 0)
        ? options.sources.map((s) => s.toUpperCase())
        : ['GUPY', 'REMOTEOK', 'PROGRAMATHOR', 'FREELAS_99', 'GEEKHUNTER'];

      const scrapers = selectedSources
        .map((s) => ScraperRegistry.get(s))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));

      console.log(`[CrawlerService] Disparando ${scrapers.length} scrapers para os termos:`, options.keywords);

      // Executa os scrapers selecionados em paralelo
      const promises = scrapers.map(async (scraper) => {
        try {
          onProgress({
            type: 'progress',
            source: scraper.id,
            message: `Iniciando scraper: ${scraper.name}`
          });

          const jobs = await scraper.scrape(
            options,
            (newJob) => {
              collectedJobs.push(newJob);
              onProgress({
                type: 'job',
                source: scraper.id,
                job: newJob,
                totalFound: collectedJobs.length
              });
            },
            (progress) => {
              onProgress({
                type: 'progress',
                source: scraper.id,
                message: progress.message,
                currentCompany: progress.currentCompany,
                progressPercent: progress.percent
              });
            }
          );

          onProgress({
            type: 'source_done',
            source: scraper.id,
            message: `${scraper.name} concluído com ${jobs.length} vagas.`
          });

          return jobs;
        } catch (err) {
          console.error(`[CrawlerService] Erro no scraper ${scraper.id}:`, err);
          onProgress({
            type: 'error',
            source: scraper.id,
            message: `Falha ao executar ${scraper.name}`
          });
          return [];
        }
      });

      await Promise.all(promises);

      // Garante que tudo foi persistido em disco
      StorageService.flushToDisk();

      const durationMs = Date.now() - startTime;
      onProgress({
        type: 'done',
        message: `Busca concluída em ${(durationMs / 1000).toFixed(1)}s! Total de ${collectedJobs.length} vagas encontradas.`,
        totalFound: collectedJobs.length
      });

      return {
        totalFound: collectedJobs.length,
        durationMs,
        jobs: collectedJobs
      };
    } finally {
      this.isRunning = false;
    }
  }
}

