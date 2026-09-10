import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectContractType,
  detectSeniority,
  detectWorkModel,
  extractStack,
} from "../server/utils/normalizer.js";

describe("Normalizer Utility", () => {
  describe("detectWorkModel", () => {
    it("should detect REMOTE correctly", () => {
      assert.equal(detectWorkModel("Desenvolvedor Remoto Fullstack"), "REMOTO");
      assert.equal(detectWorkModel("Senior Software Engineer (Remote - Brasil)"), "REMOTO");
      assert.equal(detectWorkModel("Trabalho Home Office / Anywhere"), "REMOTO");
      assert.equal(detectWorkModel("Teletrabalho Brasil"), "REMOTO");
    });

    it("should detect HIBRIDO correctly", () => {
      assert.equal(detectWorkModel("Engenheiro de Software Híbrido Campinas"), "HIBRIDO");
      assert.equal(detectWorkModel("Product Designer (Hybrid - SP)"), "HIBRIDO");
    });

    it("should detect PRESENCIAL correctly", () => {
      assert.equal(detectWorkModel("Analista de Suporte Presencial São Paulo"), "PRESENCIAL");
      assert.equal(detectWorkModel("Desenvolvedor On-site Manaus"), "PRESENCIAL");
      assert.equal(detectWorkModel("Técnico no local"), "PRESENCIAL");
    });

    it("should return NAO_INFORMADO for ambiguous strings", () => {
      assert.equal(detectWorkModel("Pessoa Desenvolvedora Java"), "NAO_INFORMADO");
    });
  });

  describe("detectSeniority", () => {
    it("should detect ESTAGIO correctly", () => {
      assert.equal(detectSeniority("Estágio em Desenvolvimento de Software"), "ESTAGIO");
      assert.equal(detectSeniority("Intern - Software Engineering"), "ESTAGIO");
      assert.equal(detectSeniority("Programa de Estagiário 2026"), "ESTAGIO");
    });

    it("should detect JUNIOR correctly", () => {
      assert.equal(detectSeniority("Desenvolvedor Frontend Júnior"), "JUNIOR");
      assert.equal(detectSeniority("Junior Backend Developer"), "JUNIOR");
      assert.equal(detectSeniority("Dev Jr (Node.js)"), "JUNIOR");
    });

    it("should detect PLENO correctly", () => {
      assert.equal(detectSeniority("Desenvolvedor Fullstack Pleno"), "PLENO");
      assert.equal(detectSeniority("Mid-level React Engineer"), "PLENO");
      assert.equal(detectSeniority("[1201] Pessoa Desenvolvedora Fullstack Pl (React/Python)"), "PLENO");
    });

    it("should detect SENIOR correctly", () => {
      assert.equal(detectSeniority("Pessoa Desenvolvedora Android Sr - Meios de pagamento"), "SENIOR");
      assert.equal(detectSeniority("Senior Java Architect"), "SENIOR");
      assert.equal(detectSeniority("Tech Lead / Senior Engineer"), "SENIOR");
    });

    it("should detect ESPECIALISTA correctly", () => {
      assert.equal(detectSeniority("[1164] Especialista em IA Generativa (AWS/Azure)"), "ESPECIALISTA");
      assert.equal(detectSeniority("Staff Engineer / Principal Specialist"), "ESPECIALISTA");
    });
  });

  describe("detectContractType", () => {
    it("should detect ESTAGIO contract", () => {
      assert.equal(detectContractType("Vaga de Estágio em TI"), "ESTAGIO");
      assert.equal(detectContractType("Internship 2026"), "ESTAGIO");
    });

    it("should detect PJ contract", () => {
      assert.equal(detectContractType("Desenvolvedor Node (Contrato PJ)"), "PJ");
      assert.equal(detectContractType("Consultor TI - Pessoa Jurídica"), "PJ");
    });

    it("should detect FREELANCER contract", () => {
      assert.equal(detectContractType("Freelance UI Designer"), "FREELANCER");
      assert.equal(detectContractType("Job Freelancer de 3 meses"), "FREELANCER");
    });

    it("should default to fallback (CLT)", () => {
      assert.equal(detectContractType("Desenvolvedor Backend Java", "CLT"), "CLT");
    });
  });

  describe("extractStack", () => {
    it("should extract multiple tech stacks from title and description", () => {
      const text = "[1201] Pessoa Desenvolvedora Fullstack Pl (React/Python) com Docker e AWS";
      const stack = extractStack(text);
      assert.ok(stack.includes("React"));
      assert.ok(stack.includes("Python"));
      assert.ok(stack.includes("Docker"));
      assert.ok(stack.includes("AWS"));
    });

    it("should extract .NET and C#", () => {
      const text = "[1298] Pessoa Desenvolvedora Backend .NET MVC Sr (Remoto)";
      const stack = extractStack(text);
      assert.ok(stack.includes(".NET"));
    });

    it("should extract Java without false-positiving JavaScript", () => {
      const text = "Analista de Desenvolvimento Back-end Java Pl (Remoto)";
      const stack = extractStack(text);
      assert.ok(stack.includes("Java"));
      assert.ok(!stack.includes("JavaScript"));
    });
  });
});
