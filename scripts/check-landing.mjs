#!/usr/bin/env node
// Contrôle exécutable de la landing (règle E6 du lot LANDING, 2026-09-15).
// Usage : node scripts/check-landing.mjs <fichier.html> [--budget legacy|cible] [--offline]
//   - vérifie que chaque lien/ressource LOCAL(E) existe sur le disque ;
//   - vérifie que chaque lien EXTERNE répond < 400 (GET, User-Agent mobile) — sauf --offline ;
//   - vérifie la présence des blocs clés (h1, CTA principal, 2 liens magasins, lien web app) ;
//   - vérifie qu'aucune image référencée ne dépasse le budget (legacy = état du 15/09/2026, cible = nouvelle page).
// Sort avec le code 1 à la première famille d'erreurs ; les avertissements ne font pas échouer.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) { console.error('usage: node scripts/check-landing.mjs <fichier.html> [--budget legacy|cible] [--offline]'); process.exit(2); }
const budgetName = (args.find((a) => a.startsWith('--budget=')) || '--budget=cible').split('=')[1];
const offline = args.includes('--offline');

const BUDGETS = {
  // état mesuré le 15/09/2026 sur index.html en ligne : joueur-fc.png = 2 310 825 octets, 290 fichiers images
  legacy: { maxImageBytes: 2_400_000, maxPageImagesBytes: 6_000_000 },
  // cible de la refonte : aucune image > 200 Ko.
  // 16/09/2026 : les démonstrations portent 31 vraies captures, toutes en chargement différé.
  // Le plafond de la page entière passe de 1,2 à 2 Mo, et un plafond du premier affichage apparaît :
  // 300 Ko pour les images chargées sans loading="lazy" (la plus lourde candidate d'un srcset compte).
  cible: { maxImageBytes: 200_000, maxPageImagesBytes: 2_000_000, maxFirstLoadImagesBytes: 300_000 },
};
const budget = BUDGETS[budgetName];
if (!budget) { console.error(`budget inconnu : ${budgetName}`); process.exit(2); }

const html = readFileSync(file, 'utf8');
const base = dirname(resolve(file));
const youtubeLite = existsSync(join(base, 'youtube-lite.js')) ? readFileSync(join(base, 'youtube-lite.js'), 'utf8') : '';
const errors = [];
const warnings = [];

// 1. Références locales et externes
const refs = new Set();
for (const m of html.matchAll(/(?:href|src|poster)="([^"#][^"]*)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(',')) refs.add(part.trim().split(/\s+/)[0]);
for (const m of html.matchAll(/url\('?([^')]+)'?\)/g)) refs.add(m[1]);

const local = [];
const external = [];
for (const r of refs) {
  if (/^(https?:)?\/\//.test(r)) external.push(r.startsWith('//') ? 'https:' + r : r);
  else if (/^(mailto|tel|data|javascript):/.test(r)) continue;
  else local.push(r);
}

const imageBytes = [];
for (const r of local) {
  const p = join(base, r.split('?')[0]);
  if (!existsSync(p)) { errors.push(`fichier local absent : ${r}`); continue; }
  if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(p)) {
    const size = statSync(p).size;
    imageBytes.push({ r, size });
    if (size > budget.maxImageBytes) errors.push(`image trop lourde (${size} o > ${budget.maxImageBytes}) : ${r}`);
  }
}
const totalImages = imageBytes.reduce((a, b) => a + b.size, 0);
if (totalImages > budget.maxPageImagesBytes) errors.push(`poids total des images référencées ${totalImages} o > budget ${budget.maxPageImagesBytes}`);

// 1 bis. Premier affichage : les <img> sans loading="lazy".
const tailleLocale = (r) => {
  const q = join(base, r.split('?')[0]);
  return existsSync(q) ? statSync(q).size : 0;
};
let premierAffichage = 0;
const nonDifferees = [];
for (const m of html.matchAll(/<img\b[^>]*>/g)) {
  const tag = m[0];
  if (/loading="lazy"/.test(tag)) continue;
  const candidats = [];
  const src = tag.match(/\ssrc="([^"]+)"/);
  if (src) candidats.push(src[1]);
  const srcset = tag.match(/srcset="([^"]+)"/);
  if (srcset) for (const part of srcset[1].split(',')) candidats.push(part.trim().split(/\s+/)[0]);
  const locaux = candidats.filter((c) => !/^(https?:)?\/\//.test(c));
  if (!locaux.length) continue;
  const plusLourde = Math.max(...locaux.map(tailleLocale));
  premierAffichage += plusLourde;
  nonDifferees.push(`${locaux[0]} (${plusLourde} o)`);
}
if (budget.maxFirstLoadImagesBytes && premierAffichage > budget.maxFirstLoadImagesBytes) {
  errors.push(`images du premier affichage ${premierAffichage} o > budget ${budget.maxFirstLoadImagesBytes} : ${nonDifferees.join(', ')}`);
}

// 2. Blocs clés
const must = [
  [/<h1[^>]*>[\s\S]*?\S[\s\S]*?<\/h1>/, 'un <h1> non vide'],
  [/href="https:\/\/apps\.apple\.com\/[^"]+"/, 'un lien App Store'],
  [/href="https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.foundclub[^"]*"/, 'un lien Google Play (id=com.foundclub)'],
  [/href="https:\/\/foundclub\.app\/[^"]*"/, 'un lien vers la web app foundclub.app'],
  [/<a\s[^>]*class="[^"]*(?:button--primary|bouton--principal)[^"]*"/, 'un lien-bouton principal (.button--primary ou .bouton--principal)'],
  [/<meta\s+name="description"\s+content="[^"]{40,}"/, 'une meta description d au moins 40 caractères'],
  [/<link rel="canonical" href="https:\/\/foundclubpro\.com\/[^"]*">/, 'une balise canonical foundclubpro.com'],
  [/<section[^>]+id="histoire"[\s\S]*Notre histoire/, 'la section Notre histoire'],
  [/data-ytid="F2VxYtpfiRg"/, 'la vidéo Notre histoire'],
  [/youtube-nocookie\.com/, 'un lecteur YouTube sans cookies'],
];
for (const [re, label] of must) if (!re.test(re.source.includes('youtube-nocookie') ? `${html}\n${youtubeLite}` : html)) errors.push(`bloc clé manquant : ${label}`);

// 2 bis. Ancres visées depuis d'autres pages du site (carte des appelants du 15/09/2026) :
//   affiches.html, note-ton-club.html, parrainage.html -> index.html#inscrire-club ; note-ton-club.html -> index.html#section-club
for (const id of ['inscrire-club', 'section-club']) {
  if (!new RegExp(`id="${id}"`).test(html)) errors.push(`ancre visée par d'autres pages absente : #${id}`);
}
// Ancres internes : chaque href="#x" doit viser un id existant
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) errors.push(`ancre interne sans cible : #${m[1]}`);

// La vidéo doit rester sans iframe dans le HTML initial : youtube-lite.js l'ajoute seulement au clic.
if (/<iframe\b/i.test(html)) errors.push('iframe présent dans le HTML initial : la vidéo doit être activée au clic');

// 3. Interdits (décisions d Adel : pas de traceur, pas de prix non décidé)
const forbidden = [
  [/googletagmanager\.com|google-analytics\.com|gtag\(/, 'GA4/GTM (retirés le 16/07/2026, décision de confidentialité)'],
  [/\d+[,.]\d{2}\s?€|€\s?\d+[,.]\d{2}/, 'un prix en euros (aucune offre décidée pour la landing)'],
  [/(1 an offert|places restantes|il en reste \d+)/i, 'une offre de lancement non décidée'],
];
for (const [re, label] of forbidden) if (re.test(html)) errors.push(`contenu interdit : ${label}`);

// 4. JSON-LD : les URL d image doivent exister (avertissement — la page en ligne le 15/09 a un thumbnailUrl en 404)
for (const m of html.matchAll(/"(?:thumbnailUrl|logo|image)":\s*"(https:\/\/foundclubpro\.com\/[^"]+)"/g)) {
  const rel = m[1].replace('https://foundclubpro.com/', '');
  if (!existsSync(join(base, rel))) warnings.push(`JSON-LD : ${m[1]} n existe pas dans le dépôt`);
}

// 5. Liens externes
if (!offline) {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const uniq = [...new Set(external)].filter((u) => !/fonts\.g(oogleapis|static)\.com\/?$/.test(u));
  await Promise.all(uniq.map(async (u) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(u, { redirect: 'follow', headers: { 'user-agent': ua }, signal: ctrl.signal });
      clearTimeout(t);
      if (res.status >= 400) errors.push(`lien externe ${res.status} : ${u}`);
    } catch (e) {
      // x.com répond 302 puis refuse les robots : on note, on ne casse pas
      warnings.push(`lien externe injoignable (${e.name}${e.cause && e.cause.code ? ' ' + e.cause.code : ''}) : ${u}`);
    }
  }));
}

// Rapport
console.log(`page : ${file}`);
console.log(`budget : ${budgetName} (image ≤ ${budget.maxImageBytes} o, total ≤ ${budget.maxPageImagesBytes} o)`);
console.log(`premier affichage : ${premierAffichage} o d'images non différées\n` + `références : ${local.length} locales, ${external.length} externes ; images référencées : ${imageBytes.length}, ${totalImages} o au total`);
const biggest = [...imageBytes].sort((a, b) => b.size - a.size).slice(0, 3);
for (const b of biggest) console.log(`  plus lourde : ${b.size} o  ${b.r}`);
for (const w of warnings) console.log(`AVERTISSEMENT : ${w}`);
for (const e of errors) console.log(`ERREUR : ${e}`);
console.log(`${errors.length} erreur(s), ${warnings.length} avertissement(s)`);
process.exit(errors.length ? 1 : 0);
