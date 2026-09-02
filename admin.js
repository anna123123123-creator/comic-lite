(function () {
  'use strict';

  var data = ComicData.load();

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'comics') renderComics();
    if (name === 'episodes') { populateEpisodeComicSelect(); renderEpisodes(); }
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = ComicData.reset();
    selectedEpisodeComicId = null;
    switchView('dashboard');
  });

  function comicName(id) {
    var c = data.comics.find(function (x) { return x.id === id; });
    return c ? c.title : '（已删除漫画）';
  }
  function episodeName(id) {
    var e = data.episodes.find(function (x) { return x.id === id; });
    return e ? e.title : '（已删除分集）';
  }
  function fmtTime(iso) {
    if (!iso) return '-';
    return iso.replace('T', ' ').slice(0, 16);
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var vipCount = data.episodes.filter(function (e) { return e.isVip; }).length;
    var spent = ComicData.totalCoinsSpent(data);

    var stats = [
      { label: '漫画总数', value: data.comics.length },
      { label: '分集总数', value: data.episodes.length },
      { label: 'VIP 分集总数', value: vipCount },
      { label: '已消耗金币总数', value: spent },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    var recent = data.unlocks.slice().sort(function (a, b) { return a.unlockedAt < b.unlockedAt ? 1 : -1; }).slice(0, 8);
    document.getElementById('recentUnlocksBody').innerHTML = recent.map(function (u) {
      return '<tr><td>' + comicName(u.comicId) + '</td><td>' + episodeName(u.episodeId) + '</td><td>' + u.coinsPaid + ' 金币</td><td>' + fmtTime(u.unlockedAt) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">暂无解锁记录</td></tr>';
  }

  // ---------- Comics ----------
  var comicModalBackdrop = document.getElementById('comicModalBackdrop');
  var comicModalTitle = document.getElementById('comicModalTitle');
  var comicModalMsg = document.getElementById('comicModalMsg');
  var comicForm = document.getElementById('comicForm');
  var comicIdInput = document.getElementById('comicIdInput');
  var comicTitleInput = document.getElementById('comicTitleInput');
  var comicEmojiInput = document.getElementById('comicEmojiInput');
  var comicAuthorInput = document.getElementById('comicAuthorInput');
  var comicCategoryInput = document.getElementById('comicCategoryInput');
  var comicStatusInput = document.getElementById('comicStatusInput');
  var comicSynInput = document.getElementById('comicSynInput');

  function renderComics() {
    document.getElementById('comicsBody').innerHTML = data.comics.map(function (c) {
      var epCount = ComicData.episodesForComic(data, c.id).length;
      return '<tr><td style="font-size:20px">' + c.coverEmoji + '</td><td>' + c.title + '</td><td>' + c.author + '</td><td>' + c.category + '</td>' +
        '<td><span class="badge ' + (c.status === '已完结' ? 'done' : 'ongoing') + '">' + c.status + '</span></td>' +
        '<td>' + epCount + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + c.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + c.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="color:var(--muted)">暂无漫画</td></tr>';

    document.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openComicModal(btn.dataset.edit); });
    });
    document.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteComic(btn.dataset.delete); });
    });
  }

  function openComicModal(id) {
    comicModalMsg.innerHTML = '';
    comicForm.reset();
    if (id) {
      var c = data.comics.find(function (x) { return x.id === id; });
      comicModalTitle.textContent = '编辑漫画';
      comicIdInput.value = c.id;
      comicTitleInput.value = c.title;
      comicEmojiInput.value = c.coverEmoji;
      comicAuthorInput.value = c.author;
      comicCategoryInput.value = c.category;
      comicStatusInput.value = c.status;
      comicSynInput.value = c.synopsis || '';
    } else {
      comicModalTitle.textContent = '新增漫画';
      comicIdInput.value = '';
      comicEmojiInput.value = '📖';
    }
    comicModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddComic').addEventListener('click', function () { openComicModal(null); });
  document.getElementById('btnCloseComicModal').addEventListener('click', function () { comicModalBackdrop.classList.remove('show'); });
  comicModalBackdrop.addEventListener('click', function (e) { if (e.target === comicModalBackdrop) comicModalBackdrop.classList.remove('show'); });

  comicForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = comicTitleInput.value.trim();
    var emoji = comicEmojiInput.value.trim() || '📖';
    var author = comicAuthorInput.value.trim();
    if (!title || !author) {
      comicModalMsg.innerHTML = '<div class="msg error">请填写标题和作者。</div>';
      return;
    }

    var id = comicIdInput.value;
    if (id) {
      var c = data.comics.find(function (x) { return x.id === id; });
      c.title = title; c.coverEmoji = emoji; c.author = author;
      c.category = comicCategoryInput.value; c.status = comicStatusInput.value;
      c.synopsis = comicSynInput.value.trim();
    } else {
      data.comics.push({
        id: ComicData.uid('c'), title: title, author: author, coverEmoji: emoji,
        category: comicCategoryInput.value, status: comicStatusInput.value,
        synopsis: comicSynInput.value.trim(),
      });
    }
    ComicData.save(data);
    comicModalBackdrop.classList.remove('show');
    renderComics();
  });

  function deleteComic(id) {
    if (!confirm('确定删除这部漫画吗？它的所有分集也会一并删除。')) return;
    data.comics = data.comics.filter(function (c) { return c.id !== id; });
    data.episodes = data.episodes.filter(function (e) { return e.comicId !== id; });
    ComicData.save(data);
    renderComics();
    if (selectedEpisodeComicId === id) selectedEpisodeComicId = null;
  }

  // ---------- Episodes ----------
  var selectedEpisodeComicId = null;
  var episodeComicSelect = document.getElementById('episodeComicSelect');
  var episodeModalBackdrop = document.getElementById('episodeModalBackdrop');
  var episodeModalTitle = document.getElementById('episodeModalTitle');
  var episodeModalMsg = document.getElementById('episodeModalMsg');
  var episodeForm = document.getElementById('episodeForm');
  var episodeIdInput = document.getElementById('episodeIdInput');
  var episodeTitleInput = document.getElementById('episodeTitleInput');
  var episodeVipInput = document.getElementById('episodeVipInput');
  var episodePriceField = document.getElementById('episodePriceField');
  var episodePriceInput = document.getElementById('episodePriceInput');
  var panelEditorList = document.getElementById('panelEditorList');
  var currentPanels = [];

  function populateEpisodeComicSelect() {
    if (!selectedEpisodeComicId && data.comics.length) selectedEpisodeComicId = data.comics[0].id;
    episodeComicSelect.innerHTML = data.comics.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selectedEpisodeComicId ? ' selected' : '') + '>' + c.title + '</option>';
    }).join('') || '<option value="">暂无漫画</option>';
  }

  episodeComicSelect.addEventListener('change', function () {
    selectedEpisodeComicId = episodeComicSelect.value;
    renderEpisodes();
  });

  function renderEpisodes() {
    var eps = selectedEpisodeComicId ? ComicData.episodesForComic(data, selectedEpisodeComicId) : [];
    document.getElementById('episodesBody').innerHTML = eps.map(function (ep) {
      var typeBadge = ep.isVip ? '<span class="badge vip">VIP · ' + ep.coinPrice + ' 金币</span>' : '<span class="badge free">免费</span>';
      return '<tr><td>第' + ep.index + '话</td><td>' + ep.title + '</td><td>' + typeBadge + '</td><td>' + ep.panels.length + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit-ep="' + ep.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete-ep="' + ep.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">这部漫画还没有分集</td></tr>';

    document.querySelectorAll('[data-edit-ep]').forEach(function (btn) {
      btn.addEventListener('click', function () { openEpisodeModal(btn.dataset.editEp); });
    });
    document.querySelectorAll('[data-delete-ep]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteEpisode(btn.dataset.deleteEp); });
    });
  }

  function renderPanelEditor() {
    panelEditorList.innerHTML = currentPanels.map(function (text, i) {
      return '<div class="panel-editor-row"><span class="idx">#' + (i + 1) + '</span>' +
        '<textarea data-panel-idx="' + i + '" placeholder="这个分镜的画面描述或台词...">' + escapeHtml(text) + '</textarea>' +
        '<button type="button" class="btn btn-sm btn-danger" data-remove-panel="' + i + '">删除</button></div>';
    }).join('');

    panelEditorList.querySelectorAll('textarea[data-panel-idx]').forEach(function (ta) {
      ta.addEventListener('input', function () {
        currentPanels[parseInt(ta.dataset.panelIdx, 10)] = ta.value;
      });
    });
    panelEditorList.querySelectorAll('[data-remove-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentPanels.splice(parseInt(btn.dataset.removePanel, 10), 1);
        renderPanelEditor();
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.getElementById('btnAddPanel').addEventListener('click', function () {
    currentPanels.push('');
    renderPanelEditor();
  });

  episodeVipInput.addEventListener('change', function () {
    episodePriceField.style.display = episodeVipInput.checked ? '' : 'none';
  });

  function openEpisodeModal(id) {
    episodeModalMsg.innerHTML = '';
    episodeForm.reset();
    if (id) {
      var ep = data.episodes.find(function (x) { return x.id === id; });
      episodeModalTitle.textContent = '编辑分集';
      episodeIdInput.value = ep.id;
      episodeTitleInput.value = ep.title;
      episodeVipInput.checked = ep.isVip;
      episodePriceInput.value = ep.coinPrice || 3;
      currentPanels = ep.panels.map(function (p) { return p.captionText; });
    } else {
      episodeModalTitle.textContent = '新增分集';
      episodeIdInput.value = '';
      episodeVipInput.checked = false;
      episodePriceInput.value = 3;
      currentPanels = ['', ''];
    }
    episodePriceField.style.display = episodeVipInput.checked ? '' : 'none';
    renderPanelEditor();
    episodeModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddEpisode').addEventListener('click', function () {
    if (!selectedEpisodeComicId) { alert('请先添加一部漫画。'); return; }
    openEpisodeModal(null);
  });
  document.getElementById('btnCloseEpisodeModal').addEventListener('click', function () { episodeModalBackdrop.classList.remove('show'); });
  episodeModalBackdrop.addEventListener('click', function (e) { if (e.target === episodeModalBackdrop) episodeModalBackdrop.classList.remove('show'); });

  episodeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = episodeTitleInput.value.trim();
    var isVip = episodeVipInput.checked;
    var price = parseInt(episodePriceInput.value, 10) || 0;
    var trimmedPanels = currentPanels.map(function (t) { return t.trim(); });

    if (!title) {
      episodeModalMsg.innerHTML = '<div class="msg error">请填写分集标题。</div>';
      return;
    }
    if (trimmedPanels.length === 0 || trimmedPanels.some(function (t) { return !t; })) {
      episodeModalMsg.innerHTML = '<div class="msg error">每个分镜都需要填写内容，或点击删除移除空白分镜（至少保留 1 个分镜）。</div>';
      return;
    }
    if (isVip && !(price > 0)) {
      episodeModalMsg.innerHTML = '<div class="msg error">VIP 分集的解锁价格需大于 0。</div>';
      return;
    }

    var panels = trimmedPanels.map(function (text, i) {
      return { captionText: text, colorSeed: i % 6 };
    });

    var id = episodeIdInput.value;
    if (id) {
      var ep = data.episodes.find(function (x) { return x.id === id; });
      ep.title = title; ep.isVip = isVip; ep.coinPrice = isVip ? price : 0; ep.panels = panels;
    } else {
      var existing = ComicData.episodesForComic(data, selectedEpisodeComicId);
      var nextIndex = existing.length ? existing[existing.length - 1].index + 1 : 1;
      data.episodes.push({
        id: ComicData.uid('e'), comicId: selectedEpisodeComicId, index: nextIndex, title: title,
        isVip: isVip, coinPrice: isVip ? price : 0, panels: panels,
      });
    }
    ComicData.save(data);
    episodeModalBackdrop.classList.remove('show');
    renderEpisodes();
  });

  function deleteEpisode(id) {
    if (!confirm('确定删除这个分集吗？')) return;
    data.episodes = data.episodes.filter(function (e) { return e.id !== id; });
    ComicData.save(data);
    renderEpisodes();
  }

  switchView('dashboard');
})();
