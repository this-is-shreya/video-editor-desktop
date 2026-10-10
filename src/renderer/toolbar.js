(function () {
  const $ = (id) => document.getElementById(id);
  let timer = null;
  cursorStudio.onToolbarState((s) => {
    if (s.phase === 'countdown') { $('n').textContent = s.n; return; }
    if (s.phase === 'recording') {
      $('count').hidden = true; $('live').hidden = false;
      $('toggle').hidden = $('trk').hidden = !s.canTrack;
      const t0 = s.startedAt;
      clearInterval(timer);
      timer = setInterval(() => {
        const sec = Math.floor((Date.now() - t0) / 1000);
        $('t').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
      }, 250);
    }
  });
  cursorStudio.onToolbarTracking((d) => {
    $('trk').textContent = d.active ? 'Tracking cursor' : 'Cursor off';
    $('trk').classList.toggle('on', d.active);
    $('toggle').textContent = d.active ? 'Stop tracking' : 'Track cursor';
  });
  $('stop').onclick = () => cursorStudio.toolbarStop();
  $('toggle').onclick = () => cursorStudio.toolbarToggle();
})();
