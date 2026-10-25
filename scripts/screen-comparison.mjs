import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const reference = "design/screens",
  output = ".manager/reports/front-01-screens";
const names = readdirSync(reference)
  .filter((name) => name.endsWith(".png"))
  .sort();
const dimensions = (path) => {
  const bytes = readFileSync(path);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
  };
};
const pairs = names.map((name) => ({
  name,
  reference: dimensions(join(reference, name)),
  rendered: dimensions(join(output, name)),
}));
for (const pair of pairs)
  if (
    pair.reference.width !== pair.rendered.width ||
    pair.reference.height !== pair.rendered.height
  )
    throw new Error(`Dimensions différentes : ${pair.name}`);
const extra = readdirSync(output).filter(
  (name) => name.endsWith(".png") && !names.includes(name),
);
const caption =
  "À gauche : maquette. À droite : backend fixture réel hors réseau. Les données métier diffèrent volontairement. Les écrans d’accord/lettre utilisent application-draft ; veille montre un refus humain ; comparaison montre un refus de budget réel. Les galeries affichent les véritables agents et Skills détectés. Les références filtre Agent et Skills montrent des galeries malgré leurs noms : notre capture montre le vrai filtre.";
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Comparaison front-01</title><style>body{font:15px system-ui;background:#eee;color:#222;margin:24px}section{margin:30px 0}article{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;border:1px solid #ccc}h3{margin:8px 0}p{max-width:1000px}</style><h1>Maquette / frontend API</h1><p>${caption}</p>${pairs.map(({ name }) => `<section><h2>${name}</h2><article><div><h3>Maquette</h3><img src="../../../design/screens/${name}" alt="Maquette ${name}"></div><div><h3>Frontend API fixture</h3><img src="${name}" alt="Frontend ${name}"></div></article></section>`).join("")}<h2>Vues supplémentaires</h2><ul>${extra.map((name) => `<li><a href="${name}">${name}</a></li>`).join("")}</ul></html>`;
writeFileSync(join(output, "comparison.html"), html);
writeFileSync(
  join(output, "manifest.json"),
  JSON.stringify({ pairs, extra }, null, 2) + "\n",
);
console.log(
  `${pairs.length} paires, dimensions identiques ; ${extra.length} vues supplémentaires.`,
);
