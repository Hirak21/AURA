/**
 * The global skip link targets #main. Every standalone page that does not
 * inherit AppShell / the public layout must provide that target itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("standalone pages provide the skip-link target", () => {
  for (const file of ["app/login/page.tsx", "app/signup/page.tsx", "app/collaborate/page.tsx"]) {
    assert.match(read(file), /id="main"/, `${file} needs an id="main" skip target`);
  }
  assert.match(read("app/layout.tsx"), /href="#main"/);
});

test("robots disallows auth and operational surfaces", () => {
  const robots = read("app/robots.ts");
  for (const route of ["/app", "/admin", "/mentor", "/login", "/signup", "/api/"]) {
    assert.ok(robots.includes(`"${route}"`), `robots must disallow ${route}`);
  }
});

test("sitemap includes published topic pages and is dynamic", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /export const dynamic = "force-dynamic"/);
  assert.match(sitemap, /listTopics\(\)/);
  assert.match(sitemap, /\/learn\/\$\{topic\.id\}/);
});
