import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AshbyScraper } from "../server/scrapers/ashby.js";
import { GreenhouseScraper } from "../server/scrapers/greenhouse.js";
import { WorkableScraper } from "../server/scrapers/workable.js";

describe("ATS Platform Scrapers - Unit Tests", () => {
  describe("Ashby Scraper", () => {
    it("should have correct metadata and type", () => {
      const scraper = new AshbyScraper();
      assert.equal(scraper.id, "ASHBY");
      assert.equal(scraper.isFastMode, true);
    });

    it("should fetch real jobs from Ashby public API", async () => {
      const response = await fetch("https://api.ashbyhq.com/posting-api/job-board/Linear", {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }
      });
      assert.equal(response.ok, true);
      const data = await response.json();
      assert.ok(Array.isArray(data.jobs));
      assert.ok(data.jobs.length > 0);
      assert.ok(data.jobs[0].title);
      assert.ok(data.jobs[0].jobUrl);
    });
  });

  describe("Greenhouse Scraper", () => {
    it("should have correct metadata and type", () => {
      const scraper = new GreenhouseScraper();
      assert.equal(scraper.id, "GREENHOUSE");
      assert.equal(scraper.isFastMode, true);
    });

    it("should fetch real jobs from Greenhouse public API for QuintoAndar", async () => {
      const response = await fetch("https://boards-api.greenhouse.io/v1/boards/quintoandar/jobs?content=true", {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }
      });
      assert.equal(response.ok, true);
      const data = await response.json();
      assert.ok(Array.isArray(data.jobs));
      assert.ok(data.jobs.length > 0);
      assert.ok(data.jobs[0].title);
      assert.ok(data.jobs[0].absolute_url);
    });
  });

  describe("Workable Scraper", () => {
    it("should have correct metadata and type", () => {
      const scraper = new WorkableScraper();
      assert.equal(scraper.id, "WORKABLE");
      assert.equal(scraper.isFastMode, true);
    });
  });
});
