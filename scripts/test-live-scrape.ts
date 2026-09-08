import { CrawlerService } from '../server/services/crawler.js';
import { StorageService } from '../server/services/storage.js';

async function runTest() {
  console.log('--- [TESTE REAL DE VARREDURA] Iniciando ---');
  const start = Date.now();

  CrawlerService.initialize();

  // Vamos testar buscando vagas de "java" em uma amostra de fontes rápidas
  const result = await CrawlerService.executeScrape(
    {
      keywords: ['java'],
      sources: ['GUPY', 'REMOTEOK', 'PROGRAMATHOR', 'FREELAS_99', 'GEEKHUNTER'],
      concurrency: 6
    },
    (event) => {
      if (event.type === 'job' && event.job) {
        console.log(`[+] Vaga capturada (${event.job.source}): ${event.job.title} @ ${event.job.company} [${event.job.workModel}]`);
      } else if (event.type === 'source_done') {
        console.log(`[OK] ${event.message}`);
      } else if (event.type === 'progress' && event.currentCompany) {
        process.stdout.write(`\r[Progresso] ${event.message} (${event.currentCompany})   `);
      }
    }
  );

  console.log('\n--- [RESULTADOS DA VARREDURA] ---');
  console.log(`Total de vagas coletadas: ${result.totalFound}`);
  console.log(`Tempo decorrido: ${(result.durationMs / 1000).toFixed(2)} segundos`);

  const mem = process.memoryUsage();
  console.log(`Consumo de memória RAM (RSS): ${(mem.rss / 1024 / 1024).toFixed(1)} MB`);

  const stats = StorageService.getStats();
  console.log('Estatísticas por fonte:', stats.bySource);
  console.log('Estatísticas por modelo de trabalho:', stats.byModel);

  // Amostra de 3 vagas
  const sample = StorageService.getJobs({ pageSize: 3 });
  console.log('\nAmostra das primeiras vagas salvas no banco local:');
  console.log(JSON.stringify(sample.jobs, null, 2));

  process.exit(0);
}

runTest().catch((err) => {
  console.error('[ERRO NO TESTE]:', err);
  process.exit(1);
});

