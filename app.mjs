// SPDX-License-Identifier: MPL-2.0
import { DeviceDetector } from './gpt-engine/src/detector.mjs';
import { graduations } from './gpt-engine/src/object.mjs';

const byId = id => document.getElementById(id);
const states = { 'not-requested':'Non demande', available:'Disponible', unsupported:'Indisponible', empty:'Vide',
  omitted:'Omis', denied:'Refuse', timeout:'Delai depasse', cancelled:'Annule', error:'Erreur', invalid:'Invalide' };
const operations = { saved:'Profil GPT enregistre', removed:'Profil GPT efface', missing:'Aucun profil GPT',
  'needs-reconfirmation':'Proposition restauree : axes a reconfirmer', denied:'Stockage refuse',
  'quota-exceeded':'Stockage plein', error:'Stockage indisponible', invalid:'Valeur ou profil invalide',
  'unsupported-version':'Version de profil non prise en charge', cancelled:'Operation annulee' };
const PREF_KEY = 'gpt-truesizes:preferences:v1';
let engine, axis = 'x', view = 'reference', rotation = 0, painting = false, disposed = false;
const drafts = { x:{ cm:10, px:200 }, y:{ cm:10, px:150 } };
const presetLengths = { card:{ x:8.56, y:5.398 }, five:{ x:5, y:5 }, ten:{ x:10, y:10 }, twenty:{ x:20, y:20 } };
let screenListSignature = null;
let previousUnit = 'cm', selectedDeclaration = null, selectionRevision = null;

function operation(message) { byId('operation-status').textContent = message; }
function storage(action) { try { return action(window.localStorage); } catch { return { status:'denied', profile:null }; } }
function setTheme() {
  const theme = byId('theme').value;
  document.documentElement.dataset.theme = theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
}
function preferences(write = false) {
  if (write) {
    const result = storage(store => { store.setItem(PREF_KEY, JSON.stringify({ version:1, theme:byId('theme').value,
      unit:byId('unit').value, graduations:byId('graduations').checked })); return { status:'saved' }; });
    if (result.status !== 'saved') operation(operations[result.status]);
  } else storage(store => {
    const raw = store.getItem(PREF_KEY); if (!raw || raw.length > 512) return;
    try {
      const prefs = JSON.parse(raw);
      if (prefs.version === 1 && ['auto','light','dark'].includes(prefs.theme) && ['cm','in'].includes(prefs.unit)
        && typeof prefs.graduations === 'boolean') {
        byId('theme').value = prefs.theme; byId('unit').value = prefs.unit; byId('graduations').checked = prefs.graduations;
      }
    } catch {}
  });
  setTheme();
}
function referenceCapacity() {
  const rect = byId('stage').getBoundingClientRect();
  return Math.max(0, (axis === 'x' ? rect.width : rect.height) - 64);
}
function ticks(container, ratio, length, unit, axis) {
  const fragment = document.createDocumentFragment();
  if (byId('graduations').checked) for (const item of graduations({ cssPerCm:ratio, lengthCss:length, unit })) {
    const tick = document.createElement('i'); tick.className = item.major ? 'tick major' : 'tick';
    tick.style[axis === 'x' ? 'left' : 'top'] = item.cssPosition + 'px';
    if (item.label !== null && item.cssPosition > 20 && item.cssPosition < length - 24) {
      const label = document.createElement('span'); label.textContent = item.label; tick.append(label);
    }
    fragment.append(tick);
  }
  container.replaceChildren(fragment);
}
function renderScreens(snapshot) {
  const signature = JSON.stringify(snapshot.surface); if (signature === screenListSignature) return;
  screenListSignature = signature;
  const select = byId('screen-choice'); select.replaceChildren();
  for (const [index, screen] of snapshot.surface.screens.entries()) {
    const option = document.createElement('option'); option.value = screen.id;
    option.textContent = `Ecran ${index + 1}${screen.internal === null ? '' : screen.internal ? ' integre' : ' externe'}${screen.widthCss && screen.heightCss ? ` (${screen.widthCss} x ${screen.heightCss} CSS)` : ''}`;
    select.append(option);
  }
  select.value = snapshot.surface.selectedId ?? '';
  select.hidden = !snapshot.surface.screens.length; byId('disconnect-screens').hidden = select.hidden;
  byId('surface-status').textContent = snapshot.surface.status === 'available' ? 'Surface proposee, non qualifiee'
    : snapshot.surface.status === 'not-requested' ? 'Liaison indeterminee' : states[snapshot.surface.status];
}
function renderObservations(snapshot) {
  const values = { 'Ecran CSS':`${snapshot.context.screenWidthCss ?? '?'} x ${snapshot.context.screenHeightCss ?? '?'}`,
    DPR:snapshot.context.pageDpr ?? 'Inconnu', 'Echelle visuelle':snapshot.context.visualScale ?? 'Inconnue',
    Revision:snapshot.revision, Segments:snapshot.observations.segments.state === 'available' ? snapshot.observations.segments.value.length : states[snapshot.observations.segments.state],
    Posture:snapshot.observations.posture.value ?? states[snapshot.observations.posture.state] };
  const fragment = document.createDocumentFragment();
  for (const [name,value] of Object.entries(values)) {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = name; dd.textContent = String(value); row.append(dt,dd); fragment.append(row);
  }
  byId('observations').replaceChildren(fragment);
}
function paint() {
  if (!engine || painting || disposed) return; painting = true;
  try {
    const rect = byId('stage').getBoundingClientRect();
    const decision = engine.decideObject({ width:byId('object-width').valueAsNumber, height:byId('object-height').valueAsNumber,
      unit:byId('unit').value, rotation, capacity:{ width:Math.max(0,rect.width-64), height:Math.max(0,rect.height-64) } });
    const snapshot = engine.snapshot;
    if (selectionRevision !== snapshot.revision) {
      selectedDeclaration = null; selectionRevision = snapshot.revision; search();
    }
    document.documentElement.dataset.engineVersion = snapshot.version;
    document.documentElement.dataset.revision = String(snapshot.revision);
    document.documentElement.dataset.decision = decision.status; document.documentElement.dataset.view = view;
    const line = byId('reference-line'), object = byId('object-frame');
    const px = byId('reference-px').valueAsNumber, cm = byId('reference-cm').valueAsNumber;
    const limit = referenceCapacity(), fits = Number.isFinite(px) && px > 0 && px <= limit;
    line.classList.toggle('vertical',axis === 'y');
    line.style.width = (axis === 'x' ? px : 2) + 'px'; line.style.height = (axis === 'y' ? px : 2) + 'px';
    line.hidden = view !== 'reference' || !fits;
    byId('reference-slider').max = String(Math.max(1,limit));
    if (Number.isFinite(px) && px > 0) byId('reference-slider').value = String(px);
    byId('align').disabled = !fits || !Number.isFinite(cm) || cm <= 0 || !Number.isFinite(px/cm) || px/cm <= 0
      || snapshot.context.zoneGeometry !== 'controlled-untransformed' || document.visibilityState !== 'visible' || view !== 'reference';
    const active = new Map(snapshot.calibrations.map(item => [item.axis,item]));
    for (const key of ['x','y']) byId('axis-'+key).textContent = active.has(key) ? `${active.get(key).cssPerCm.toFixed(3)} px/cm` : 'A reconfirmer';
    byId('save').disabled = active.size === 0; object.hidden = view !== 'object' || decision.status !== 'reference-scaled';
    if (!object.hidden) {
      object.style.width = decision.widthCss + 'px'; object.style.height = decision.heightCss + 'px';
      ticks(byId('ticks-x'),decision.axes.x.cssPerCm,decision.widthCss,byId('unit').value,'x');
      ticks(byId('ticks-y'),decision.axes.y.cssPerCm,decision.heightCss,byId('unit').value,'y');
    } else { object.style.width = '0px'; object.style.height = '0px'; byId('ticks-x').replaceChildren(); byId('ticks-y').replaceChildren(); }
    const status = decision.status === 'reference-scaled' ? 'Selon la reference'
      : decision.status === 'needs-reference' ? 'Reference manquante'
        : decision.status === 'out-of-zone' ? 'Objet hors zone'
          : decision.reason === 'invalid-object-request' || decision.reason === 'numeric-overflow' ? 'Dimensions invalides' : 'Contexte a revoir';
    byId('decision-status').textContent = status; byId('stage-empty').hidden = !object.hidden || !line.hidden;
    byId('stage-empty').textContent = view === 'reference' && !fits ? 'Reference hors zone' : status;
    byId('measure-caption').textContent = view === 'reference' ? `${axis === 'x' ? 'Horizontal' : 'Vertical'} : ${fits ? px+' px' : 'hors zone'}`
      : decision.status === 'reference-scaled' ? `${decision.widthCm.toFixed(3)} x ${decision.heightCm.toFixed(3)} cm (${decision.widthCss.toFixed(2)} x ${decision.heightCss.toFixed(2)} px)` : '';
    byId('model').textContent = snapshot.model.state === 'available' ? snapshot.model.value : states[snapshot.model.state];
    byId('machine-name').textContent = snapshot.identity.machine.candidates.length ? snapshot.identity.machine.candidates.map(row=>row.name).join(' / ') : 'Indeterminee';
    renderScreens(snapshot); renderObservations(snapshot);
  } finally { painting = false; }
}
function setView(next) { view = next; document.querySelector(`input[name=view][value=${next}]`).checked = true; paint(); }
function editReference() {
  drafts[axis] = { cm:byId('reference-cm').valueAsNumber, px:byId('reference-px').valueAsNumber }; engine.reviewAxis(axis); paint();
}
function search() {
  const select = byId('device-choice');
  const result = engine.search(byId('device-query').value), options = new Map(result.rows.map(row=>[row.id,row.name]));
  for (const row of [...engine.snapshot.identity.machine.candidates, ...engine.snapshot.identity.panel.candidates]) options.set(row.id,row.name);
  select.replaceChildren(new Option('Inconnu / non selectionne',''));
  for (const [id,name] of options) select.add(new Option(name,id));
  if (options.has(selectedDeclaration)) select.value = selectedDeclaration;
  byId('candidate-status').textContent = result.total ? `${result.total} declarations, non verifiees` : 'Identite non certifiee';
}
async function init() {
  preferences();
  previousUnit = byId('unit').value;
  const response = await fetch('gpt-engine/catalogue/runtime-graph.json'); if (!response.ok) throw new Error('Catalogue unavailable');
  const bytes = await response.text(); if (bytes.length > 4000000) throw new Error('Catalogue budget exceeded');
  engine = new DeviceDetector({ window, zone:byId('stage'), elements:[byId('reference-line'),byId('object-frame')], graph:JSON.parse(bytes) });
  engine.subscribe(paint); engine.start();
  for (const radio of document.querySelectorAll('input[name=axis]')) radio.addEventListener('change',()=>{
    axis = radio.value; byId('reference-cm').value = String(drafts[axis].cm); byId('reference-px').value = String(drafts[axis].px); setView('reference');
  });
  for (const radio of document.querySelectorAll('input[name=view]')) radio.addEventListener('change',()=>setView(radio.value));
  for (const name of ['reference-cm','reference-px']) byId(name).addEventListener('input',()=>{ byId('reference-preset').value='custom'; editReference(); });
  byId('reference-slider').addEventListener('input',()=>{ byId('reference-px').value=byId('reference-slider').value; editReference(); });
  byId('reference-preset').addEventListener('change',()=>{
    const preset = presetLengths[byId('reference-preset').value];
    if (preset) { for (const key of ['x','y']) { drafts[key].cm=preset[key]; engine.reviewAxis(key); } byId('reference-cm').value=String(drafts[axis].cm); }
    setView('reference'); editReference();
  });
  byId('align').addEventListener('click',()=>{
    paint(); if (byId('align').disabled) return;
    const result = engine.calibrate({ axis,cssLength:byId('reference-px').valueAsNumber,referenceCm:byId('reference-cm').valueAsNumber });
    operation(result.status==='reference-scaled' ? `Axe ${axis==='x'?'horizontal':'vertical'} aligne, non verifie` : operations[result.status]);
    if (engine.snapshot.calibrations.length===2) setView('object'); else paint();
  });
  for (const name of ['object-width','object-height']) byId(name).addEventListener('input',paint);
  byId('unit').addEventListener('change',()=>{
    const next = byId('unit').value;
    for (const name of ['object-width','object-height']) {
      const input = byId(name), value = input.valueAsNumber;
      if (Number.isFinite(value)) input.value = String(value * (previousUnit === 'in' ? 2.54 : 1) / (next === 'in' ? 2.54 : 1));
    }
    previousUnit = next; preferences(true); paint();
  });
  byId('rotate').addEventListener('click',()=>{ rotation=rotation===0?90:0; byId('rotate').setAttribute('aria-pressed',String(rotation===90)); paint(); });
  byId('graduations').addEventListener('change',()=>{ preferences(true); paint(); });
  byId('theme').addEventListener('change',()=>{ preferences(true); paint(); });
  byId('identify').addEventListener('click',async()=>{
    byId('identify').disabled=true;
    try { const result=await engine.identify({requested:true}); operation(result.status==='cancelled'?'Acquisition annulee':'Identification indicative'); search(); }
    catch { operation('Acquisition indisponible'); } finally { byId('identify').disabled=false; paint(); }
  });
  byId('device-query').addEventListener('input',search);
  byId('device-choice').addEventListener('change',()=>{ selectedDeclaration = byId('device-choice').value||null; engine.selectDeclaration(selectedDeclaration); paint(); });
  byId('save').addEventListener('click',()=>{ const result=storage(store=>engine.save(store,{requested:true})); operation(operations[result.status]??'Profil non enregistre'); });
  byId('restore').addEventListener('click',()=>{
    const result=storage(store=>engine.restore(store));
    if (result.status==='needs-reconfirmation') {
      for (const item of result.profile.axes) drafts[item.axis]={cm:item.referenceCm,px:item.cssLength};
      byId('reference-cm').value=String(drafts[axis].cm); byId('reference-px').value=String(drafts[axis].px); setView('reference');
    } operation(operations[result.status]??'Profil indisponible'); paint();
  });
  byId('reset').addEventListener('click',()=>{ const result=storage(store=>engine.reset(store,{requested:true})); operation(operations[result.status]??'Profil non efface'); setView('reference'); });
  byId('screens').addEventListener('click',async()=>{
    byId('screens').disabled=true;
    try { await engine.requestScreens({requested:true}); paint(); } catch { operation('Ecrans indisponibles'); } finally { byId('screens').disabled=false; }
  });
  byId('screen-choice').addEventListener('change',()=>engine.selectScreen(byId('screen-choice').value));
  byId('disconnect-screens').addEventListener('click',()=>engine.disconnectScreens());
  byId('fullscreen').addEventListener('click',async()=>{
    try { if (document.fullscreenElement) await document.exitFullscreen(); else { const result=await engine.fullscreen(document.documentElement); if (result.status!=='available') operation(states[result.status]); } }
    catch { operation('Plein ecran indisponible'); } paint();
  });
  window.addEventListener('pagehide',event=>{ if (!event.persisted) disposed=true; });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',setTheme);
  search(); paint();
}
init().catch(()=>{ byId('decision-status').textContent='Moteur indisponible'; byId('stage-empty').textContent='Aucun rendu de mesure'; operation('Chargement impossible'); });
