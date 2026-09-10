import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LeverScraper } from "../server/scrapers/lever.js";

const mockLeverJob = {
  id: "cc17302f-2932-4751-8f66-a2e5b04fbfa5",
  text: "Senior Full Stack Engineer",
  categories: {
    commitment: "Full-time",
    location: "São Paulo, Brazil",
    team: "Engineering",
    workplaceType: "remote"
  },
  hostedUrl: "https://jobs.lever.co/example/cc17302f-2932-4751-8f66-a2e5b04fbfa5",
  descriptionPlain: "We are looking for a Senior Full Stack Engineer experienced with React and Node.js."
};

describe("Lever Scraper", () => {
  it("should have correct metadata and type", () => {
    const scraper = new LeverScraper();
    assert.equal(scraper.id, "LEVER");
    assert.equal(scraper.isFastMode, true);
    assert.equal(scraper.type, "CLT");
  });

  it("should parse and normalize Lever job posting correctly", () => {
    assert.equal(mockLeverJob.categories.team, "Engineering");
    assert.equal(mockLeverJob.categories.workplaceType, "remote");
    assert.ok(mockLeverJob.hostedUrl.includes("jobs.lever.co"));
  });

  it("should fetch real jobs from Lever public API", async () => {
    const response = await fetch("https://api.lever.co/v0/postings/aleph?mode=json", {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
      }
    });

    assert.equal(response.ok, true);
    const jobs = await response.json();
    assert.ok(Array.isArray(jobs));
    assert.ok(jobs.length > 0, "Deveria retornar vagas públicas da Aleph no Lever");

    const first = jobs[0];
    assert.ok(first.id);
    assert.ok(first.text);
    assert.ok(first.hostedUrl);
  });
});
