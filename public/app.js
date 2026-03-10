(function () {
  const base = window.location.origin;
  const META_INTERVAL_MS = 1000;

  const metaHostname = document.getElementById('meta-hostname');
  const metaVersion = document.getElementById('meta-version');
  const metaArch = document.getElementById('meta-arch');
  const metaColor = document.getElementById('meta-color');
  const metaAge = document.getElementById('meta-age');
  const metaMemory = document.getElementById('meta-memory');
  const metaLeakCount = document.getElementById('meta-leak-count');
  const metaStressCpu = document.getElementById('meta-stress-cpu');
  const metaStatus = document.getElementById('meta-status');
  const actionFeedback = document.getElementById('action-feedback');

  /** Format seconds as readable age: 5s, 5m08s, 2h30m, 3d02h */
  function formatAge(isoStartedAt) {
    if (!isoStartedAt) return '—';
    const sec = Math.floor((Date.now() - new Date(isoStartedAt).getTime()) / 1000);
    if (sec < 0) return '0s';
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return s > 0 ? m + 'm' + String(s).padStart(2, '0') + 's' : m + 'm';
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h < 24) return (min > 0 ? h + 'h' + String(min).padStart(2, '0') + 'm' : h + 'h');
    const d = Math.floor(h / 24);
    const hr = h % 24;
    return (hr > 0 ? d + 'd' + String(hr).padStart(2, '0') + 'h' : d + 'd');
  }

  /** Format bytes as readable size: 125 MB, 1.2 GB */
  function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  function setMeta(data) {
    metaHostname.textContent = data.hostname ?? '—';
    metaVersion.textContent = data.version ?? '—';
    metaArch.textContent = data.arch ?? '—';
    metaColor.textContent = data.color ?? '—';
    metaColor.classList.remove('text-gray-400');
    if (data.color) {
      metaColor.style.backgroundColor = data.color.startsWith('#') ? data.color : '#e8e8e8';
      metaColor.style.border = '1px solid #dbdbdb';
    } else {
      metaColor.style.backgroundColor = '';
      metaColor.style.border = '';
    }
    metaAge.textContent = formatAge(data.started_at);
    const memBytes = data.memory?.container ?? data.memory?.rss;
    metaMemory.textContent = memBytes != null ? formatBytes(memBytes) : '—';
    metaLeakCount.textContent = data.leaked_buffers_count != null ? String(data.leaked_buffers_count) : '—';
    if (data.stress_cpu === true) {
      metaStressCpu.textContent = 'ON';
      metaStressCpu.className = 'text-xl text-amber-600';
    } else if (data.stress_cpu === false) {
      metaStressCpu.textContent = 'OFF';
      metaStressCpu.className = 'text-xl text-green-600';
    } else {
      metaStressCpu.textContent = '—';
      metaStressCpu.className = 'text-xl text-gray-400';
    }
  }

  function fetchProcess() {
    Promise.all([
      fetch(base + '/api/metadata').then(function (res) { return res.ok ? res.json() : {}; }),
      fetch(base + '/api/stats').then(function (res) { return res.ok ? res.json() : {}; })
    ]).then(function ([meta, stats]) {
      setMeta(Object.assign({}, meta, stats));
    }).catch(function () {
      metaHostname.textContent = '—';
      metaVersion.textContent = '—';
      metaArch.textContent = '—';
      metaColor.textContent = '—';
      metaAge.textContent = '—';
      metaMemory.textContent = '—';
      metaLeakCount.textContent = '—';
      metaStressCpu.textContent = '—';
      metaStressCpu.className = 'text-xl text-gray-400';
    });
  }

  function setStatus(ok) {
    metaStatus.textContent = ok ? 'UP' : 'DOWN';
    metaStatus.className = 'text-xl font-semibold ' + (ok ? 'text-green-600' : 'text-red-600');
  }

  function checkHealth() {
    fetch(base + '/api/health')
      .then(function (res) {
        setStatus(res.ok);
      })
      .catch(function () {
        setStatus(false);
      });
  }

  function showFeedback(ok, message) {
    actionFeedback.textContent = message;
    actionFeedback.className = 'mt-3 p-3 rounded-lg text-lg ' + (ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
    actionFeedback.classList.remove('hidden');
    actionFeedback.setAttribute('aria-live', 'polite');
    setTimeout(function () {
      actionFeedback.classList.add('hidden');
    }, 5000);
  }

  function handleAction(ev) {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    let path;
    if (action === 'memoryLeak') path = '/api/bug/memory-leak';
    else if (action === 'crash') path = '/api/bug/crash';
    else if (action === 'stressCpu') path = '/api/stress/cpu';
    else return;

    btn.disabled = true;
    showFeedback(true, 'Sending…');

    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(function (res) {
        return res.text().then(function (raw) {
          var body;
          try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = {}; }
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .then(function (r) {
        let msg = r.body.message || (r.ok ? 'OK' : 'Error ' + r.status);
        if (r.body.count != null) msg += ' (count: ' + r.body.count + ')';
        showFeedback(r.ok, msg);
      })
      .catch(function (err) {
        showFeedback(false, err.message || 'Network error');
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  document.body.addEventListener('click', handleAction);

  checkHealth();
  fetchProcess();
  setInterval(fetchProcess, META_INTERVAL_MS);
  setInterval(checkHealth, 1000);
})();
