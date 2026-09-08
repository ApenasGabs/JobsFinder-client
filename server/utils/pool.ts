export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await task(items[idx], idx);
      } catch (err) {
        console.error(`[Pool] Erro ao executar tarefa no índice ${idx}:`, err);
      }
    }
  });

  await Promise.all(workers);
  return results.filter(Boolean);
}

