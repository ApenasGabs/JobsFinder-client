import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ConfigService } from '../services/config.js';
import { StorageService } from '../services/storage.js';
import { Job } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = process.env.AUTH_BAILEYS_DIR || path.resolve(__dirname, '../../auth_baileys');

export class WhatsAppBot {
  private static sock: WASocket | null = null;
  private static status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private static qrCodeDataUrl: string | null = null;
  private static botNumber: string | null = null;
  private static isStarting = false;
  private static messageQueue: Job[] = [];
  private static isProcessingQueue = false;
  private static cachedGroups: Array<{ id: string; subject: string; participants: number }> = [];
  private static lastGroupsFetch = 0;

  public static async initialize(): Promise<void> {
    if (this.sock || this.isStarting) return;
    this.isStarting = true;

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      console.log('[WhatsApp] Inicializando autenticação Baileys em:', AUTH_DIR);
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.status = 'connecting';

      const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['S-Job-Crawler', 'Desktop', '1.0.0']
      });

      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await qrcode.toDataURL(qr);
            console.log('[WhatsApp] Novo QR Code gerado! Pronto para escanear no terminal ou painel web.');
          } catch (err) {
            console.error('[WhatsApp] Erro ao converter QR code em DataURL:', err);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[WhatsApp] Conexão encerrada (código: ${statusCode}). Reconectando em 10s: ${shouldReconnect}`);

          this.status = 'disconnected';
          this.sock = null;
          this.qrCodeDataUrl = null;

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 10000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCodeDataUrl = null;
          const userJid = sock.user?.id || '';
          this.botNumber = userJid.split(':')[0] || userJid.split('@')[0];
          console.log(`[WhatsApp] ✅ Conectado com sucesso como: ${this.botNumber}`);

          // Cold Start Protection: marca vagas anteriores para evitar flood
          StorageService.markAllExistingAsNotified();
        }
      });

      // Listener de mensagens recebidas para comandos
      sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            await this.handleIncomingMessage(msg);
          }
        }
      });

    } catch (err) {
      console.error('[WhatsApp] Falha ao iniciar Baileys:', err);
      this.status = 'disconnected';
    } finally {
      this.isStarting = false;
    }
  }

  public static getStatus() {
    const config = ConfigService.getConfig();
    return {
      status: this.status,
      botNumber: this.botNumber,
      qrCode: this.qrCodeDataUrl,
      enabled: config.whatsapp?.enabled ?? false,
      targetGroupJid: config.whatsapp?.targetGroupJid || '',
      targetGroupName: config.whatsapp?.targetGroupName || ''
    };
  }

  /**
   * Retorna os grupos em que o bot é participante para selecionar na UI
   * Usa cache em memória para evitar erro 'rate-overlimit' do WhatsApp
   */
  public static async getParticipatingGroups(forceRefresh = false): Promise<Array<{ id: string; subject: string; participants: number }>> {
    const config = ConfigService.getConfig();
    const configuredJid = config.whatsapp?.targetGroupJid;
    const configuredName = config.whatsapp?.targetGroupName;

    if (!this.sock || this.status !== 'connected') {
      if (this.cachedGroups.length === 0 && configuredJid) {
        return [{ id: configuredJid, subject: configuredName || 'Grupo Configurado', participants: 0 }];
      }
      return this.cachedGroups;
    }

    const now = Date.now();
    // Cache de 3 minutos para evitar estourar o limite de requisições do WhatsApp
    if (!forceRefresh && this.cachedGroups.length > 0 && (now - this.lastGroupsFetch < 180000)) {
      return this.cachedGroups;
    }

    // Se for forceRefresh, aplica um throttle de segurança de 10 segundos
    if (forceRefresh && (now - this.lastGroupsFetch < 10000) && this.cachedGroups.length > 0) {
      return this.cachedGroups;
    }

    try {
      const groups = await this.sock.groupFetchAllParticipating();
      this.cachedGroups = Object.values(groups).map((g) => ({
        id: g.id,
        subject: g.subject,
        participants: g.participants?.length || 0
      }));
      this.lastGroupsFetch = now;
      return this.cachedGroups;
    } catch (err: any) {
      console.warn('[WhatsApp] Aviso ao buscar grupos participantes:', err?.message || err);
      // Se deu rate limit ou erro de rede, preserva o cache anterior em vez de zerar
      if (this.cachedGroups.length > 0) {
        return this.cachedGroups;
      }
      if (configuredJid) {
        return [{ id: configuredJid, subject: configuredName || 'Grupo Configurado', participants: 0 }];
      }
      return [];
    }
  }

  /**
   * Envia uma notificação de teste para o grupo configurado
   */
  public static async sendTestMessage(): Promise<{ success: boolean; message: string }> {
    const config = ConfigService.getConfig();
    const target = config.whatsapp?.targetGroupJid;

    if (!target) {
      return { success: false, message: 'Nenhum grupo do WhatsApp configurado.' };
    }
    if (!this.sock || this.status !== 'connected') {
      return { success: false, message: 'Bot do WhatsApp não está conectado. Escaneie o QR Code.' };
    }

    const testText = `🤖 *S-Job-Crawler Bot* conectado com sucesso!\n\nEste grupo receberá alertas automáticos de novas vagas de emprego em tempo real.`;
    await this.sock.sendMessage(target, { text: testText });
    return { success: true, message: 'Mensagem de teste enviada com sucesso!' };
  }

  /**
   * Recebe vagas novas do Scraper / Scheduler e enfileira com anti-spam
   */
  public static async notifyNewJobs(newJobs: Job[]): Promise<void> {
    const config = ConfigService.getConfig();
    if (!config.whatsapp?.enabled || !config.whatsapp?.targetGroupJid) {
      // Se o WhatsApp não estiver configurado para envio, apenas marca como lidas
      for (const j of newJobs) {
        StorageService.markAsNotified(j.id);
      }
      return;
    }

    if (!this.sock || this.status !== 'connected') {
      console.warn('[WhatsApp] Vagas novas encontradas, mas bot desconectado. Aguardando reconexão...');
      return;
    }

    this.messageQueue.push(...newJobs);
    this.processQueue();
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    this.isProcessingQueue = true;

    const config = ConfigService.getConfig();
    const target = config.whatsapp?.targetGroupJid;
    const digestThreshold = config.whatsapp?.sendDigestIfMoreThan || 5;

    try {
      if (!target || !this.sock || this.status !== 'connected') return;

      // Se houver muitas vagas acumuladas, envia como Digest (resumo) para não dar flood
      if (this.messageQueue.length > digestThreshold) {
        const batch = this.messageQueue.splice(0, 15);
        const digestMsg = this.formatDigestMessage(batch);

        await this.sock.sendMessage(target, { text: digestMsg });
        for (const j of batch) {
          StorageService.markAsNotified(j.id);
        }
        console.log(`[WhatsApp] Enviado resumo com ${batch.length} novas vagas.`);
      } else {
        // Envia individualmente com intervalo humano de 3 segundos
        while (this.messageQueue.length > 0) {
          const job = this.messageQueue.shift();
          if (!job) continue;

          const text = this.formatSingleJobMessage(job);
          await this.sock.sendMessage(target, { text });
          StorageService.markAsNotified(job.id);
          console.log(`[WhatsApp] Notificação enviada: ${job.title} @ ${job.company}`);

          if (this.messageQueue.length > 0) {
            await new Promise((r) => setTimeout(r, 3000)); // 3 segundos anti-ban
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp] Erro ao processar fila de mensagens:', err);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private static formatSingleJobMessage(job: Job): string {
    const modelEmoji = job.workModel === 'REMOTO' ? '🏠' : job.workModel === 'HIBRIDO' ? '🏢/🏠' : '🏢';
    const stackText = job.stack && job.stack.length > 0 ? job.stack.join(', ') : 'Geral';

    return [
      `🚨 *NOVA OPORTUNIDADE ENCONTRADA!*`,
      ``,
      `💼 *${job.title}*`,
      `🏢 *Empresa:* ${job.company}`,
      `📍 *Local / Modelo:* ${modelEmoji} ${job.workModel} (${job.location})`,
      `📑 *Contrato:* ${job.contractType} | ${job.seniorityLevel}`,
      `🏷️ *Stack:* ${stackText}`,
      `🌐 *Fonte:* ${job.source}`,
      ``,
      `👉 *Candidatar-se:* ${job.url}`,
      `────────────────────`,
      `🤖 _S-Job-Crawler Bot_`
    ].join('\n');
  }

  private static formatDigestMessage(jobs: Job[]): string {
    const lines = [
      `🚀 *RESUMO DE NOVAS OPORTUNIDADES (${jobs.length} vagas)*`,
      `Foram detectadas várias vagas nesta rodada. Veja os destaques:`,
      ``
    ];

    jobs.slice(0, 10).forEach((job, index) => {
      const model = job.workModel === 'REMOTO' ? '[Remoto]' : `[${job.workModel}]`;
      lines.push(`${index + 1}. *${job.title}* @ ${job.company} ${model}`);
      lines.push(`   👉 ${job.url}`);
    });

    if (jobs.length > 10) {
      lines.push(``);
      lines.push(`_... e mais ${jobs.length - 10} outras vagas no seu dashboard web!_`);
    }

    lines.push(``);
    lines.push(`────────────────────`);
    lines.push(`🤖 _S-Job-Crawler Bot_`);

    return lines.join('\n');
  }

  private static async handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const from = msg.key.remoteJid;
    if (!from || !text.startsWith('!')) return;

    const command = text.trim().toLowerCase();

    if (command === '!status') {
      const mem = process.memoryUsage();
      const stats = StorageService.getStats();
      const reply = [
        `🤖 *S-Job-Crawler Status*`,
        `📊 *Total de Vagas salvas:* ${stats.totalJobs}`,
        `🏠 *Vagas Remotas:* ${stats.byModel?.REMOTO || 0}`,
        `🧠 *Consumo de RAM:* ${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
        `✅ *Bot WhatsApp:* Operacional e monitorando!`
      ].join('\n');

      await this.sock?.sendMessage(from, { text: reply });
    } else if (command === '!vagas') {
      const sample = StorageService.getJobs({ pageSize: 3 });
      if (sample.jobs.length === 0) {
        await this.sock?.sendMessage(from, { text: 'Nenhuma vaga cadastrada no momento.' });
        return;
      }
      const lines = ['📌 *Últimas vagas coletadas:*', ''];
      sample.jobs.forEach((j, i) => {
        lines.push(`${i + 1}. *${j.title}* @ ${j.company} [${j.workModel}]`);
        lines.push(`   👉 ${j.url}`);
      });
      await this.sock?.sendMessage(from, { text: lines.join('\n') });
    }
  }
}
