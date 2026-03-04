document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const newsToggle = document.getElementById('newsToggle');
  const newsSubNav = document.getElementById('newsSubNav');
  const copyPromptButtons = document.querySelectorAll('.copy-prompt-btn[data-copy-prompt="true"]');
  const shareTopicButtons = document.querySelectorAll('.share-topic-btn[data-share-topic="true"]');
  const briefAudioRoot = document.querySelector('[data-audio-player-root]');
  const dailyBriefAudio = document.getElementById('dailyBriefAudio');
  const customBriefPlayer = document.querySelector('[data-audio-player]');
  const briefPlayButton = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-play]') : null;
  const briefPlayIcon = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-play-icon]') : null;
  const briefPlayText = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-play-text]') : null;
  const briefProgress = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-progress]') : null;
  const briefCurrentTime = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-current]') : null;
  const briefDuration = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-duration]') : null;
  const briefBuffered = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-buffered]') : null;
  const briefRateSelect = customBriefPlayer ? customBriefPlayer.querySelector('[data-audio-rate]') : null;

  if (
    briefAudioRoot &&
    dailyBriefAudio &&
    customBriefPlayer &&
    briefPlayButton &&
    briefPlayIcon &&
    briefPlayText &&
    briefProgress &&
    briefCurrentTime &&
    briefDuration &&
    briefRateSelect
  ) {
    briefAudioRoot.classList.add('enhanced');
    customBriefPlayer.hidden = false;
    dailyBriefAudio.controls = false;

    function formatBriefAudioTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00';
      }
      const total = Math.floor(seconds);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      if (hours > 0) {
        return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      }
      return String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function setBriefPlayState(isPlaying) {
      briefPlayIcon.textContent = isPlaying ? '❚❚' : '▶';
      briefPlayText.textContent = isPlaying ? '暂停' : '播放';
      briefPlayButton.setAttribute('aria-label', isPlaying ? '暂停简报' : '播放简报');
    }

    function getBriefBufferedEnd() {
      const ranges = dailyBriefAudio.buffered;
      if (!ranges || ranges.length === 0) {
        return 0;
      }

      const currentTime = Number.isFinite(dailyBriefAudio.currentTime) ? dailyBriefAudio.currentTime : 0;
      for (let i = 0; i < ranges.length; i += 1) {
        const rangeStart = ranges.start(i);
        const rangeEnd = ranges.end(i);
        if (currentTime >= rangeStart && currentTime <= rangeEnd) {
          return rangeEnd;
        }
      }

      return ranges.end(ranges.length - 1);
    }

    function syncBriefProgressVisual(currentTime, duration) {
      const playedPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
      const bufferedEnd = Math.max(currentTime, getBriefBufferedEnd());
      const bufferedPercent = duration > 0 ? Math.min(100, Math.max(playedPercent, (bufferedEnd / duration) * 100)) : 0;

      briefProgress.style.setProperty('--brief-played-percent', playedPercent.toFixed(2) + '%');
      briefProgress.style.setProperty('--brief-buffered-percent', bufferedPercent.toFixed(2) + '%');

      if (briefBuffered) {
        briefBuffered.textContent = '已缓冲 ' + Math.round(bufferedPercent) + '%';
      }
    }

    function syncBriefTimeline() {
      const duration = Number.isFinite(dailyBriefAudio.duration) ? dailyBriefAudio.duration : 0;
      const currentTime = Number.isFinite(dailyBriefAudio.currentTime) ? dailyBriefAudio.currentTime : 0;
      briefCurrentTime.textContent = formatBriefAudioTime(currentTime);
      briefDuration.textContent = duration > 0 ? formatBriefAudioTime(duration) : '--:--';
      briefProgress.value = duration > 0 ? String(Math.round((currentTime / duration) * 1000)) : '0';
      syncBriefProgressVisual(currentTime, duration);
    }

    function seekBriefAudio() {
      const duration = Number.isFinite(dailyBriefAudio.duration) ? dailyBriefAudio.duration : 0;
      if (duration <= 0) return;
      const progressValue = Number(briefProgress.value);
      if (!Number.isFinite(progressValue)) return;
      dailyBriefAudio.currentTime = duration * (progressValue / 1000);
      syncBriefTimeline();
    }

    briefPlayButton.addEventListener('click', () => {
      if (dailyBriefAudio.paused) {
        if (
          Number.isFinite(dailyBriefAudio.duration) &&
          dailyBriefAudio.duration > 0 &&
          dailyBriefAudio.currentTime >= dailyBriefAudio.duration - 0.1
        ) {
          dailyBriefAudio.currentTime = 0;
        }
        if (dailyBriefAudio.readyState === 0) {
          dailyBriefAudio.load();
        }
        void dailyBriefAudio.play().catch(() => {
          setBriefPlayState(false);
        });
      } else {
        dailyBriefAudio.pause();
      }
    });

    briefProgress.addEventListener('input', seekBriefAudio);
    briefProgress.addEventListener('change', seekBriefAudio);

    customBriefPlayer.querySelectorAll('[data-audio-skip]').forEach((button) => {
      button.addEventListener('click', () => {
        const delta = Number(button.getAttribute('data-audio-skip'));
        if (!Number.isFinite(delta)) return;
        const duration = Number.isFinite(dailyBriefAudio.duration) ? dailyBriefAudio.duration : 0;
        const nextTime = Math.max(0, dailyBriefAudio.currentTime + delta);
        dailyBriefAudio.currentTime = duration > 0 ? Math.min(nextTime, duration) : nextTime;
        syncBriefTimeline();
      });
    });

    briefRateSelect.addEventListener('change', () => {
      const nextRate = Number(briefRateSelect.value);
      if (!Number.isFinite(nextRate) || nextRate <= 0) return;
      dailyBriefAudio.playbackRate = nextRate;
    });

    dailyBriefAudio.addEventListener('loadedmetadata', syncBriefTimeline);
    dailyBriefAudio.addEventListener('loadeddata', syncBriefTimeline);
    dailyBriefAudio.addEventListener('durationchange', syncBriefTimeline);
    dailyBriefAudio.addEventListener('timeupdate', syncBriefTimeline);
    dailyBriefAudio.addEventListener('progress', syncBriefTimeline);
    dailyBriefAudio.addEventListener('seeking', syncBriefTimeline);
    dailyBriefAudio.addEventListener('seeked', syncBriefTimeline);
    dailyBriefAudio.addEventListener('ratechange', () => {
      const rateValue = String(dailyBriefAudio.playbackRate);
      if (Array.from(briefRateSelect.options).some((option) => option.value === rateValue)) {
        briefRateSelect.value = rateValue;
      }
    });
    dailyBriefAudio.addEventListener('play', () => setBriefPlayState(true));
    dailyBriefAudio.addEventListener('pause', () => setBriefPlayState(false));
    dailyBriefAudio.addEventListener('ended', () => {
      setBriefPlayState(false);
      syncBriefTimeline();
    });

    const defaultRate = String(dailyBriefAudio.playbackRate || 1);
    if (Array.from(briefRateSelect.options).some((option) => option.value === defaultRate)) {
      briefRateSelect.value = defaultRate;
    }
    setBriefPlayState(!dailyBriefAudio.paused);
    syncBriefTimeline();
  }

  function extractTopicTitle(card) {
    const topicNameElement = card.querySelector('.topic-name');
    let topicName = '未命名主题';
    if (topicNameElement) {
      const nameClone = topicNameElement.cloneNode(true);
      nameClone.querySelectorAll('.podcast-badge').forEach((badge) => badge.remove());
      topicName = (nameClone.textContent || '').trim() || topicName;
    }
    return topicName;
  }

  function resolveFixedDigestFileName() {
    const digestCalendarToggle = document.getElementById('digestCalendarToggle');
    const currentDate = (digestCalendarToggle?.dataset.currentDate || '').trim();
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(currentDate)) {
      return 'digest-' + currentDate + '.html';
    }

    const currentFile = (digestCalendarToggle?.dataset.currentFile || '').trim();
    if (currentFile) {
      return currentFile;
    }

    const pathFile = (window.location.pathname.split('/').pop() || '').trim();
    return pathFile || 'index.html';
  }

  function buildTopicShareUrl(card) {
    const digestFile = resolveFixedDigestFileName();
    const topicAnchor = (card.id || '').trim();
    const digestPath = topicAnchor ? digestFile + '#' + topicAnchor : digestFile;
    return new URL(digestPath, window.location.href).href;
  }

  function buildTopicShareText(title, url) {
    return title + '\\n' + url;
  }

  function extractTopicPromptData(card) {
    const topicName = extractTopicTitle(card);

    const summarySelectors = ['.cluster-summary > p', '.article-summary p', '.preview-text'];
    let summary = '';
    for (const selector of summarySelectors) {
      const summaryElement = card.querySelector(selector);
      const text = (summaryElement && summaryElement.textContent ? summaryElement.textContent : '').trim();
      if (text) {
        summary = text;
        break;
      }
    }
    if (!summary) {
      summary = '该聚合暂未提供可用摘要。';
    }

    const seenLinks = new Set();
    const links = [];
    card.querySelectorAll('.article-list a[href]').forEach((linkElement) => {
      const url = (linkElement.getAttribute('href') || '').trim();
      if (!url || seenLinks.has(url)) return;
      seenLinks.add(url);
      const title = (linkElement.textContent || '').trim() || url;
      links.push({ title, url });
    });

    return { topicName, summary, links };
  }

  function buildChatbotPrompt(topicData) {
    const lines = [
      '请作为我的新闻研究助手，基于以下聚合内容回答问题。',
      '',
      '主题：' + topicData.topicName,
      '',
      '聚合总结：',
      topicData.summary,
      '',
      '新闻链接：',
    ];

    if (topicData.links.length === 0) {
      lines.push('- （当前聚合暂无可用新闻链接）');
    } else {
      topicData.links.forEach((item, index) => {
        lines.push((index + 1) + '. ' + item.title + ' - ' + item.url);
      });
    }

    lines.push(
      '',
      '请先逐条获取下列链接中的新闻内容（至少提取核心事实），再基于获取内容回答我的问题；若无法访问请标注。',
      '回答时请在关键结论后标注对应链接。',
      '',
      '我的问题：'
    );

    return lines.join('\\n');
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function setButtonFeedback(button, stateClasses, activeClass) {
    stateClasses.forEach((name) => button.classList.remove(name));
    if (activeClass) {
      button.classList.add(activeClass);
    }
    button.disabled = true;

    window.setTimeout(() => {
      stateClasses.forEach((name) => button.classList.remove(name));
      button.disabled = false;
    }, 1500);
  }

  function setCopyButtonFeedback(button, className) {
    setButtonFeedback(button, ['copied', 'copy-failed'], className);
  }

  function setShareButtonFeedback(button, className) {
    setButtonFeedback(button, ['shared', 'share-failed'], className);
  }

  copyPromptButtons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const card = button.closest('.topic-card');
      if (!card) return;

      const promptText = buildChatbotPrompt(extractTopicPromptData(card));
      try {
        const copied = await copyText(promptText);
        if (!copied) {
          setCopyButtonFeedback(button, 'copy-failed');
          return;
        }
        setCopyButtonFeedback(button, 'copied');
      } catch {
        setCopyButtonFeedback(button, 'copy-failed');
      }
    });
  });

  shareTopicButtons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest('.topic-card');
      if (!card) return;

      const title = extractTopicTitle(card);
      const url = buildTopicShareUrl(card);
      const text = buildTopicShareText(title, url);

      if (typeof navigator.share === 'function') {
        try {
          // Some share targets (notably WeChat) split url payloads into extra items/files.
          // Sending a single text payload keeps it as one message while preserving the link.
          await navigator.share({ text });
          setShareButtonFeedback(button, 'shared');
          return;
        } catch {
          // Fall back to clipboard when share is unavailable, denied, or canceled.
        }
      }

      try {
        const copied = await copyText(text);
        setShareButtonFeedback(button, copied ? 'shared' : 'share-failed');
      } catch {
        setShareButtonFeedback(button, 'share-failed');
      }
    });
  });

  // News sub-nav toggle (desktop)
  if (newsToggle && newsSubNav) {
    newsToggle.addEventListener('click', (e) => {
      e.preventDefault();
      newsToggle.classList.toggle('collapsed');
      newsSubNav.classList.toggle('collapsed');
    });
  }

  // Desktop: click to scroll
  navItems.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-section');
      const target = document.getElementById(targetId);
      if (target) {
        const navHeight = document.querySelector('.category-nav')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - navHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  // IntersectionObserver: track visible sections
  const visibleSections = new Set();

  function updateActiveNav() {
    const sections = document.querySelectorAll('.category-section');
    let activeId = null;
    for (const section of sections) {
      if (visibleSections.has(section.id)) {
        activeId = section.id;
        break;
      }
    }
    // Desktop nav
    navItems.forEach(item => {
      if (activeId && item.getAttribute('data-section') === activeId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    if (newsToggle) {
      const activeItem = document.querySelector('.nav-sub-item.active');
      if (activeItem) {
        newsToggle.classList.add('active');
      } else {
        newsToggle.classList.remove('active');
      }
    }
    // Mobile sheet nav
    document.querySelectorAll('.sheet-item[data-section]').forEach(item => {
      if (activeId && item.getAttribute('data-section') === activeId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        visibleSections.add(entry.target.id);
      } else {
        visibleSections.delete(entry.target.id);
      }
    });
    updateActiveNav();
  }, { threshold: 0, rootMargin: '-80px 0px -60% 0px' });

  document.querySelectorAll('.category-section').forEach(section => {
    observer.observe(section);
  });

  // Mobile FAB & Bottom Sheet
  const fab = document.getElementById('mobileFab');
  const overlay = document.getElementById('mobileOverlay');
  const sheet = document.getElementById('mobileSheet');
  const sheetItems = document.querySelectorAll('.sheet-item[data-section]');
  const backTop = document.getElementById('sheetBackTop');

  function openSheet() {
    if (!overlay || !sheet || !fab) return;
    overlay.classList.add('show');
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      sheet.classList.add('visible');
    });
    fab.classList.add('open');
    fab.textContent = '✕';
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    if (!overlay || !sheet || !fab) return;
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    fab.classList.remove('open');
    fab.textContent = '☰';
    document.body.style.overflow = '';
    setTimeout(() => overlay.classList.remove('show'), 250);
  }

  if (fab) {
    fab.addEventListener('click', () => {
      if (sheet?.classList.contains('visible')) {
        closeSheet();
      } else {
        openSheet();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSheet);
  }

  // Sheet item click -> scroll to section
  sheetItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-section');
      const target = document.getElementById(targetId);
      closeSheet();
      if (target) {
        setTimeout(() => {
          const targetPosition = target.offsetTop - 20;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }, 280);
      }
    });
  });

  // Back to top
  if (backTop) {
    backTop.addEventListener('click', (e) => {
      e.preventDefault();
      closeSheet();
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 280);
    });
  }

  // Collapsible topic cards (mobile only)
  const mobileQuery = window.matchMedia('(max-width: 768px)');

  function initCollapsibleCards() {
    const cards = document.querySelectorAll('.topic-card');
    if (mobileQuery.matches) {
      // Mobile: collapse all, then expand first analyzed card per category
      cards.forEach(card => {
        card.classList.add('collapsed');
        const header = card.querySelector('.topic-header');
        if (header) header.setAttribute('aria-expanded', 'false');
      });
      document.querySelectorAll('.category-section').forEach(section => {
        const firstAnalyzed = section.querySelector('.topic-card[data-has-analysis="true"]');
        if (firstAnalyzed) {
          firstAnalyzed.classList.remove('collapsed');
          const h = firstAnalyzed.querySelector('.topic-header');
          if (h) h.setAttribute('aria-expanded', 'true');
        }
      });
    } else {
      // Desktop: expand all
      cards.forEach(card => {
        card.classList.remove('collapsed');
        const header = card.querySelector('.topic-header');
        if (header) header.setAttribute('aria-expanded', 'true');
      });
    }
  }

  function toggleCard(card) {
    if (!mobileQuery.matches) return;
    const isCollapsed = card.classList.toggle('collapsed');
    const header = card.querySelector('.topic-header');
    if (header) header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }

  document.querySelectorAll('.topic-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (!mobileQuery.matches) return;
      if (e.target.closest('a') || e.target.closest('.copy-prompt-btn') || e.target.closest('.share-topic-btn') || e.target.closest('button')) return;
      toggleCard(header.closest('.topic-card'));
    });
    header.addEventListener('keydown', (e) => {
      if (!mobileQuery.matches) return;
      if (e.target.closest('a') || e.target.closest('.copy-prompt-btn') || e.target.closest('.share-topic-btn') || e.target.closest('button')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCard(header.closest('.topic-card'));
      }
    });
  });

  initCollapsibleCards();
  mobileQuery.addEventListener('change', initCollapsibleCards);

  function scrollToTopicAnchor(targetId) {
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    const card = target.classList.contains('topic-card') ? target : target.closest('.topic-card');
    if (mobileQuery.matches && card && card.classList.contains('collapsed')) {
      card.classList.remove('collapsed');
      const header = card.querySelector('.topic-header');
      if (header) header.setAttribute('aria-expanded', 'true');
    }

    const topbarHeight = document.querySelector('.tailnews-topbar')?.offsetHeight || 0;
    const navHeight = mobileQuery.matches ? 0 : (document.querySelector('.category-nav')?.offsetHeight || 0);
    const offset = topbarHeight + navHeight + 16;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
  }

  document.querySelectorAll('.brief-link[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href')?.slice(1);
      if (!targetId) return;
      if (window.location.hash !== '#' + targetId) {
        window.location.hash = targetId;
      }
      scrollToTopicAnchor(targetId);
    });
  });

  window.addEventListener('hashchange', () => {
    const targetId = window.location.hash.slice(1);
    if (targetId) {
      scrollToTopicAnchor(targetId);
    }
  });

  if (window.location.hash) {
    setTimeout(() => scrollToTopicAnchor(window.location.hash.slice(1)), 0);
  }

  // Archive calendar popover
  const digestCalendarToggle = document.getElementById('digestCalendarToggle');
  const digestCalendarPopover = document.getElementById('digestCalendarPopover');
  const digestCalendarMonthLabel = document.getElementById('digestCalendarMonthLabel');
  const digestCalendarGrid = document.getElementById('digestCalendarGrid');
  const digestCalendarPrev = document.getElementById('digestCalendarPrev');
  const digestCalendarNext = document.getElementById('digestCalendarNext');
  const digestCalendarStatus = document.getElementById('digestCalendarStatus');

  if (
    digestCalendarToggle &&
    digestCalendarPopover &&
    digestCalendarMonthLabel &&
    digestCalendarGrid &&
    digestCalendarPrev &&
    digestCalendarNext &&
    digestCalendarStatus
  ) {
    const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    const currentDigestFile = digestCalendarToggle.dataset.currentFile || '';
    const currentDigestDate = digestCalendarToggle.dataset.currentDate || '';
    const availableDateMap = new Map();
    let hasArchiveData = false;

    function formatDateKey(year, month, day) {
      return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }

    function parseDateString(dateStr) {
      if (typeof dateStr !== 'string') return null;
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    function getArchiveDateValue(item) {
      if (!item || typeof item !== 'object') return null;
      if (typeof item.date === 'string') return item.date;
      if (typeof item.fileName === 'string') {
        const matched = item.fileName.match(/^digest-(\d{4}-\d{2}-\d{2})\.html$/);
        if (matched) return matched[1];
      }
      return null;
    }

    function getArchiveFileName(item, dateValue) {
      if (item && typeof item.fileName === 'string') return item.fileName;
      return 'digest-' + dateValue + '.html';
    }

    function updateArchiveStatus(message) {
      if (message) {
        digestCalendarStatus.textContent = message;
      } else {
        digestCalendarStatus.textContent = hasArchiveData ? '' : '归档暂不可用，当前仅展示本页日期';
      }
    }

    function openDigestCalendar() {
      digestCalendarPopover.hidden = false;
      digestCalendarToggle.setAttribute('aria-expanded', 'true');
    }

    function closeDigestCalendar() {
      digestCalendarPopover.hidden = true;
      digestCalendarToggle.setAttribute('aria-expanded', 'false');
    }

    const currentDateObj = parseDateString(currentDigestDate) || new Date();
    let viewYear = currentDateObj.getFullYear();
    let viewMonth = currentDateObj.getMonth();

    if (currentDigestDate) {
      availableDateMap.set(currentDigestDate, currentDigestFile || ('digest-' + currentDigestDate + '.html'));
    }

    function renderDigestCalendar() {
      digestCalendarMonthLabel.textContent = String(viewYear) + '年' + String(viewMonth + 1) + '月';
      digestCalendarGrid.innerHTML = '';

      const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      for (let i = 0; i < firstWeekday; i += 1) {
        const emptyCell = document.createElement('span');
        emptyCell.className = 'digest-calendar-day digest-calendar-day-empty';
        emptyCell.setAttribute('aria-hidden', 'true');
        digestCalendarGrid.appendChild(emptyCell);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = formatDateKey(viewYear, viewMonth + 1, day);
        const fileName = availableDateMap.get(dateKey);
        const dayButton = document.createElement('button');
        dayButton.type = 'button';
        dayButton.className = 'digest-calendar-day';
        dayButton.textContent = String(day);

        if (dateKey === currentDigestDate) {
          dayButton.classList.add('is-current');
        }

        if (fileName) {
          dayButton.classList.add('has-content');
          dayButton.dataset.targetFile = fileName;
          dayButton.setAttribute('aria-label', dateKey + ' 有摘要内容，点击跳转');
        } else {
          dayButton.disabled = true;
          dayButton.setAttribute('aria-label', dateKey + ' 暂无摘要');
        }

        digestCalendarGrid.appendChild(dayButton);
      }
    }

    digestCalendarToggle.addEventListener('click', () => {
      if (digestCalendarPopover.hidden) {
        openDigestCalendar();
      } else {
        closeDigestCalendar();
      }
    });

    digestCalendarPrev.addEventListener('click', () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderDigestCalendar();
    });

    digestCalendarNext.addEventListener('click', () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderDigestCalendar();
    });

    digestCalendarGrid.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const dayButton = target.closest('.digest-calendar-day.has-content');
      if (!(dayButton instanceof HTMLButtonElement)) return;
      const targetFile = dayButton.dataset.targetFile;
      if (targetFile) {
        window.location.href = targetFile;
      }
    });

    document.addEventListener('click', (e) => {
      if (digestCalendarPopover.hidden) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (digestCalendarToggle.contains(target) || digestCalendarPopover.contains(target)) return;
      closeDigestCalendar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDigestCalendar();
      }
    });

    renderDigestCalendar();

    // 直接嵌入归档日期列表（生成时按日期从新到旧排序）
    const archiveDates = Array.isArray(window._digestArchiveDates) ? window._digestArchiveDates : [];

    archiveDates.forEach((date) => {
      availableDateMap.set(date, 'digest-' + date + '.html');
    });
    hasArchiveData = archiveDates.length > 0;

    // 默认展示最新有内容的月份（而不是最旧月份）
    if (archiveDates.length > 0) {
      const latestDate = parseDateString(archiveDates[0]);
      if (latestDate) {
        viewYear = latestDate.getFullYear();
        viewMonth = latestDate.getMonth();
      }
    }

    renderDigestCalendar();
    updateArchiveStatus();

    const weekdayRow = document.getElementById('digestCalendarWeekdays');
    if (weekdayRow) {
      weekdayRow.innerHTML = weekdayLabels
        .map((label) => '<span class="digest-calendar-weekday" aria-hidden="true">' + label + '</span>')
        .join('');
    }
  }
});
