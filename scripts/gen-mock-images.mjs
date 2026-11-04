// Generates neutral placeholder product illustrations for Mock Mode.
// They are deliberately simple line drawings, labelled as samples, never real OVIAN products.
import { writeFileSync, mkdirSync } from "node:fs";

const out = new URL("../public/mock/", import.meta.url);
mkdirSync(out, { recursive: true });

const tones = {
  ivory: { bg: "#F1ECDF", fill: "#E2D9C4" },
  sage: { bg: "#E6EFE8", fill: "#C9DACD" },
  stone: { bg: "#ECEAE4", fill: "#D6D2C8" },
  oak: { bg: "#F3E9DA", fill: "#DCC7A6" },
};
const ink = "#2F5E3A";
const s = `stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;

const shapes = {
  shelf: (f) => `<rect x="250" y="230" width="300" height="360" rx="6" fill="${f}" ${s}/><path d="M250 350h300M250 470h300" ${s}/><rect x="290" y="285" width="60" height="65" fill="none" ${s}/><circle cx="470" cy="420" r="28" fill="none" ${s}/>`,
  box: (f) => `<rect x="230" y="330" width="340" height="230" rx="8" fill="${f}" ${s}/><path d="M230 380h340" ${s}/><path d="M370 355h60" ${s}/>`,
  mug: (f) => `<path d="M290 300h180v230a30 30 0 0 1-30 30H320a30 30 0 0 1-30-30z" fill="${f}" ${s}/><path d="M470 350h30a40 40 0 0 1 0 80h-30" fill="none" ${s}/>`,
  bowl: (f) => `<path d="M230 400h340a170 150 0 0 1-340 0z" fill="${f}" ${s}/><path d="M330 560h140" ${s}/>`,
  towel: (f) => `<rect x="280" y="250" width="240" height="320" rx="10" fill="${f}" ${s}/><path d="M280 520h240M280 535h240" ${s}/><path d="M250 250h300" ${s}/>`,
  lamp: (f) => `<path d="M310 260h180l40 140H270z" fill="${f}" ${s}/><path d="M400 400v150M330 560h140" ${s}/>`,
  notebook: (f) => `<rect x="280" y="240" width="250" height="330" rx="8" fill="${f}" ${s}/><path d="M320 240v330" ${s}/><path d="M370 320h120M370 360h90" ${s}/>`,
  pot: (f) => `<path d="M300 400h200l-25 170H325z" fill="${f}" ${s}/><path d="M400 400c0-70-40-110-80-130M400 400c0-80 40-120 85-140M400 400v-150" fill="none" ${s}/>`,
  shirt: (f) => `<path d="M330 240l-90 50 35 70 40-20v220h170V340l40 20 35-70-90-50c-10 30-40 45-70 45s-60-15-70-45z" fill="${f}" ${s}/>`,
  basket: (f) => `<path d="M240 360h320l-30 200H270z" fill="${f}" ${s}/><path d="M300 360c0-90 200-90 200 0" fill="none" ${s}/><path d="M260 430h280M265 495h270" ${s}/>`,
  bottle: (f) => `<path d="M360 230h80v50l30 40v240a20 20 0 0 1-20 20H350a20 20 0 0 1-20-20V320l30-40z" fill="${f}" ${s}/><path d="M345 420h110" ${s}/>`,
  hanger: (f) => `<path d="M400 290v-30a30 30 0 1 1 30 30L230 450h340z" fill="${f}" ${s}/>`,
  pillow: (f) => `<path d="M240 300q160-40 320 0q-30 100 0 200q-160 40-320 0q30-100 0-200z" fill="${f}" ${s}/>`,
  chair: (f) => `<rect x="300" y="380" width="200" height="40" rx="6" fill="${f}" ${s}/><path d="M310 420v150M490 420v150M310 380V240h180v140" fill="none" ${s}/>`,
};

const svg = (shape, tone) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img"><rect width="800" height="800" fill="${tones[tone].bg}"/>${shapes[shape](tones[tone].fill)}<text x="400" y="740" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#56635A">Ảnh mẫu · Sample image</text></svg>\n`;

let n = 0;
for (const shape of Object.keys(shapes)) for (const tone of Object.keys(tones)) {
  writeFileSync(new URL(`${shape}-${tone}.svg`, out), svg(shape, tone));
  n++;
}
console.log(`wrote ${n} placeholder images`);
