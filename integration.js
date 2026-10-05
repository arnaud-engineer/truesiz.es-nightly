/* Historical UI adapter. Nominal guesses and human references stay separate. */
window.TrueSizes = (function () {
    'use strict';
    var PROFILE_KEY = 'truesizes:heritage:profiles:v1';
    var PREF_KEY = 'truesizes:heritage:preferences:v1';
    var state = { basis: 'nominal', q: null, calibrating: false, preferences: false,
        context: null, calibrationContext: null, reference: null, kernel: null, revision: 0,
        storageMessage: '', initialized: false, sizingMessage: '', statusMessage: '', scaleChosen: false, objectEdited: false };
    function element(id) { return document.getElementById(id); }
    function positive(value) { return typeof value === 'number' && isFinite(value) && value > 0; }
    function diagonal(value) { return positive(value) && value >= 1 && value <= 250; }
    function parse(key) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw || raw.length > 65536) return null;
            var value = JSON.parse(raw); return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        }
        catch (error) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); state.storageMessage = ''; return true; }
        catch (error) { state.storageMessage = 'Not saved: browser storage unavailable.'; notice(); return false; }
    }
    function remove(key) {
        try { localStorage.removeItem(key); }
        catch (error) { state.storageMessage = 'Browser storage unavailable.'; notice(); }
    }
    function geometry() {
        for (var node = element('square'); node; node = node.parentElement) {
            try {
                var style = getComputedStyle(node);
                if (style.transform !== 'none' || style.perspective !== 'none' || (style.zoom && style.zoom !== '1' && style.zoom !== 'normal')) return false;
                for (var i = 0, properties = ['scale', 'rotate', 'translate', 'offset-path']; i < properties.length; i++) {
                    var value = style.getPropertyValue(properties[i]);
                    if (value && value !== 'none') return false;
                }
            } catch (error) { return false; }
        }
        return true;
    }
    function context() {
        var scale = window.visualViewport ? window.visualViewport.scale : null;
        return JSON.stringify([screen.width, screen.height, window.devicePixelRatio, scale, geometry()]);
    }
    function nominalQ() { return Math.sqrt(screen.width * screen.width + screen.height * screen.height) / (cScreen.diagonal * 2.54); }
    function q() { return positive(state.q) ? state.q : nominalQ(); }
    function capacity() {
        var main = document.querySelector('main'), style = getComputedStyle(main);
        return { width: Math.max(1, main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)),
            height: Math.max(1, main.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - (state.preferences || state.calibrating ? 0 : 60)) };
    }
    function reference() {
        var item = lcalibObjects[cScreen.preferredCalibrationObject] || lcalibObjects[0];
        var portrait = window.innerWidth < window.innerHeight;
        return { name: item.name, width: portrait ? item.height : item.width, height: portrait ? item.width : item.height };
    }
    function notice() {
        var message = state.sizingMessage || state.storageMessage || state.statusMessage;
        element('instructions').textContent = message;
        element('instructions').style.display = state.preferences || (state.calibrating && !state.sizingMessage && !state.storageMessage) ? 'none' : 'block';
    }
    function metadata() {
        element('deviceName').textContent = cScreen.name || 'Unknown device';
        element('deviceScreenSize').textContent = diagonal(cScreen.diagonal) ? cScreen.diagonal.toFixed(1) + ' inch. (nominal)' : 'unknown';
        element('deviceResolution').textContent = Math.round(screen.width * devicePixelRatio) + ' x ' + Math.round(screen.height * devicePixelRatio) + ' (reported)';
    }
    function status() {
        var active = state.basis === 'reference';
        var title = state.calibrating ? 'aligning reference' : active ? 'reference aligned' : state.basis === 'proposal' ? 'saved scale: recheck' : 'nominal estimate';
        element('calibrationStatus').textContent = title;
        element('calibrationStatus').dataset.basis = state.basis;
        element('calibrationIconImg').src = 'rsrc/img/' + (active ? 'valid-icon.svg' : state.calibrating ? 'calibration-icon.svg' : 'approximation-icon-v2.svg');
        element('confirm-calibration-button').style.display = !state.calibrating && state.basis === 'proposal' ? 'inline-block' : 'none';
        element('confirm-calibration-button').textContent = 'check reference';
        element('reset-button').style.display = state.basis !== 'nominal' || state.calibrating ? 'inline-block' : 'none';
        element('calibration-button').textContent = state.calibrating ? 'finish alignment' : 'manual calibration';
        element('calibration-button').setAttribute('onclick', state.calibrating ? 'calibrationModeOff();' : 'calibrationModeOn();');
        element('calibrationTools').style.display = state.calibrating ? 'block' : 'none';
        element('calibration-zoom').style.display = state.calibrating ? 'flex' : 'none';
        element('input-form').style.display = state.calibrating ? 'none' : 'block';
        document.body.classList.toggle('aligning', state.calibrating);
        state.statusMessage = state.calibrating ? 'Align both edges before finishing.' : active ? '' : state.basis === 'proposal' ? 'Recheck this saved scale against a reference.' : 'Estimated size. Check against a reference.';
        metadata(); notice();
    }
    function render(widthCm, heightCm) {
        if (state.preferences) return true;
        var square = element('square'), space = capacity();
        var width = widthCm * q(), height = heightCm * q();
        var failure = !positive(widthCm) || !positive(heightCm) || !positive(width) || !positive(height) ? 'Enter positive width and height.'
            : !geometry() ? 'Measurement unavailable: the frame is transformed.'
            : width > space.width || height > space.height ? 'Too large for this window. Choose a smaller size or enlarge the window.' : '';
        if (!failure && state.kernel && state.basis === 'reference') {
            try {
                var decision = state.kernel(widthCm, heightCm, space);
                if (decision.status !== 'reference-scaled') failure = 'Reference needs to be checked again.';
                else { width = decision.widthCss; height = decision.heightCss; }
            } catch (error) { failure = 'Reference needs to be checked again.'; }
        }
        square.style.display = failure ? 'none' : 'flex';
        if (!failure) {
            square.style.width = width + 'px'; square.style.height = height + 'px';
            if (state.surfaceGuard && !state.surfaceGuard()) {
                failure = 'Measurement unavailable across this display segment.';
                square.style.display = 'none';
            }
            square.dataset.widthCm = widthCm; square.dataset.heightCm = heightCm;
            square.dataset.basis = state.basis;
        }
        state.sizingMessage = failure;
        element('instructions').classList.toggle('frame-error', !!failure);
        updateGraduations(); notice();
        return !failure;
    }
    function renderObject() {
        var factor = cScreen.preferredUnit === 'inches' ? 2.54 : 1;
        return render(Number(element('xVal').value) * factor, Number(element('yVal').value) * factor);
    }
    function editObject() { state.objectEdited = true; return renderObject(); }
    function renderReference() {
        var item = reference(); state.reference = item;
        return render(item.width, item.height);
    }
    function profiles() {
        var saved = parse(PROFILE_KEY);
        if (!saved || saved.version !== 1 || !Array.isArray(saved.profiles)) return [];
        return saved.profiles.slice(0, 8).filter(function (row) {
            return row && typeof row.context === 'string' && row.context.length <= 256 && positive(row.q) && row.q <= 5000
                && diagonal(row.diagonal) && (row.basis === 'reference' || row.basis === 'nominal')
                && Number.isInteger(row.object) && row.object >= 0 && row.object < lcalibObjects.length;
        });
    }
    function legacyProfiles() {
        var rows = [];
        try {
            for (var i = 0; i < localStorage.length && i < 1000; i++) {
                var key = localStorage.key(i);
                if (!/^screen \d+$/.test(key)) continue;
                var row = parse(key);
                if (row && diagonal(row.diagonal) && positive(row.wRes) && positive(row.hRes)) rows.push(row);
            }
        } catch (error) { /* Optional historical proposals only. */ }
        return rows;
    }
    function restore() {
        var list = profiles(), key = context(), row = list.find(function (item) { return item.context === key; });
        if (row) {
            state.q = row.q; cScreen.diagonal = row.diagonal; cScreen.preferredCalibrationObject = row.object;
            state.basis = 'proposal'; cScreen.confirmedCalibration = false; return 1;
        }
        var width = screen.width * devicePixelRatio, height = screen.height * devicePixelRatio;
        row = legacyProfiles().find(function (item) { return (item.wRes === width && item.hRes === height) || (item.wRes === height && item.hRes === width); });
        if (row) { cScreen.diagonal = row.diagonal; state.q = nominalQ(); state.basis = 'proposal'; return 1; }
        return -1;
    }
    function saveProfile() {
        if (!cScreen.confirmedCalibration || state.calibrating || state.basis !== 'reference') return;
        var list = profiles().filter(function (row) { return row.context !== context(); });
        list.unshift({ context: context(), q: q(), diagonal: cScreen.diagonal, basis: state.basis, object: Number(cScreen.preferredCalibrationObject) });
        write(PROFILE_KEY, { version: 1, profiles: list.slice(0, 8) }); updateProfiles();
    }
    function readPreferences() {
        var saved = parse(PREF_KEY) || parse('appData');
        if (!saved) return -1;
        if (saved.preferredUnit === 'cm' || saved.preferredUnit === 'inches') app.preferredUnit = saved.preferredUnit;
        if (['auto', 'light', 'dark'].indexOf(saved.theme) !== -1) app.theme = saved.theme;
        if (typeof saved.showGraduations === 'boolean') app.showGraduations = saved.showGraduations;
        return 1;
    }
    function savePreferences() { write(PREF_KEY, { preferredUnit: app.preferredUnit, theme: app.theme, showGraduations: app.showGraduations }); }
    function updateProfiles() {
        var list = profiles(), old = legacyProfiles();
        element('screen-list').textContent = list.length + ' new reference profile(s)' + (old.length ? '; ' + old.length + ' historical proposal(s), kept unchanged' : '') + (state.storageMessage ? '. ' + state.storageMessage : '');
    }
    function detect() {
        cScreen.diagonal = 15.4; cScreen.name = 'Unknown device';
        try {
            var ua = navigator.userAgent.toLowerCase();
            var family = /iphone/.test(ua) ? window.lIphone : /ipad/.test(ua) || (/mac/.test(ua) && navigator.maxTouchPoints > 1) ? window.lIpad
                : /android.*mobile/.test(ua) ? window.lMobile : /android|tablet/.test(ua) ? window.lTablet : window.lMonitor;
            var width = screen.width * devicePixelRatio, height = screen.height * devicePixelRatio;
            var matches = (family || []).filter(function (row) {
                return diagonal(row.screenSize) && ((Math.abs(row.wRes - width) <= 10 && Math.abs(row.hRes - height) <= 10)
                    || (Math.abs(row.wRes - height) <= 10 && Math.abs(row.hRes - width) <= 10));
            });
            var sizes = matches.map(function (row) { return row.screenSize; });
            if (matches.length && sizes.every(function (value) { return value === sizes[0]; })) {
                cScreen.diagonal = sizes[0];
                cScreen.name = matches.slice(0, 3).map(function (row) { return row.name; }).join(' / ').slice(0, 180) + ' (legacy suggestion)';
            } else if (family && family.length) {
                var fallback = family[family.length - 1];
                if (diagonal(fallback.screenSize)) cScreen.diagonal = fallback.screenSize;
                cScreen.name = fallback.name + ' (legacy estimate)';
            }
        } catch (error) { /* Old catalogue failure must not block manual sizing. */ }
        restore(); status();
    }
    function begin() {
        if (state.preferences) closePreferences();
        state.scaleChosen = true;
        state.calibrating = true; state.basis = 'draft'; state.q = q();
        state.calibrationContext = context(); cScreen.confirmedCalibration = false;
        state.revision++; status();
        var item = reference(), space = capacity();
        // A visible draft is only a starting point for the human alignment.
        state.q = Math.min(state.q, space.width / item.width, space.height / item.height);
        renderReference();
    }
    function finish() {
        if (!state.calibrating || !renderReference()) return false;
        if (state.calibrationContext !== context()) { state.calibrationContext = context(); state.sizingMessage = 'Rendering changed. Align the reference again before finishing.'; notice(); return false; }
        state.calibrating = false; state.basis = 'reference'; cScreen.confirmedCalibration = true;
        state.context = context(); state.revision++; cScreen.calibrationStatus = 4;
        status(); saveProfile(); renderObject(); return true;
    }
    function changeReference() {
        var index = Number(element('calibrationObjectsList').value);
        if (Number.isInteger(index) && index >= 0 && index < lcalibObjects.length) cScreen.preferredCalibrationObject = index;
        return renderReference();
    }
    function adjust(factor) {
        if (!state.calibrating || !positive(factor)) return;
        var next = q() * factor;
        if (!positive(next) || next < 1 || next > 5000) return;
        state.q = next; state.revision++; renderReference();
    }
    function key(event) {
        if (!state.calibrating || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
        if (['+', '=', 'ArrowUp', 'ArrowRight', '-', 'ArrowDown', 'ArrowLeft'].indexOf(event.key) === -1) return;
        event.preventDefault(); adjust(['+', '=', 'ArrowUp', 'ArrowRight'].indexOf(event.key) !== -1 ? 1.01 : 1 / 1.01);
    }
    function wheel(event) {
        if (!state.calibrating || !event.target || !element('square').contains(event.target) || event.ctrlKey) return;
        event.preventDefault(); adjust(Math.exp(Math.max(-100, Math.min(100, -event.deltaY)) * 0.0025));
    }
    function chooseDiagonal(value) {
        value = Number(value);
        if (!diagonal(value)) { state.sizingMessage = 'Enter a diagonal from 1 to 250 inches.'; notice(); return; }
        cScreen.diagonal = value; state.q = null; state.basis = 'nominal'; state.calibrating = false; state.scaleChosen = true;
        cScreen.confirmedCalibration = false; state.revision++; status(); renderObject();
    }
    function changeUnit() {
        state.objectEdited = true;
        var next = element('sizeUnit').value, previous = cScreen.preferredUnit;
        if (next !== 'cm' && next !== 'inches') return;
        if (previous !== next) {
            var factor = next === 'inches' ? 1 / 2.54 : 2.54;
            ['xVal', 'yVal'].forEach(function (id) { var value = Number(element(id).value); if (positive(value)) element(id).value = Number((value * factor).toPrecision(12)); });
        }
        cScreen.preferredUnit = next; renderObject();
    }
    function openPreferences() {
        state.preferences = true; document.body.classList.add('preferences-open');
        element('userPreferences').style.display = 'block'; element('square').style.display = 'flex';
        element('square').style.width = 'min(600px, calc(100vw - 80px))';
        element('square').style.height = Math.min(540, capacity().height) + 'px';
        element('app-settings-button').setAttribute('onclick', 'endUserPreferences();');
        ['xVal', 'yVal', 'sizeUnit'].forEach(function (id) { element(id).disabled = true; });
        updateProfiles(); updateGraduations(); notice();
    }
    function closePreferences() {
        state.preferences = false; document.body.classList.remove('preferences-open');
        element('userPreferences').style.display = 'none';
        element('app-settings-button').setAttribute('onclick', 'goUserPreferences();');
        ['xVal', 'yVal', 'sizeUnit'].forEach(function (id) { element(id).disabled = false; });
        renderObject();
    }
    function resetCalibration() {
        var remaining = profiles().filter(function (row) { return row.context !== context(); });
        if (remaining.length) write(PROFILE_KEY, { version: 1, profiles: remaining }); else remove(PROFILE_KEY);
        state.basis = 'nominal'; state.q = null; state.calibrating = false;
        cScreen.confirmedCalibration = false; state.revision++; status(); renderObject(); updateProfiles();
    }
    function resetAppData() { remove(PROFILE_KEY); remove(PREF_KEY); }
    function checkContext() {
        var next = context();
        if (state.context !== next) {
            state.context = next; state.revision++;
            cScreen.dppx = devicePixelRatio; cScreen.wRes = screen.width * devicePixelRatio; cScreen.hRes = screen.height * devicePixelRatio;
            if (state.basis === 'reference' || state.basis === 'draft') {
                state.basis = state.calibrating ? 'draft' : 'proposal'; cScreen.confirmedCalibration = false;
            }
            if (state.calibrating) { state.calibrationContext = next; state.statusMessage = 'Rendering changed. Re-align both edges.'; }
            status();
        }
        if (!state.preferences) { if (state.calibrating) renderReference(); else renderObject(); }
    }
    function review() {
        if (state.basis === 'reference') { state.basis = 'proposal'; cScreen.confirmedCalibration = false; state.revision++; status(); }
        checkContext();
    }
    function fullscreen() {
        var method = document.fullscreenElement ? document.exitFullscreen : document.body.requestFullscreen;
        if (typeof method !== 'function') { state.sizingMessage = 'Fullscreen unavailable in this browser.'; notice(); return; }
        try { Promise.resolve(method.call(document.fullscreenElement ? document : document.body)).catch(function () { state.sizingMessage = 'Fullscreen was not allowed.'; notice(); }); }
        catch (error) { state.sizingMessage = 'Fullscreen was not allowed.'; notice(); }
    }
    function seedObject() {
        var item = reference(), factor = cScreen.preferredUnit === 'inches' ? 1 / 2.54 : 1;
        var space = capacity();
        if (item.width * q() > space.width || item.height * q() > space.height) {
            var side = Math.max(0.1, Math.min(5, Math.floor(Math.min(space.width, space.height) / q() * 10) / 10));
            item = { width: side, height: side };
        }
        element('xVal').value = Number((item.width * factor).toPrecision(12)); element('yVal').value = Number((item.height * factor).toPrecision(12));
    }
    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        detect(); screenSizeButtonsGeneration(); calibrationObjectsListGeneration();
        element('calibrationObjectsList').value = cScreen.preferredCalibrationObject;
        cScreen.preferredUnit = app.preferredUnit;
        element('sizeUnit').value = app.preferredUnit;
        seedObject();
        state.context = context(); renderObject(); updateProfiles();
        var module = document.createElement('script');
        module.type = 'module'; module.src = 'progress.mjs'; module.async = true;
        document.head.appendChild(module);
        document.addEventListener('keydown', key);
        element('square').addEventListener('wheel', wheel, { passive: false });
        window.addEventListener('resize', checkContext);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', checkContext);
        if (screen.orientation) screen.orientation.addEventListener('change', checkContext);
        if (screen.addEventListener) screen.addEventListener('change', review);
        document.addEventListener('visibilitychange', function () { if (document.hidden) review(); });
        window.addEventListener('pageshow', function (event) { if (event.persisted) review(); });
        var theme = matchMedia('(prefers-color-scheme: dark)');
        if (theme.addEventListener) theme.addEventListener('change', loadTheme);
        else if (theme.addListener) theme.addListener(loadTheme);
        document.addEventListener('fullscreenchange', function () {
            app.fullscreenStatus = !!document.fullscreenElement;
            element('fullscreen-button').querySelector('img').src = 'rsrc/img/' + (app.fullscreenStatus ? 'fullscreen-end-icon.svg' : 'fullscreen-icon.svg');
            element('fullscreen-button').setAttribute('onclick', app.fullscreenStatus ? 'endFullScreen();' : 'goFullScreen();');
            checkContext();
        });
        setInterval(function () {
            if (document.hidden) return;
            if (state.context !== context()) checkContext();
            if (state.watch) state.watch();
        }, 500);
    }
    function legacyReady() {
        if (!state.initialized || state.scaleChosen || state.basis !== 'nominal') return;
        detect(); if (!state.objectEdited) seedObject(); renderObject();
    }
    return { state: state, q: q, context: context, geometry: geometry, renderObject: renderObject, renderReference: renderReference,
        saveProfile: saveProfile, restore: restore, readPreferences: readPreferences, savePreferences: savePreferences,
        updateProfiles: updateProfiles, detect: detect, begin: begin, finish: finish, changeReference: changeReference,
        adjust: adjust, key: key, wheel: wheel, chooseDiagonal: chooseDiagonal, changeUnit: changeUnit,
        openPreferences: openPreferences, closePreferences: closePreferences, resetCalibration: resetCalibration,
        resetAppData: resetAppData, fullscreen: fullscreen, initialize: initialize, checkContext: checkContext,
        status: status, notice: notice, review: review, legacyReady: legacyReady, editObject: editObject };
}());
