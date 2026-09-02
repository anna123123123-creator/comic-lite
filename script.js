(function () {
  'use strict';

  var data = ComicData.load();
  var currentComic = null;
  var currentEpisode = null;
  var pendingUnlockEpisode = null;

  var comicGrid = document.getElementById('comicGrid');
  var coinBalanceLabel = document.getElementById('coinBalanceLabel');
  var readerCoinBalance = document.getElementById('readerCoinBalance');

  var comicDetailCover = document.getElementById('comicDetailCover');
  var comicDetailTitle = document.getElementById('comicDetailTitle');
  var comicDetailMeta = document.getElementById('comicDetailMeta');
  var comicDetailSyn = document.getElementById('comicDetailSyn');
  var episodeList = document.getElementById('episodeList');

  var readerEpTitle = document.getElementById('readerEpTitle');
  var readerEpSub = document.getElementById('readerEpSub');
  var panelList = document.getElementById('panelList');
  var btnPrevEpisode = document.getElementById('btnPrevEpisode');
  var btnNextEpisode = document.getElementById('btnNextEpisode');

  var unlockModalBackdrop = document.getElementById('unlockModalBackdrop');
  var unlockEpTitle = document.getElementById('unlockEpTitle');
  var unlockComicTitle = document.getElementById('unlockComicTitle');
  var unlockModalMsg = document.getElementById('unlockModalMsg');
  var unlockPriceLabel = document.getElementById('unlockPriceLabel');
  var unlockBalanceLabel = document.getElementById('unlockBalanceLabel');

  function showView(name) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    window.scrollTo(0, 0);
  }

  function updateCoinDisplays() {
    coinBalanceLabel.textContent = data.coinBalance;
    readerCoinBalance.textContent = data.coinBalance;
  }

  function statusClass(status) { return status === '已完结' ? 'done' : 'ongoing'; }

  // ---------- Catalog ----------
  function renderCatalog() {
    comicGrid.innerHTML = data.comics.map(function (c) {
      return '<div class="comic-card" data-id="' + c.id + '">' +
        '<div class="comic-card__cover">' + c.coverEmoji + '</div>' +
        '<div class="comic-card__body">' +
        '<h3>' + c.title + '</h3>' +
        '<div class="comic-card__meta">' + c.author + '</div>' +
        '<span class="comic-card__cat">' + c.category + '</span>' +
        '<span class="comic-card__status ' + statusClass(c.status) + '">' + c.status + '</span>' +
        '<div class="comic-card__syn">' + c.synopsis + '</div>' +
        '</div></div>';
    }).join('');

    comicGrid.querySelectorAll('.comic-card').forEach(function (card) {
      card.addEventListener('click', function () { openComic(card.dataset.id); });
    });
  }

  // ---------- Comic detail / episode list ----------
  function openComic(comicId) {
    currentComic = data.comics.find(function (c) { return c.id === comicId; });
    if (!currentComic) return;
    comicDetailCover.textContent = currentComic.coverEmoji;
    comicDetailTitle.textContent = currentComic.title;
    comicDetailMeta.textContent = currentComic.author + ' · ' + currentComic.category + ' · ' + currentComic.status;
    comicDetailSyn.textContent = currentComic.synopsis;
    renderEpisodeList();
    showView('comic');
  }

  function renderEpisodeList() {
    var eps = ComicData.episodesForComic(data, currentComic.id);
    episodeList.innerHTML = eps.map(function (ep) {
      var unlocked = ComicData.isUnlocked(data, ep.id);
      var locked = ep.isVip && !unlocked;
      var actionHtml;
      if (!ep.isVip) {
        actionHtml = '<span class="ep-action free">阅读</span>';
      } else if (unlocked) {
        actionHtml = '<span class="ep-action unlocked">已解锁</span>';
      } else {
        actionHtml = '<span class="ep-action locked">🔒 ' + ep.coinPrice + ' 金币</span>';
      }
      return '<div class="episode-row' + (locked ? ' locked' : '') + '" data-id="' + ep.id + '">' +
        '<div class="ep-title"><span class="ep-index">第' + ep.index + '话</span>' + ep.title + '</div>' +
        actionHtml +
        '</div>';
    }).join('') || '<p style="color:var(--muted)">暂无分集</p>';

    episodeList.querySelectorAll('.episode-row').forEach(function (row) {
      row.addEventListener('click', function () { openEpisode(row.dataset.id); });
    });
  }

  document.getElementById('btnBackToCatalog').addEventListener('click', function () { showView('catalog'); });
  document.getElementById('btnBackToComic').addEventListener('click', function () {
    renderEpisodeList();
    showView('comic');
  });

  // ---------- Episode open / reader ----------
  function openEpisode(episodeId) {
    var ep = data.episodes.find(function (e) { return e.id === episodeId; });
    if (!ep) return;
    if (ep.isVip && !ComicData.isUnlocked(data, ep.id)) {
      openUnlockModal(ep);
      return;
    }
    renderReader(ep);
  }

  function renderReader(ep) {
    currentEpisode = ep;
    var comic = data.comics.find(function (c) { return c.id === ep.comicId; });
    readerEpTitle.textContent = '第' + ep.index + '话 · ' + ep.title;
    readerEpSub.textContent = (comic ? comic.title : '') + (ep.isVip ? '（VIP 已解锁）' : '（免费）');
    panelList.innerHTML = ep.panels.map(function (p, i) {
      return '<div class="comic-panel panel-g' + (p.colorSeed % 6) + '">' +
        '<span class="panel-index">分镜 ' + (i + 1) + ' / ' + ep.panels.length + '</span>' +
        '<div class="panel-caption">' + p.captionText + '</div>' +
        '</div>';
    }).join('');
    updateCoinDisplays();
    updateReaderNav(comic, ep);
    showView('reader');
  }

  function updateReaderNav(comic, ep) {
    var eps = ComicData.episodesForComic(data, comic.id);
    var pos = eps.findIndex(function (e) { return e.id === ep.id; });
    var prev = pos > 0 ? eps[pos - 1] : null;
    var next = pos < eps.length - 1 ? eps[pos + 1] : null;

    btnPrevEpisode.disabled = !prev;
    btnPrevEpisode.textContent = prev ? '← 上一话：' + prev.title : '已是第一话';
    btnPrevEpisode.onclick = prev ? function () { openEpisode(prev.id); } : null;

    btnNextEpisode.disabled = !next;
    btnNextEpisode.textContent = next ? '下一话：' + next.title + ' →' : '已是最新一话';
    btnNextEpisode.onclick = next ? function () { openEpisode(next.id); } : null;
  }

  // ---------- Unlock modal ----------
  function openUnlockModal(ep) {
    pendingUnlockEpisode = ep;
    var comic = data.comics.find(function (c) { return c.id === ep.comicId; });
    unlockEpTitle.textContent = '解锁第' + ep.index + '话 · ' + ep.title;
    unlockComicTitle.textContent = comic ? comic.title : '';
    unlockPriceLabel.textContent = ep.coinPrice;
    unlockBalanceLabel.textContent = data.coinBalance;
    unlockModalMsg.innerHTML = '';
    unlockModalBackdrop.classList.add('show');
  }

  function closeUnlockModal() {
    unlockModalBackdrop.classList.remove('show');
    pendingUnlockEpisode = null;
  }

  document.getElementById('btnCloseUnlockModal').addEventListener('click', closeUnlockModal);
  unlockModalBackdrop.addEventListener('click', function (e) {
    if (e.target === unlockModalBackdrop) closeUnlockModal();
  });

  document.getElementById('btnConfirmUnlock').addEventListener('click', function () {
    if (!pendingUnlockEpisode) return;
    var ep = pendingUnlockEpisode;

    if (data.coinBalance < ep.coinPrice) {
      unlockModalMsg.innerHTML = '<div class="msg error">金币余额不足，还差 ' + (ep.coinPrice - data.coinBalance) + ' 金币。可以先去阅读免费分集，或在其它分集积累余额。</div>';
      return;
    }

    data.coinBalance -= ep.coinPrice;
    data.unlocks.push({
      id: ComicData.uid('u'),
      comicId: ep.comicId,
      episodeId: ep.id,
      coinsPaid: ep.coinPrice,
      unlockedAt: new Date().toISOString(),
    });
    ComicData.save(data);

    var unlockedEpisodeId = ep.id;
    closeUnlockModal();
    updateCoinDisplays();
    openEpisode(unlockedEpisodeId);
  });

  updateCoinDisplays();
  renderCatalog();
})();
