import fs from 'node:fs';
import path from 'node:path';
import { classify, protoToStoreFmt } from './build-cobertura-frontier.mjs';

const covDir = path.resolve('data-research/cobertura-presidencial');
const registros = JSON.parse(fs.readFileSync(path.join(covDir, 'registros-pres-br.json'), 'utf8'));
const store = fs.readFileSync('data/surveys.ndjson', 'utf8').trim().split('\n').map(JSON.parse);

const byProto = registros.find.bind(registros);
const get = (p) => registros.find((x) => x.NR_PROTOCOLO_REGISTRO === p);

// ---- 1. Known truth targets -------------------------------------------------
const targets = [
  ['BR014692026', 'STATE', 'RR', 'Veritá'],
  ['BR038122026', 'STATE', 'AM', 'AtlasIntel'],
  ['BR058082026', 'STATE', 'SE', 'Instituto França'],
];
console.log('=== TARGET CHECKS ===');
for (const [proto, wantScope, wantUf, label] of targets) {
  const rec = get(proto);
  const c = classify(rec);
  const ok = c.scope === wantScope && c.uf === wantUf;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${proto}: got ${c.scope}${c.uf ? '/' + c.uf : ''} (want ${wantScope}/${wantUf}) [${c.basis}]`);
}
// National trackers: pick Datafolha/Quaest/AtlasIntel registrations that the
// live store labels 'nacional' (ground truth), and confirm they classify NATIONAL.
const storeByProtoTmp = new Map();
for (const s of store) if (s.tse_registration) storeByProtoTmp.set(String(s.tse_registration), s);
const natTrackers = registros.filter((x) => {
  const s = storeByProtoTmp.get(protoToStoreFmt(x.NR_PROTOCOLO_REGISTRO));
  return /datafolha|quaest|atlas|ipec|ipespe|genial|paran/i.test(x.NM_EMPRESA_FANTASIA || '') &&
    s && s.universe && s.universe.level === 'nacional';
});
console.log('\n=== NATIONAL TRACKER CHECKS (store-labeled nacional, major institutes) ===');
for (const rec of natTrackers.slice(0, 6)) {
  const c = classify(rec);
  console.log(`${c.scope === 'NATIONAL' ? 'PASS' : 'FAIL'} ${rec.NM_EMPRESA_FANTASIA} ${rec.NR_PROTOCOLO_REGISTRO}: ${c.scope} [${c.basis}]`);
}

// ---- 2. Agreement vs store ground truth (protocol-matched) ------------------
const storeByProto = new Map();
for (const s of store) if (s.tse_registration) storeByProto.set(String(s.tse_registration), s);

let agree = 0, disagree = 0, natVsUf = 0, ufVsNat = 0, ufMismatch = 0, uncertainVsLabel = 0;
const disagreements = [];
for (const rec of registros) {
  const sp = protoToStoreFmt(rec.NR_PROTOCOLO_REGISTRO);
  const s = storeByProto.get(sp);
  if (!s) continue;
  const truthLevel = s.universe && s.universe.level; // 'nacional' | 'uf'
  const truthUf = s.universe && s.universe.uf;
  const c = classify(rec);
  let match = false;
  if (truthLevel === 'nacional') match = c.scope === 'NATIONAL';
  else if (truthLevel === 'uf') match = c.scope === 'STATE' && c.uf === truthUf;
  if (match) agree++;
  else {
    disagree++;
    if (truthLevel === 'nacional' && c.scope === 'STATE') natVsUf++;
    else if (truthLevel === 'uf' && c.scope === 'NATIONAL') ufVsNat++;
    else if (truthLevel === 'uf' && c.scope === 'STATE') ufMismatch++;
    else if (c.scope === 'UNCERTAIN') uncertainVsLabel++;
    disagreements.push({ proto: rec.NR_PROTOCOLO_REGISTRO, inst: rec.NM_EMPRESA_FANTASIA, truth: truthLevel + '/' + (truthUf || ''), got: c.scope + '/' + (c.uf || ''), basis: c.basis });
  }
}
console.log(`\n=== STORE-LABELED AGREEMENT (${agree + disagree} protocol-matched) ===`);
console.log(`agree=${agree} disagree=${disagree}  (natLabeled->state:${natVsUf}, ufLabeled->national:${ufVsNat}, uf wrong-uf:${ufMismatch}, ->uncertain:${uncertainVsLabel})`);
console.log(`accuracy=${(100 * agree / (agree + disagree)).toFixed(1)}%`);
console.log('\n--- disagreements ---');
for (const d of disagreements) console.log(JSON.stringify(d));
