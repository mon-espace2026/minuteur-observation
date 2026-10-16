/* Pure timing calculations, shared by the page and the local checks. */
(function (root) {
  'use strict';
  const INTERVAL = 120000;
  function initial() { return { status: 'ready', elapsed: 0, startedAt: null }; }
  function elapsed(state, now) {
    return Math.max(0, state.elapsed + (state.status === 'running' ? Math.max(0, now - state.startedAt) : 0));
  }
  function view(state, now) {
    const ms = elapsed(state, now);
    const within = ms % INTERVAL;
    return { elapsed: ms, slot: Math.floor(ms / INTERVAL) + 1, within, remaining: Math.ceil((INTERVAL - within) / 1000) };
  }
  function start(state, now) {
    if (state.status !== 'ready' && state.status !== 'paused') return state;
    return { status: 'running', elapsed: state.elapsed, startedAt: now };
  }
  function stop(state, now, status) { return { status, elapsed: elapsed(state, now), startedAt: null }; }
  function valid(state) {
    return state && ['ready', 'running', 'paused', 'ended'].includes(state.status) && Number.isFinite(state.elapsed) && state.elapsed >= 0 && (state.status === 'running' ? Number.isFinite(state.startedAt) && state.startedAt > 0 : state.startedAt === null);
  }
  function format(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const rest = seconds % 60;
    const two = n => String(n).padStart(2, '0');
    return hours ? `${two(hours)}:${two(minutes)}:${two(rest)}` : `${two(minutes)}:${two(rest)}`;
  }
  const api = { INTERVAL, initial, elapsed, view, start, stop, valid, format };
  root.ObservationTimer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
