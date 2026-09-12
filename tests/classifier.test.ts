import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TechClassifierService } from "../server/services/classifier.js";
import {
  canonicalizeTitle,
  detectSeniority,
} from "../server/utils/normalizer.js";

describe("Tech Classifier & Normalizer Suite", () => {
  describe("canonicalizeTitle", () => {
    it("should remove ATS ids, locations and affirmative tags to produce a canonical key", () => {
      const raw =
        " [1201-1202] Pessoa Desenvolvedora Fullstack Pl (React/Python) (Híbrido - São Paulo) [Afirmativa Mulheres] ";
      const canonical = canonicalizeTitle(raw);
      assert.equal(
        canonical,
        "pessoa desenvolvedora fullstack pl react python",
      );
    });

    it("should normalize accents and multiple spaces", () => {
      const raw = "Estágio   em   Desenvolvimento  de   Software  (Remoto) ";
      const canonical = canonicalizeTitle(raw);
      assert.equal(canonical, "estagio em desenvolvimento de software");
    });
  });

  describe("detectSeniority with boundary", () => {
    it("should detect ESTAGIO for intern and estágio", () => {
      assert.equal(detectSeniority("Software Engineer Intern"), "ESTAGIO");
      assert.equal(detectSeniority("Estagiário de Desenvolvimento"), "ESTAGIO");
    });

    it("should NOT detect ESTAGIO for internal or international", () => {
      const res = detectSeniority(
        "Software Engineer - Billing & Internal Tooling",
      );
      assert.notEqual(res, "ESTAGIO");
    });
  });

  describe("TechClassifierService Rule & Precedence", () => {
    it("should classify non-tech jobs as false (Blacklist Precedence)", async () => {
      const cases = [
        "Monitor(a) de Estágio – Enfermagem",
        "Analista Comercial (pré-vendas) Júnior",
        "Executivo(a) de Vendas Externo Pleno",
        "Auxiliar de Atendimento ao Cliente",
        "Vendedor de Software B2B (SaaS)",
        "Advogado Especialista em Tecnologia e Direito Digital",
        "Recrutador Tech (Tech Recruiter)",
        "Auxiliar de Cozinha",
        "Engenheiro de Segurança do Trabalho",
        "Designer de Interiores",
      ];

      for (const title of cases) {
        const isTech = await TechClassifierService.isTech(title);
        assert.equal(
          isTech,
          false,
          `O cargo "${title}" deveria ser classificado como NÃO-TI`,
        );
      }
    });

    it("should classify tech jobs as true (Whitelist)", async () => {
      const cases = [
        "Pessoa Desenvolvedora Fullstack Pl (React/Python)",
        "Engenheiro de Software Backend em Python e AWS",
        "Analista de Segurança da Informação e SOC",
        "Chip Simulation Software Intern",
        "Especialista em IA Generativa",
        "DevOps Cloud Engineer",
        "Product Designer UI/UX",
        "Cientista de Dados Pleno",
      ];

      for (const title of cases) {
        const isTech = await TechClassifierService.isTech(title);
        assert.equal(
          isTech,
          true,
          `O cargo "${title}" deveria ser classificado como TI`,
        );
      }
    });

    it("should respect User Feedback with highest authority", async () => {
      const ambiguousTitle = "Especialista de Processos e Operações";
      // Registra como não-tech manualmente
      TechClassifierService.recordUserFeedback(ambiguousTitle, false);
      const isTechAfter = await TechClassifierService.isTech(ambiguousTitle);
      assert.equal(isTechAfter, false);

      const stats = TechClassifierService.getStats();
      assert.ok(stats.userCount > 0);
    });

    it("should answer synchronously with isTechSync for WhatsApp gate", () => {
      assert.equal(
        TechClassifierService.isTechSync("Monitor de Estágio - Enfermagem"),
        false,
      );
      assert.equal(
        TechClassifierService.isTechSync("Desenvolvedor Backend Node.js"),
        true,
      );
      assert.equal(TechClassifierService.isTechSync(""), false);
    });
  });
});
