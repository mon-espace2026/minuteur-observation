/* No external requests: the observation state stays in this browser. */
(() => {
  'use strict';
  const T = window.ObservationTimer;
  const $ = id => document.getElementById(id);
  const KEY = 'observation-timer-v1';
  let state = T.initial();
  let wakeLock = null;
  let wakePending = false;
  let lastSlot = 1;
  let action = 'finish';
  function notice(message) { $('notice').textContent = message; $('notice').hidden = !message; }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (T.valid(saved) && saved.status !== 'ready') {
      state = saved;
      notice(saved.status === 'running' ? 'Observation récupérée. Le temps écoulé pendant la fermeture ou le rechargement de la page est inclus.' : 'Votre dernière observation a été récupérée sur cet appareil.');
    }
  } catch { notice('La récupération automatique est indisponible. Gardez cette page ouverte pendant votre observation.'); }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { notice('La sauvegarde locale est indisponible. Un rechargement pourrait faire perdre votre progression.'); }
  }
  async function updateWakeLock() {
    if (state.status !== 'running' || document.visibilityState !== 'visible') {
      if (wakeLock) { const old = wakeLock; wakeLock = null; try { await old.release(); } catch {} }
      return;
    }
    if (wakeLock || wakePending || !('wakeLock' in navigator)) return;
    wakePending = true;
    try {
      const acquired = await navigator.wakeLock.request('screen');
      if (state.status !== 'running' || document.visibilityState !== 'visible') { await acquired.release(); return; }
      wakeLock = acquired;
      acquired.addEventListener('release', () => {
        if (wakeLock === acquired) {
          wakeLock = null;
        }
      });
    } catch { /* Screen locking remains controlled by the device when unavailable. */ }
    finally { wakePending = false; }
  }
  function render() {
    const v = T.view(state, Date.now());
    $('slot').textContent = String(v.slot).padStart(2, '0');
    $('clock').textContent = T.format(v.within / 1000);
    $('total').textContent = T.format(v.elapsed / 1000);
    $('progress-fill').style.width = `${v.within / T.INTERVAL * 100}%`;
    $('progress').setAttribute('aria-valuenow', Math.floor(v.within / 1000));
    const labels = { ready: 'Prêt', running: 'En cours', paused: 'En pause', ended: 'Terminée' };
    $('status').textContent = labels[state.status];
    $('status').className = `status ${state.status}`;
    $('primary').textContent = { ready: 'Démarrer l’observation', running: 'Pause', paused: 'Reprendre', ended: 'Nouvelle observation' }[state.status];
    $('finish').hidden = state.status === 'ready' || state.status === 'ended';
    document.title = state.status === 'ready' ? 'Minuteur d’observation' : `Plage ${v.slot} · ${T.format(v.within / 1000)}`;
    if (v.slot !== lastSlot) {
      $('announcement').textContent = `Plage ${v.slot}`;
      lastSlot = v.slot;
    }
  }
  function changed() { save(); render(); void updateWakeLock(); }
  function confirmAction(type) {
    action = type;
    $('dialog-title').textContent = type === 'finish' ? 'Terminer l’observation ?' : 'Commencer une nouvelle observation ?';
    $('dialog-description').textContent = type === 'finish' ? 'Le chronomètre sera arrêté. Le temps total et la plage resteront affichés. Le temps continue de s’écouler jusqu’à votre confirmation si l’observation est en cours.' : 'Le temps et le numéro de plage seront remis à zéro. La dernière observation sera remplacée.';
    $('confirm').textContent = type === 'finish' ? 'Terminer' : 'Remettre à zéro';
    $('confirm-dialog').showModal();
    $('cancel').focus();
  }
  $('primary').addEventListener('click', () => {
    if (state.status === 'ended') { confirmAction('new'); return; }
    notice('');
    state = state.status === 'running' ? T.stop(state, Date.now(), 'paused') : T.start(state, Date.now());
    changed();
  });
  $('finish').addEventListener('click', () => confirmAction('finish'));
  $('cancel').addEventListener('click', () => $('confirm-dialog').close());
  $('confirm').addEventListener('click', () => {
    state = action === 'finish' ? T.stop(state, Date.now(), 'ended') : T.initial();
    $('confirm-dialog').close(); notice(''); changed(); $('primary').focus();
  });
  document.addEventListener('visibilitychange', () => { render(); void updateWakeLock(); });
  window.addEventListener('pageshow', () => { render(); void updateWakeLock(); });
  // Avoid two tabs silently running different observations on the same device.
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    try {
      const updated = JSON.parse(event.newValue);
      if (T.valid(updated)) { state = updated; notice('Observation mise à jour depuis un autre onglet.'); render(); void updateWakeLock(); }
    } catch {}
  });
  lastSlot = T.view(state, Date.now()).slot;
  render(); void updateWakeLock();
  setInterval(render, 100);
})();
