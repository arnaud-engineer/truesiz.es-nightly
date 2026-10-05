// Optional SDK guards: the historical manual workflow does not depend on this module.
import { DetectionSession } from './gpt-engine/src/core.mjs';
import { readBrowserContext, acquireModel } from './gpt-engine/src/browser.mjs';
import { decideObject } from './gpt-engine/src/object.mjs';
import { qualifyGeometry, readSegments, readPosture, segmentContains } from './gpt-engine/src/surface.mjs';

const attach = () => {
    const app = window.TrueSizes;
    if (!app?.state.initialized) return;
    const square = document.getElementById('square');
    app.state.surfaceGuard = () => segmentContains(readSegments(window), square.getBoundingClientRect()).admissible;
    const session = new DetectionSession();
    let captured = -1;
    const surfaceSample = () => [readSegments(window), readPosture(window)];
    let surface = surfaceSample();
    app.state.watch = () => {
        const next = surfaceSample();
        if (JSON.stringify(next) === JSON.stringify(surface)) return;
        const [segments, posture] = next;
        const priorSegments = surface[0];
        const rect = square.getBoundingClientRect();
        const unsafe = JSON.stringify(posture) !== JSON.stringify(surface[1])
            || segments.value?.length > 1 || priorSegments.value?.length > 1
            || !segmentContains(segments, rect).admissible;
        surface = next;
        // A single viewport segment resizing does not change the CSS/cm mapping.
        if (unsafe) app.review(); else app.checkContext();
    };
    app.state.kernel = (width, height, capacity) => {
        const qualified = qualifyGeometry([square], element => getComputedStyle(element));
        const { context } = readBrowserContext({ window, zone: 'heritage-frame',
            zoneGeometry: qualified ? 'controlled-untransformed' : 'unqualified' });
        session.observe(context);
        if (captured !== app.state.revision && qualified && app.state.reference) {
            const ref = app.state.reference;
            // One scalar fit with both edges checked, not two independent measurements.
            for (const [axis, referenceCm] of [['x', ref.width], ['y', ref.height]]) {
                session.calibrate({ axis, cssLength: referenceCm * app.q(), referenceCm,
                    referenceKind: 'nominal-object', context, zone: context.zone });
            }
            captured = app.state.revision;
        }
        const result = decideObject({ width, height, context, revision: session.revision,
            calibrations: session.calibrations, capacity });
        return result;
    };
    const button = document.getElementById('identify-device');
    const output = document.getElementById('model-result');
    let epoch = 0;
    button.disabled = false;
    output.textContent = '';
    button.addEventListener('click', async () => {
        const token = ++epoch;
        button.disabled = true; output.textContent = 'reading...';
        try {
            const result = await acquireModel({ navigator, requested: true });
            if (token !== epoch) return;
            output.textContent = result.state === 'available' ? result.value + ' (browser-reported)' : 'model: ' + result.state;
            if (result.state === 'available') {
                window.cScreen.name = result.value + ' (browser-reported)';
                document.getElementById('deviceName').textContent = window.cScreen.name;
            }
        } catch { output.textContent = 'model: unavailable'; }
        finally { if (token === epoch) button.disabled = false; }
    });
    app.renderObject();
};
if (window.TrueSizes?.state.initialized) attach();
else document.addEventListener('DOMContentLoaded', attach, { once: true });
