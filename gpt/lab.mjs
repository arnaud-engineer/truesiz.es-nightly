// SPDX-License-Identifier: MPL-2.0
import { DetectionSession, decideLength, positive, CONTRACT_VERSION } from './src/core.mjs';
import { readBrowserContext, acquireModel } from './src/browser.mjs';
import { readProfile, saveProfile, removeProfile } from './src/profile.mjs';

const byId = id => document.getElementById(id);
const session = new DetectionSession();
let axis = 'x';
let currentContext;
let acquisition = null;
let lastZoneSize = null;
const dirty = { x: true, y: true };
const draft = { x: { cm: 10, px: 200 }, y: { cm: 10, px: 100 } };
const states = { available: 'Disponible', 'not-requested': 'Non demande', unsupported: 'Indisponible',
  empty: 'Vide', omitted: 'Omis', denied: 'Refuse', timeout: 'Delai depasse', cancelled: 'Annule', error: 'Erreur', invalid: 'Invalide' };
const storageStates = { saved: 'Profil enregistre', missing: 'Aucun profil GPT', removed: 'Profil GPT efface',
  denied: 'Stockage refuse', 'quota-exceeded': 'Stockage plein', error: 'Stockage indisponible', invalid: 'Profil invalide',
  'unsupported-version': 'Version de profil non prise en charge', 'needs-reconfirmation': 'Profil a reconfirmer' };

function operation(message) { byId('operation-status').textContent = message; }
function withStorage(action) {
  try { return action(window.localStorage); }
  catch { return { status: 'denied', profile: null }; }
}
function geometryQualified() {
  const seen = new Set();
  for (const root of [byId('reference-line'), byId('target-line')]) {
    let element = root;
    while (element) {
      if (seen.has(element)) break;
      seen.add(element);
      let style;
      try { style = getComputedStyle(element); }
      catch { return false; }
      if (style.transform !== 'none' || style.perspective !== 'none'
        || (style.zoom !== '1' && style.zoom !== 'normal' && style.zoom !== '')) return false;
      for (const property of ['scale', 'rotate', 'translate', 'offset-path']) {
        const value = style.getPropertyValue(property);
        if (value !== '' && value !== 'none') return false;
      }
      element = element.parentElement;
    }
  }
  return true;
}
function cancelAcquisition() {
  if (acquisition) byId('model-value').textContent = 'Non demande';
  acquisition?.abort();
  acquisition = null;
  byId('read-model').disabled = false;
}
function refreshContext(force = false) {
  const before = session.revision;
  const sample = readBrowserContext({ window, zone: 'gpt-measurement',
    zoneGeometry: geometryQualified() ? 'controlled-untransformed' : 'unqualified' });
  currentContext = sample.context;
  session.observe(currentContext, { force });
  if (session.revision !== before) {
    cancelAcquisition();
    dirty.x = true; dirty.y = true;
    byId('model-value').textContent = 'Non demande';
  }
  byId('screen-value').textContent = currentContext.screenWidthCss && currentContext.screenHeightCss
    ? `${currentContext.screenWidthCss} x ${currentContext.screenHeightCss} CSS` : 'Inconnu';
  byId('dpr-value').textContent = currentContext.pageDpr === null ? 'Inconnu' : String(currentContext.pageDpr);
}
function capacity(area) {
  const rect = area.getBoundingClientRect();
  return Math.max(0, (axis === 'x' ? rect.width : rect.height) - 16);
}
function fitLine(element, length, area) {
  const fits = positive(length) && length <= capacity(area);
  element.hidden = !fits;
  element.classList.toggle('vertical', axis === 'y');
  element.style.width = axis === 'x' ? `${length}px` : '0px';
  element.style.height = axis === 'y' ? `${length}px` : '0px';
  return fits;
}
function usableCalibrations() { return session.calibrations.filter(item => !dirty[item.axis]); }
function paint() {
  document.documentElement.dataset.contractVersion = CONTRACT_VERSION;
  document.documentElement.dataset.revision = String(session.revision);
  document.documentElement.dataset.decision = 'abstain';
  document.documentElement.dataset.renderState = 'none';
  const px = byId('reference-px').valueAsNumber;
  const cm = byId('reference-cm').valueAsNumber;
  const requested = byId('requested-cm').valueAsNumber;
  const limit = capacity(byId('reference-area'));
  byId('reference-slider').max = String(Math.max(1, limit));
  if (positive(px)) byId('reference-slider').value = String(px);
  const referenceFits = fitLine(byId('reference-line'), px, byId('reference-area'));
  byId('reference-caption').textContent = !positive(px) ? 'Longueur invalide' : referenceFits ? `${px} px` : 'Reference hors zone';
  byId('align').disabled = !referenceFits || !positive(cm) || !positive(px / cm) || currentContext?.zoneGeometry !== 'controlled-untransformed'
    || document.visibilityState !== 'visible';
  byId('save').disabled = usableCalibrations().length === 0;
  byId('target-line').hidden = true;
  byId('target-caption').textContent = 'Aucune reference';
  if (!positive(requested)) { byId('target-caption').textContent = 'Longueur invalide'; document.documentElement.dataset.renderState = 'invalid-request'; return; }
  if (!currentContext || document.visibilityState !== 'visible') { byId('target-caption').textContent = 'Contexte a revoir'; document.documentElement.dataset.renderState = 'context-review'; return; }
  const decision = decideLength({ lengthCm: requested, axis, context: currentContext, revision: session.revision,
    calibrations: usableCalibrations() });
  if (decision.status === 'reference-scaled') {
    const fits = fitLine(byId('target-line'), decision.cssLength, byId('target-area'));
    document.documentElement.dataset.renderState = fits ? 'drawn' : 'out-of-zone';
    byId('target-caption').textContent = fits ? `${requested} cm selon la reference (${decision.cssLength.toFixed(2)} px)` : 'Mesure hors zone';
  } else if (decision.status === 'abstain') {
    byId('target-caption').textContent = decision.reason === 'numeric-overflow' ? 'Longueur non representable' : 'Zone non qualifiee';
    if (decision.reason === 'numeric-overflow') document.documentElement.dataset.renderState = 'invalid-request';
  }
  else document.documentElement.dataset.renderState = 'needs-reference';
  document.documentElement.dataset.decision = decision.status;
}
function updateDraft() {
  draft[axis] = { cm: byId('reference-cm').valueAsNumber, px: byId('reference-px').valueAsNumber };
  dirty[axis] = true;
  paint();
}
function refreshAndPaint(force = false) { refreshContext(force); paint(); }

for (const radio of document.querySelectorAll('input[name=axis]')) radio.addEventListener('change', () => {
  axis = radio.value;
  byId('reference-cm').value = String(draft[axis].cm);
  byId('reference-px').value = String(draft[axis].px);
  refreshAndPaint();
});
byId('reference-cm').addEventListener('input', updateDraft);
byId('reference-px').addEventListener('input', updateDraft);
byId('reference-slider').addEventListener('input', () => { byId('reference-px').value = byId('reference-slider').value; updateDraft(); });
byId('requested-cm').addEventListener('input', () => { refreshAndPaint(); });
byId('align').addEventListener('click', () => {
  refreshContext();
  const cssLength = byId('reference-px').valueAsNumber;
  const referenceCm = byId('reference-cm').valueAsNumber;
  if (document.visibilityState !== 'visible' || !positive(cssLength) || !positive(referenceCm)
    || !positive(cssLength / referenceCm) || cssLength > capacity(byId('reference-area')) || currentContext.zoneGeometry !== 'controlled-untransformed') {
    operation('Reference non admissible'); paint(); return;
  }
  cancelAcquisition();
  session.calibrate({ axis, cssLength, referenceCm, referenceKind: 'nominal-object', context: currentContext, zone: currentContext.zone });
  dirty[axis] = false;
  operation('Echelle de reference appliquee'); paint();
});
byId('save').addEventListener('click', () => {
  const result = withStorage(storage => saveProfile(storage, usableCalibrations(), { requested: true }));
  operation(storageStates[result.status] ?? 'Profil non enregistre');
});
byId('restore').addEventListener('click', () => {
  const result = withStorage(readProfile);
  if (result.status === 'needs-reconfirmation') {
    refreshContext(true);
    for (const item of result.profile.axes) { draft[item.axis] = { cm: item.referenceCm, px: item.cssLength }; dirty[item.axis] = true; }
    byId('reference-cm').value = String(draft[axis].cm);
    byId('reference-px').value = String(draft[axis].px);
    paint();
  }
  operation(storageStates[result.status] ?? 'Profil indisponible');
});
byId('reset').addEventListener('click', () => {
  const result = withStorage(storage => removeProfile(storage, { requested: true }));
  refreshAndPaint(true); operation(storageStates[result.status] ?? 'Reference effacee');
});
byId('read-model').addEventListener('click', async () => {
  refreshContext(); cancelAcquisition();
  const controller = new AbortController(); acquisition = controller;
  const token = session.beginTask();
  byId('read-model').disabled = true;
  byId('model-value').textContent = 'En attente';
  const result = await acquireModel({ navigator, requested: true, signal: controller.signal });
  if (acquisition !== controller) return;
  // Re-read immediately before committing; elapsed acquisition is not current evidence.
  refreshContext();
  if (acquisition === controller && session.commitTask(token, result)) {
    byId('model-value').textContent = result.state === 'available' ? result.value : states[result.state];
    acquisition = null; byId('read-model').disabled = false;
  }
});
window.addEventListener('resize', () => { refreshAndPaint(true); });
window.addEventListener('orientationchange', () => { refreshAndPaint(true); });
window.addEventListener('pageshow', event => { refreshAndPaint(event.persisted); });
window.addEventListener('pagehide', () => { refreshAndPaint(true); });
document.addEventListener('visibilitychange', () => { refreshAndPaint(true); });
document.addEventListener('fullscreenchange', () => { refreshAndPaint(true); });
window.visualViewport?.addEventListener('resize', () => { refreshAndPaint(); });
const resizeObserver = new ResizeObserver(entries => {
  const rect = entries[0].contentRect;
  const next = `${rect.width}/${rect.height}`;
  if (lastZoneSize !== null && next !== lastZoneSize) refreshAndPaint(true);
  lastZoneSize = next;
});
resizeObserver.observe(byId('measurement'));
const poll = setInterval(() => { if (document.visibilityState === 'visible') refreshAndPaint(); }, 1000);
window.addEventListener('pagehide', event => {
  if (!event.persisted) { clearInterval(poll); resizeObserver.disconnect(); session.dispose(); }
});
refreshAndPaint();
