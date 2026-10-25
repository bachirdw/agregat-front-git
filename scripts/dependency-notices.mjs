import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const rows = [],
  texts = new Map();
for (const [path, p] of Object.entries(lock.packages)) {
  if (!path) continue;
  let license = p.license;
  const files = existsSync(path)
    ? readdirSync(path).filter((f) =>
        /^(licen[cs]e|copying|notice)(\.|$)/i.test(f),
      )
    : [];
  let full = "";
  for (const f of files) {
    try {
      full += readFileSync(join(path, f), "utf8") + "\n";
    } catch {}
  }
  if (!license && /MIT License/.test(full)) license = "MIT";
  rows.push(
    `| ${path.replace(/^node_modules\//, "")} | ${p.version} | ${license || "À vérifier"} | ${p.dev ? "Développement" : "Production/transitif"} |`,
  );
  if (full.trim())
    texts.set(
      `${path.replace(/^node_modules\//, "")} ${p.version}`,
      full.trim(),
    );
}
writeFileSync(
  "THIRD_PARTY_NOTICES.md",
  `# Dépendances et notices\n\nGénéré depuis package-lock.json par scripts/dependency-notices.mjs. Versions directes épinglées ; aucune dépendance modifiée. Les paquets optionnels d’autres plateformes restent recensés depuis le verrou.\n\nDOMPurify : licence Apache-2.0 retenue parmi les options proposées. elkjs est sous EPL-2.0 ; lightningcss (outil de build) sous MPL-2.0. Les textes des paquets installés sont reproduits ci-dessous. Khroma omet la métadonnée license, mais son fichier license porte MIT (vérifié).\n\n| Paquet | Version | Licence | Portée |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n\n## Textes fournis par les paquets installés\n\n${[...texts].map(([name, text]) => `### ${name}\n\n<details><summary>Licence et notices</summary>\n\n\`\`\`text\n${text}\n\`\`\`\n\n</details>`).join("\n\n")}\n`,
);
console.log(
  `${rows.length} paquets recensés ; ${texts.size} textes de licence conservés.`,
);
