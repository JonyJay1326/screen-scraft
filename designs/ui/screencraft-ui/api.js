/* api.js — API 桩层：函数签名/返回结构与 docs/api.md 的真实接口一致，
   内部返回 mock 数据并模拟网络延迟。接入真实后端时只改实现。
   约定：统一响应 { code: 0, message: 'ok', data }；v1 只有 GET/POST。 */
(function () {
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms || 380); }); }
  function ok(data) { return { code: 0, message: 'ok', data: data }; }

  /* GET /projects */
  window.fetchProjects = async function () {
    await delay(420);
    // TODO: 替换为 request.get('/projects')
    return ok(DB.projects.slice());
  };

  /* POST /projects {name} */
  window.createProject = async function (name) {
    await delay(360);
    // TODO: 替换为 request.post('/projects', {name})
    var p = { id: 'p' + (DB.projects.length + 1), name: name, screenCount: 0, updatedAt: '刚刚' };
    DB.projects.unshift(p);
    return ok(p);
  };

  /* GET /projects/:pid/screens */
  window.fetchScreens = async function (projectId) {
    await delay(460);
    // TODO: 替换为 request.get('/projects/'+projectId+'/screens')
    var list = projectId ? DB.screens.filter(function (s) { return s.projectId === projectId; }) : DB.screens;
    return ok(list.slice());
  };

  /* GET /templates?scope= */
  window.fetchTemplates = async function (scope) {
    await delay(400);
    // TODO: 替换为 request.get('/templates?scope='+scope)
    var list = scope && scope !== 'all' ? DB.templates.filter(function (t) { return t.scope === scope; }) : DB.templates;
    return ok(list.slice());
  };

  /* GET /api-configs */
  window.fetchApiConfigs = async function () {
    await delay(420);
    // TODO: 替换为 request.get('/api-configs')
    return ok(DB.apiConfigs.slice());
  };

  /* POST /api-configs/:id/test {params} → {columns, rows} */
  window.testRunApi = async function (id, params) {
    await delay(800);
    // TODO: 替换为 request.post('/api-configs/'+id+'/test', {params})
    return ok(DB.apiDetail.testResult);
  };

  /* GET /users（管理员） */
  window.fetchUsers = async function () {
    await delay(380);
    // TODO: 替换为 request.get('/users')
    return ok(DB.users.slice());
  };

  /* GET /ai/kb-docs（管理员） */
  window.fetchKbDocs = async function () {
    await delay(380);
    // TODO: 替换为 request.get('/ai/kb-docs')
    return ok(DB.kbDocs.slice());
  };

  /* POST /ai/settings */
  window.saveAiSettings = async function (settings) {
    await delay(500);
    // TODO: 替换为 request.post('/ai/settings', settings)
    DB.aiSettings = Object.assign({}, DB.aiSettings, settings);
    return ok(true);
  };

  /* POST /ai/chat {question} → {answer}（固定演示回复，不调真实模型） */
  window.aiChat = async function (question) {
    await delay(700);
    // TODO: 替换为 request.post('/ai/chat', {question})
    var pool = DB.aiReplies;
    var idx = Math.abs(question.length) % pool.length;
    return ok({ answer: pool[idx] });
  };

  /* GET /weather?adcode= （内置腾讯云天气，原型返回固定 mock） */
  window.fetchWeather = async function (adcode) {
    await delay(300);
    // TODO: 替换为 request.get('/weather?adcode='+adcode)
    return ok({ city: '杭州市', district: '西湖区', weather: '多云', temperature: 29, humidity: 62, aqi: 46, updateTime: '10:00' });
  };

  /* ---------- 全局 Toast ---------- */
  window.toast = function (msg, type) {
    type = type || 'info';
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    var iconName = { ok: 'check-circle', err: 'alert-triangle', warn: 'alert-triangle', info: 'info' }[type] || 'info';
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = window.icon(iconName, 15) + '<span>' + msg + '</span>';
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 320); }, 2200);
  };

  /* 简易确认弹窗（Promise 化，复用 .modal 样式） */
  window.confirmDialog = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-wrap show';
      wrap.innerHTML =
        '<div class="modal" style="width:400px">' +
        '  <div class="modal-head"><span>' + (opts.title || '确认操作') + '</span><button class="x" data-act="no">' + window.icon('x', 16) + '</button></div>' +
        '  <div class="modal-body" style="font-size:13.5px;line-height:1.7;color:var(--t1)">' + (opts.content || '') + '</div>' +
        '  <div class="modal-foot">' +
        '    <button class="btn" data-act="no">取消</button>' +
        '    <button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-pri') + '" data-act="yes">' + (opts.okText || '确定') + '</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(wrap);
      wrap.addEventListener('click', function (e) {
        var act = e.target.closest('[data-act]');
        if (act) { wrap.remove(); resolve(act.getAttribute('data-act') === 'yes'); }
        else if (e.target === wrap) { wrap.remove(); resolve(false); }
      });
    });
  };

  /* 打开/关闭弹窗辅助 */
  window.openModal = function (sel) { var m = document.querySelector(sel); if (m) m.classList.add('show'); };
  window.closeModal = function (sel) { var m = document.querySelector(sel); if (m) m.classList.remove('show'); };
})();
