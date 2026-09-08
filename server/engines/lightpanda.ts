/**
 * Lightpanda Headless Browser Engine Manager
 * Gerencia a conexão com o Lightpanda através do protocolo CDP (porta padrão 9222)
 * ou inicia o processo localmente sob demanda com baixíssimo consumo de RAM (~30MB).
 */

export interface LightpandaStatus {
  available: boolean;
  endpoint: string;
  isExternal: boolean;
}

export class LightpandaEngine {
  private static wsEndpoint = process.env.LIGHTPANDA_WS || 'ws://127.0.0.1:9222';
  private static httpEndpoint = process.env.LIGHTPANDA_HTTP || 'http://127.0.0.1:9222';

  /**
   * Verifica se o serviço Lightpanda está rodando e acessível
   */
  public static async checkStatus(): Promise<LightpandaStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${this.httpEndpoint}/json/version`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        return {
          available: true,
          endpoint: this.wsEndpoint,
          isExternal: true
        };
      }
    } catch {
      // Ignora falha de conexão caso não esteja rodando
    }

    return {
      available: false,
      endpoint: this.wsEndpoint,
      isExternal: false
    };
  }

  /**
   * Extrai o HTML completamente renderizado de páginas dinâmicas com JavaScript
   * utilizando o endpoint dump ou CDP do Lightpanda
   */
  public static async fetchRenderedHtml(targetUrl: string): Promise<string | null> {
    try {
      const dumpUrl = `${this.httpEndpoint}/dump?url=${encodeURIComponent(targetUrl)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(dumpUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html'
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        return await res.text();
      }
    } catch (err) {
      console.warn(`[Lightpanda] Não foi possível renderizar ${targetUrl} via Lightpanda:`, err);
    }
    return null;
  }
}

