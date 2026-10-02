// DSA Activity Heatmap — Minimalist Frontend
(function () {
  'use strict';

  // State
  const state = {
    leetcode: null,
    codeforces: null,
    combinedDailyMap: {},
    streakInfo: { currentStreak: 0, longestStreak: 0, activeDays: 0 },
    platformFilter: 'all', // 'all' | 'leetcode' | 'codeforces'
    selectedYear: 'last365', // 'last365' | '2026' | '2025' ...
    acceptedOnly: true,
    selectedDate: null,
    contests: [],
    contestPlatformFilter: 'all',
    upcomingContests: [],
    upcomingPlatformFilter: 'all',
    activeTab: 'activity',
    savedProfiles: [],
    compareP1Data: null,
    compareP2Data: null,
    theme: localStorage.getItem('dsa_theme') || 'dark'
  };

  // DOM Elements
  const themeToggle = document.getElementById('themeToggle');
  const handleForm = document.getElementById('handleForm');
  const leetcodeInput = document.getElementById('leetcodeInput');
  const codeforcesInput = document.getElementById('codeforcesInput');
  const syncBtn = document.getElementById('syncBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnLabel = document.getElementById('btnLabel');
  const demoBtn = document.getElementById('demoBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Saved Profiles DOM
  const savedUsersBar = document.getElementById('savedUsersBar');
  const savedChipsList = document.getElementById('savedChipsList');
  const saveCurrentBtn = document.getElementById('saveCurrentBtn');
  const openCompareBtn = document.getElementById('openCompareBtn');

  // Navigation & Tab Panels DOM
  const mainNavTabs = document.getElementById('mainNavTabs');
  const navUpcomingCount = document.getElementById('navUpcomingCount');
  const activityPanel = document.getElementById('activityPanel');
  const contestsPanel = document.getElementById('contestsPanel');
  const comparePanel = document.getElementById('comparePanel');

  // Comparison Panel DOM
  const compareSelectP1 = document.getElementById('compareSelectP1');
  const compareSelectP2 = document.getElementById('compareSelectP2');
  const compareP1Lc = document.getElementById('compareP1Lc');
  const compareP1Cf = document.getElementById('compareP1Cf');
  const compareP2Lc = document.getElementById('compareP2Lc');
  const compareP2Cf = document.getElementById('compareP2Cf');
  const runCompareBtn = document.getElementById('runCompareBtn');
  const compareSpinner = document.getElementById('compareSpinner');
  const compareBtnLabel = document.getElementById('compareBtnLabel');
  const quickPairButtons = document.getElementById('quickPairButtons');
  const compareStatus = document.getElementById('compareStatus');
  const compareScoreboard = document.getElementById('compareScoreboard');
  const sbUser1 = document.getElementById('sbUser1');
  const sbUser2 = document.getElementById('sbUser2');
  const sbWinnerBadge = document.getElementById('sbWinnerBadge');
  const compareMetricsList = document.getElementById('compareMetricsList');
  const compareSubsGrid = document.getElementById('compareSubsGrid');
  const p1SubsTitle = document.getElementById('p1SubsTitle');
  const p1SubsList = document.getElementById('p1SubsList');
  const p2SubsTitle = document.getElementById('p2SubsTitle');
  const p2SubsList = document.getElementById('p2SubsList');

  // Today's Solves DOM
  const todaySolvedCard = document.getElementById('todaySolvedCard');
  const todayDateBadge = document.getElementById('todayDateBadge');
  const todayCount = document.getElementById('todayCount');
  const todayLcCount = document.getElementById('todayLcCount');
  const todayCfCount = document.getElementById('todayCfCount');
  const todayItemsContainer = document.getElementById('todayItemsContainer');

  // Metrics DOM
  const metricTotalSolved = document.getElementById('metricTotalSolved');
  const lcSolvedTag = document.getElementById('lcSolvedTag');
  const cfSolvedTag = document.getElementById('cfSolvedTag');
  const metricCurrentStreak = document.getElementById('metricCurrentStreak');
  const metricLongestStreak = document.getElementById('metricLongestStreak');
  const metricActiveDays = document.getElementById('metricActiveDays');
  const metricConsistency = document.getElementById('metricConsistency');
  const totalYearSubmissions = document.getElementById('totalYearSubmissions');

  // Heatmap DOM
  const platformFilter = document.getElementById('platformFilter');
  const acceptedOnlyCheck = document.getElementById('acceptedOnlyCheck');
  const yearSelect = document.getElementById('yearSelect');
  const heatmapSvgContainer = document.getElementById('heatmapSvgContainer');
  const tooltip = document.getElementById('heatmapTooltip');

  // Contest Section DOM
  const upcomingFilter = document.getElementById('upcomingFilter');
  const upcomingContestsList = document.getElementById('upcomingContestsList');
  const contestPlatformFilter = document.getElementById('contestPlatformFilter');
  const lcGlobalRank = document.getElementById('lcGlobalRank');
  const lcRatingVal = document.getElementById('lcRatingVal');
  const lcContestsCount = document.getElementById('lcContestsCount');
  const lcContestSolves = document.getElementById('lcContestSolves');
  const lcTopPercent = document.getElementById('lcTopPercent');

  const cfRankTitle = document.getElementById('cfRankTitle');
  const cfRatingVal = document.getElementById('cfRatingVal');
  const cfContestsCount = document.getElementById('cfContestsCount');
  const cfMaxRatingEl = document.getElementById('cfMaxRating');
  const cfContestSolves = document.getElementById('cfContestSolves');
  const contestHistoryList = document.getElementById('contestHistoryList');

  // Inspector DOM
  const inspectTitle = document.getElementById('inspectTitle');
  const inspectSubtitle = document.getElementById('inspectSubtitle');
  const resetInspectBtn = document.getElementById('resetInspectBtn');
  const submissionsList = document.getElementById('submissionsList');

  // Initialize
  function init() {
    applyTheme(state.theme);

    loadSavedProfiles();

    // Load saved handles
    const savedLc = localStorage.getItem('dsa_lc_handle') || '';
    const savedCf = localStorage.getItem('dsa_cf_handle') || '';

    if (savedLc) leetcodeInput.value = savedLc;
    if (savedCf) codeforcesInput.value = savedCf;

    renderSavedChips();
    populateCompareDropdowns();
    renderQuickPairs();

    setupEventListeners();
    fetchUpcomingContestsInitial();

    if (savedLc || savedCf) {
      fetchUserData(savedLc, savedCf);
    } else if (state.savedProfiles.length > 0) {
      const first = state.savedProfiles[0];
      switchToProfile(first);
    } else {
      // Default to demo on first visit for instant delight
      loadDemoData();
    }
  }

  // Theme
  function applyTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('dsa_theme', theme);
  }

  function switchTab(tab) {
    state.activeTab = tab;
    if (mainNavTabs) {
      mainNavTabs.querySelectorAll('.nav-tab').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
    }
    activityPanel?.classList.toggle('active', tab === 'activity');
    contestsPanel?.classList.toggle('active', tab === 'contests');
    comparePanel?.classList.toggle('active', tab === 'compare');

    if (tab === 'compare') {
      populateCompareDropdowns();
      renderQuickPairs();
    }
  }

  function setupEventListeners() {
    // Top Navigation Tabs
    if (mainNavTabs) {
      mainNavTabs.querySelectorAll('.nav-tab').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
          switchTab(tabBtn.dataset.tab);
        });
      });
    }

    if (openCompareBtn) {
      openCompareBtn.addEventListener('click', () => {
        switchTab('compare');
      });
    }

    if (saveCurrentBtn) {
      saveCurrentBtn.addEventListener('click', () => {
        saveCurrentProfile();
      });
    }

    // Comparison participant selectors
    if (compareSelectP1) {
      compareSelectP1.addEventListener('change', () => {
        const id = compareSelectP1.value;
        const p = state.savedProfiles.find(x => x.id === id);
        if (p) {
          compareP1Lc.value = p.leetcode || '';
          compareP1Cf.value = p.codeforces || '';
        }
      });
    }

    if (compareSelectP2) {
      compareSelectP2.addEventListener('change', () => {
        const id = compareSelectP2.value;
        const p = state.savedProfiles.find(x => x.id === id);
        if (p) {
          compareP2Lc.value = p.leetcode || '';
          compareP2Cf.value = p.codeforces || '';
        }
      });
    }

    if (runCompareBtn) {
      runCompareBtn.addEventListener('click', () => {
        runComparison();
      });
    }

    themeToggle.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    handleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const lc = leetcodeInput.value.trim();
      const cf = codeforcesInput.value.trim();
      if (!lc && !cf) {
        showStatus('Please enter at least one handle (LeetCode or Codeforces)', 'error');
        return;
      }
      localStorage.setItem('dsa_lc_handle', lc);
      localStorage.setItem('dsa_cf_handle', cf);
      fetchUserData(lc, cf);
    });

    demoBtn.addEventListener('click', () => {
      leetcodeInput.value = 'lee215';
      codeforcesInput.value = 'tourist';
      localStorage.setItem('dsa_lc_handle', 'lee215');
      localStorage.setItem('dsa_cf_handle', 'tourist');
      fetchUserData('lee215', 'tourist');
    });

    // Platform filter buttons
    platformFilter.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        platformFilter.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.platformFilter = btn.dataset.platform;
        updatePalette();
        renderHeatmap();
        renderMetrics();
      });
    });

    // Accepted only checkbox
    acceptedOnlyCheck.addEventListener('change', () => {
      state.acceptedOnly = acceptedOnlyCheck.checked;
      renderHeatmap();
      renderMetrics();
    });

    // Year selector
    yearSelect.addEventListener('change', () => {
      state.selectedYear = yearSelect.value;
      renderHeatmap();
      renderMetrics();
    });

    // Upcoming Contests Platform filter buttons
    if (upcomingFilter) {
      upcomingFilter.querySelectorAll('.seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          upcomingFilter.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          state.upcomingPlatformFilter = btn.dataset.upcomingPlatform;
          renderUpcomingContests();
        });
      });
    }

    // Past Contests Platform filter buttons
    contestPlatformFilter.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        contestPlatformFilter.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.contestPlatformFilter = btn.dataset.contestPlatform;
        renderContestSection();
      });
    });

    // Reset day inspector
    resetInspectBtn.addEventListener('click', () => {
      state.selectedDate = null;
      document.querySelectorAll('.day-cell.selected').forEach(c => c.classList.remove('selected'));
      resetInspectBtn.classList.add('hidden');
      renderRecentSubmissions();
    });
  }

  function updatePalette() {
    if (state.platformFilter === 'leetcode') {
      document.body.setAttribute('data-palette', 'leetcode');
    } else if (state.platformFilter === 'codeforces') {
      document.body.setAttribute('data-palette', 'codeforces');
    } else {
      document.body.removeAttribute('data-palette');
    }
  }

  function setLoading(isLoading) {
    if (isLoading) {
      syncBtn.classList.add('loading');
      syncBtn.disabled = true;
      btnLabel.textContent = 'Syncing...';
    } else {
      syncBtn.classList.remove('loading');
      syncBtn.disabled = false;
      btnLabel.textContent = 'Track Activity';
    }
  }

  function showStatus(text, type = 'info') {
    statusMessage.textContent = text;
    statusMessage.className = `status-msg ${type}`;
    statusMessage.classList.remove('hidden');
    if (type !== 'error') {
      setTimeout(() => statusMessage.classList.add('hidden'), 4000);
    }
  }

  function clearStatus() {
    statusMessage.classList.add('hidden');
    statusMessage.textContent = '';
  }

  // Load demo data
  function loadDemoData() {
    leetcodeInput.value = 'lee215';
    codeforcesInput.value = 'tourist';
    fetchUserData('lee215', 'tourist');
  }

  // Fetch API with clear error handling
  async function fetchUserData(lcHandle, cfHandle) {
    setLoading(true);
    clearStatus();

    try {
      const params = new URLSearchParams();
      if (lcHandle) params.set('leetcode', lcHandle);
      if (cfHandle) params.set('codeforces', cfHandle);

      let data = null;

      // Check if running on file:// protocol
      if (window.location.protocol === 'file:') {
        showStatus('⚠️ You opened the file directly. Please visit http://localhost:3000 in your browser for live tracking.', 'error');
        setLoading(false);
        return;
      }

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        try {
          const res = await fetch(`/api/user-data?${params.toString()}`);
          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json?.success && json?.data) {
              data = json.data;
            }
          }
        } catch (_) {}
      }

      if (!data) {
        data = await fetchClientSide(lcHandle, cfHandle);
      }

      if (!data) {
        throw new Error('No data received from tracker.');
      }

      const { leetcode, codeforces, combinedDailyMap, streakInfo, contests, upcomingContests, errors } = data;

      state.leetcode = leetcode;
      state.codeforces = codeforces;
      state.combinedDailyMap = combinedDailyMap || {};
      state.streakInfo = streakInfo || { currentStreak: 0, longestStreak: 0, activeDays: 0 };
      state.contests = contests || [];
      if (upcomingContests && Array.isArray(upcomingContests)) {
        state.upcomingContests = upcomingContests;
      }

      if (errors) {
        const errList = [];
        if (errors.leetcode) errList.push(`LeetCode: ${errors.leetcode}`);
        if (errors.codeforces) errList.push(`Codeforces: ${errors.codeforces}`);
        showStatus(`Notice: ${errList.join(' | ')}`, 'error');
      }

      populateYearOptions();
      renderMetrics();
      renderTodaySolved();
      renderHeatmap();
      renderContestSection();
      renderUpcomingContests();
      renderRecentSubmissions();
      renderSavedChips();
    } catch (err) {
      console.error('fetchUserData error:', err);
      showStatus(err.message || 'Error loading profile data', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Calculate streak on client
  function calculateStreakClient(dailyMap) {
    const dates = Object.keys(dailyMap)
      .filter((d) => {
        const v = dailyMap[d];
        return typeof v === 'number' ? v > 0 : (v?.total || 0) > 0;
      })
      .sort();

    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, activeDays: 0 };

    const set = new Set(dates);
    const now = new Date();
    let currentStreak = 0;
    let checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const todayKey = formatDateStr(checkDate);
    if (!set.has(todayKey)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    while (set.has(formatDateStr(checkDate))) {
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const dateStr of dates) {
      const curDate = new Date(dateStr + 'T00:00:00Z');
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = curDate;
    }

    return {
      currentStreak,
      longestStreak,
      activeDays: dates.length
    };
  }

  // Client-side fallback for static deployments (Vercel static, GitHub Pages, Netlify)
  async function fetchClientSide(lcHandle, cfHandle) {
    let cfData = null;
    let lcData = null;
    const errors = {};
    let cfContests = [];
    let lcContests = [];

    if (cfHandle) {
      try {
        const [cfStatusRes, cfInfoRes, cfRatingRes] = await Promise.allSettled([
          fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}&from=1&count=10000`),
          fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cfHandle)}`),
          fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(cfHandle)}`)
        ]);

        let subs = [];
        if (cfStatusRes.status === 'fulfilled' && cfStatusRes.value.ok) {
          const sJson = await cfStatusRes.value.json().catch(() => null);
          if (sJson?.status === 'OK') {
            subs = sJson.result || [];
          } else {
            errors.codeforces = sJson?.comment || 'Codeforces user error';
          }
        }

        let userInfo = null;
        if (cfInfoRes.status === 'fulfilled' && cfInfoRes.value.ok) {
          const uJson = await cfInfoRes.value.json().catch(() => null);
          if (uJson?.status === 'OK' && uJson.result?.length > 0) {
            userInfo = uJson.result[0];
          }
        }

        if (cfRatingRes.status === 'fulfilled' && cfRatingRes.value.ok) {
          const rJson = await cfRatingRes.value.json().catch(() => null);
          if (rJson?.status === 'OK' && Array.isArray(rJson.result)) {
            cfContests = rJson.result.map(c => ({
              platform: 'codeforces',
              contestId: c.contestId,
              contestName: c.contestName,
              contestUrl: `https://codeforces.com/contest/${c.contestId}`,
              timestamp: c.ratingUpdateTimeSeconds,
              rank: c.rank,
              oldRating: c.oldRating,
              newRating: c.newRating,
              delta: c.newRating - c.oldRating
            })).reverse();
          }
        }

        const dailyMap = {};
        const dailyAcceptedMap = {};
        const dailyContestMap = {};
        const solvedSet = new Set();
        const contestSolvedSet = new Set();
        const dayAcceptedProblemSet = new Set();
        const recent = [];

        subs.forEach((sub) => {
          const dateStr = formatDateStr(new Date(sub.creationTimeSeconds * 1000));
          dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
          const isAc = sub.verdict === 'OK';
          const pType = sub.author?.participantType;
          const isContest = pType === 'CONTESTANT' || pType === 'VIRTUAL' || pType === 'OUT_OF_COMPETITION';
          const pKey = `${sub.problem.contestId}-${sub.problem.index}`;

          if (isAc) {
            solvedSet.add(pKey);
            const dayKey = `${dateStr}:${pKey}`;
            if (!dayAcceptedProblemSet.has(dayKey)) {
              dayAcceptedProblemSet.add(dayKey);
              dailyAcceptedMap[dateStr] = (dailyAcceptedMap[dateStr] || 0) + 1;
            }
            if (isContest) {
              contestSolvedSet.add(pKey);
              dailyContestMap[dateStr] = (dailyContestMap[dateStr] || 0) + 1;
            }
          }

          if (recent.length < 35) {
            const contestId = sub.problem.contestId;
            const index = sub.problem.index;
            recent.push({
              platform: 'codeforces',
              title: `${sub.problem.index}. ${sub.problem.name}`,
              url: contestId && index ? `https://codeforces.com/contest/${contestId}/problem/${index}` : 'https://codeforces.com/problemset',
              timestamp: sub.creationTimeSeconds,
              verdict: isAc ? 'Accepted' : (sub.verdict || 'Rejected'),
              rating: sub.problem.rating || null,
              tags: sub.problem.tags || [],
              isContest
            });
          }
        });

        cfData = {
          platform: 'codeforces',
          username: userInfo?.handle || cfHandle,
          profile: {
            name: [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(' ') || userInfo?.handle || cfHandle,
            avatar: userInfo?.avatar || userInfo?.titlePhoto || '',
            rank: userInfo?.rank || '',
            rating: userInfo?.rating || 0,
            maxRating: userInfo?.maxRating || 0,
            contestsAttended: cfContests.length
          },
          totalSolved: solvedSet.size,
          totalContestSolved: contestSolvedSet.size,
          dailyMap,
          dailyAcceptedMap,
          dailyContestMap,
          contests: cfContests,
          recentSubmissions: recent
        };
      } catch (e) {
        errors.codeforces = e.message;
      }
    }

    if (lcHandle) {
      try {
        const [calRes, solvedRes, profileRes, contestRes, acSubRes] = await Promise.allSettled([
          fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(lcHandle)}/calendar`),
          fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(lcHandle)}/solved`),
          fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(lcHandle)}`),
          fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(lcHandle)}/contest`),
          fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(lcHandle)}/acSubmission?limit=30`)
        ]);

        const dailyMap = {};
        let streak = 0;
        let totalActiveDays = 0;
        let totalSolvedCount = 0;
        let easySolved = 0;
        let mediumSolved = 0;
        let hardSolved = 0;
        let ranking = null;
        let avatar = '';
        let realName = lcHandle;

        // 1. Process calendar
        if (calRes.status === 'fulfilled' && calRes.value.ok) {
          const calJson = await calRes.value.json().catch(() => null);
          const rawCal = typeof calJson?.submissionCalendar === 'string'
            ? JSON.parse(calJson.submissionCalendar || '{}')
            : (calJson?.submissionCalendar || {});
          for (const [tsStr, count] of Object.entries(rawCal)) {
            const dateStr = formatDateStr(new Date(parseInt(tsStr, 10) * 1000));
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + count;
          }
          streak = calJson?.streak || 0;
          totalActiveDays = calJson?.totalActiveDays || 0;
        }

        // 2. Process solved counts
        if (solvedRes.status === 'fulfilled' && solvedRes.value.ok) {
          const solvedData = await solvedRes.value.json().catch(() => null);
          totalSolvedCount = solvedData?.solvedProblem || 0;
          easySolved = solvedData?.easySolved || 0;
          mediumSolved = solvedData?.mediumSolved || 0;
          hardSolved = solvedData?.hardSolved || 0;
        }

        // 3. User profile info
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
          const profileData = await profileRes.value.json().catch(() => null);
          if (profileData?.name) realName = profileData.name;
          if (profileData?.avatar) avatar = profileData.avatar;
          if (profileData?.ranking) ranking = profileData.ranking;
        }

        // 4. Contest ranking and participation
        let totalLcContestSolved = 0;
        const dailyContestMap = {};
        const contestRecent = [];
        let contestInfo = null;

        if (contestRes.status === 'fulfilled' && contestRes.value.ok) {
          const ctJson = await contestRes.value.json().catch(() => null);
          const attend = ctJson?.contestAttend ?? ctJson?.data?.userContestRanking?.attendedContestsCount ?? 0;
          const rating = Math.round(ctJson?.contestRating ?? ctJson?.data?.userContestRanking?.rating ?? 0);
          const globalRank = ctJson?.contestGlobalRanking ?? ctJson?.data?.userContestRanking?.globalRanking ?? null;
          const topPercent = ctJson?.contestTopPercentage ?? ctJson?.data?.userContestRanking?.topPercentage ?? null;

          contestInfo = {
            rating,
            globalRanking: globalRank,
            topPercentage: topPercent,
            attendedContestsCount: attend
          };

          const rawParticipation = ctJson?.contestParticipation || ctJson?.data?.userContestRankingHistory || [];
          let prev = 1500;
          for (const c of rawParticipation.filter(x => x.attended)) {
            const nr = Math.round(c.rating || 0);
            const delta = Math.round(nr - prev);
            prev = nr;
            const contestTitle = c.contest?.title || 'Contest';
            const slug = contestTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const solved = c.problemsSolved || 0;

            if (solved > 0) {
              totalLcContestSolved += solved;
              const contestDate = new Date((c.contest?.startTime || 0) * 1000);
              const key = formatDateStr(contestDate);

              dailyMap[key] = (dailyMap[key] || 0) + solved;
              dailyContestMap[key] = (dailyContestMap[key] || 0) + solved;

              contestRecent.push({
                platform: 'leetcode',
                title: `🏆 ${contestTitle} (${solved}/${c.totalProblems || 4} solved)`,
                url: `https://leetcode.com/contest/${slug}`,
                timestamp: c.contest?.startTime || 0,
                verdict: 'Accepted',
                isContest: true,
                problemsSolved: solved
              });
            }

            lcContests.push({
              platform: 'leetcode',
              contestName: contestTitle,
              contestUrl: `https://leetcode.com/contest/${slug}`,
              timestamp: c.contest?.startTime || 0,
              problemsSolved: c.problemsSolved || 0,
              totalProblems: c.totalProblems || 4,
              rank: c.ranking,
              newRating: nr,
              delta
            });
          }
          lcContests.reverse();
        }

        // 5. Recent submissions
        let recentSubs = [];
        if (acSubRes.status === 'fulfilled' && acSubRes.value.ok) {
          const acJson = await acSubRes.value.json().catch(() => null);
          if (Array.isArray(acJson?.submission)) {
            recentSubs = acJson.submission.map((sub) => ({
              platform: 'leetcode',
              title: sub.title,
              url: `https://leetcode.com/problems/${sub.titleSlug}/`,
              timestamp: parseInt(sub.timestamp, 10),
              verdict: 'Accepted',
              isContest: false
            }));
          }
        }

        // 6. Optional fallback for total solved problem count if still 0
        if (totalSolvedCount === 0) {
          try {
            const statsRes = await fetch(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(lcHandle)}`);
            if (statsRes.ok) {
              const statsJson = await statsRes.json().catch(() => null);
              if (statsJson?.status === 'success') {
                totalSolvedCount = statsJson.totalSolved || 0;
                easySolved = statsJson.easySolved || 0;
                mediumSolved = statsJson.mediumSolved || 0;
                hardSolved = statsJson.hardSolved || 0;
                if (!ranking) ranking = statsJson.ranking || null;
              }
            }
          } catch (_) {}
        }

        const mergedRecentSubs = [...recentSubs, ...contestRecent].sort((a, b) => b.timestamp - a.timestamp);

        if (totalSolvedCount === 0) {
          totalSolvedCount = Object.keys(dailyMap).length;
        }

        lcData = {
          platform: 'leetcode',
          username: lcHandle,
          profile: {
            name: realName,
            avatar,
            ranking,
            contestRating: Math.round(contestInfo?.rating || 0),
            globalRanking: contestInfo?.globalRanking || null,
            topPercentage: contestInfo?.topPercentage || null,
            contestsAttended: contestInfo?.attendedContestsCount || lcContests.length
          },
          totalSolved: totalSolvedCount,
          easySolved,
          mediumSolved,
          hardSolved,
          totalContestSolved: totalLcContestSolved,
          streak,
          totalActiveDays: totalActiveDays || Object.keys(dailyMap).length,
          dailyMap,
          dailyContestMap,
          contests: lcContests,
          recentSubmissions: mergedRecentSubs
        };
        console.log('LeetCode contest data:', lcData.totalContestSolved, lcData.contests.length, lcData.recentSubmissions.filter(s=>s.isContest).length);
      } catch (e) {
        errors.leetcode = 'Direct LeetCode query not reachable: ' + e.message;
      }
    }

    // Merge
    const combinedDailyMap = {};
    const lcDaily = lcData?.dailyMap || {};
    const cfDaily = cfData?.dailyAcceptedMap || cfData?.dailyMap || {};
    const lcContest = lcData?.dailyContestMap || {};
    const cfContest = cfData?.dailyContestMap || {};
    const allDates = new Set([...Object.keys(lcDaily), ...Object.keys(cfDaily)]);

    for (const d of allDates) {
      const lc = lcDaily[d] || 0;
      const cf = cfDaily[d] || 0;
      const lcC = lcContest[d] || 0;
      const cfC = cfContest[d] || 0;
      combinedDailyMap[d] = {
        total: lc + cf,
        leetcode: lc,
        codeforces: cf,
        contest: lcC + cfC,
        leetcodeContest: lcC,
        codeforcesContest: cfC
      };
    }

    const streakInfo = calculateStreakClient(combinedDailyMap);
    const combinedContests = [...lcContests, ...cfContests].sort((a, b) => b.timestamp - a.timestamp);

    return {
      leetcode: lcData,
      codeforces: cfData,
      combinedDailyMap,
      streakInfo,
      totalContestSolved: (lcData?.totalContestSolved || 0) + (cfData?.totalContestSolved || 0),
      contests: combinedContests,
      upcomingContests: state.upcomingContests || [],
      errors: Object.keys(errors).length > 0 ? errors : null
    };
  }

  // Populate Year Dropdown dynamically based on activity
  function populateYearOptions() {
    const currentYear = new Date().getUTCFullYear();
    const yearsSet = new Set([currentYear, currentYear - 1]);

    Object.keys(state.combinedDailyMap).forEach((dateStr) => {
      const y = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(y) && y >= 2015 && y <= currentYear + 1) {
        yearsSet.add(y);
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    yearSelect.innerHTML = `<option value="last365">Past 365 Days</option>`;
    sortedYears.forEach((y) => {
      yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });

    if (state.selectedYear !== 'last365' && !yearsSet.has(parseInt(state.selectedYear, 10))) {
      state.selectedYear = 'last365';
    }
    yearSelect.value = state.selectedYear;
  }

  // Metrics Rendering
  function renderMetrics() {
    const lcSolved = state.leetcode?.totalSolved || 0;
    const cfSolved = state.codeforces?.totalSolved || 0;
    const lcContest = state.leetcode?.totalContestSolved || 0;
    const cfContest = state.codeforces?.totalContestSolved || 0;

    let total = 0;
    if (state.platformFilter === 'leetcode') {
      total = lcSolved + lcContest;
    } else if (state.platformFilter === 'codeforces') {
      total = cfSolved;
    } else {
      total = lcSolved + lcContest + cfSolved;
    }

    metricTotalSolved.textContent = total.toLocaleString();
    lcSolvedTag.textContent = `${(lcSolved + lcContest).toLocaleString()} LC${lcContest > 0 ? ` (+${lcContest} contest)` : ''}`;
    cfSolvedTag.textContent = `${cfSolved.toLocaleString()} CF${cfContest > 0 ? ` (${cfContest} contest)` : ''}`;

    // Streaks
    const currentStreak = state.streakInfo?.currentStreak || 0;
    const longestStreak = state.streakInfo?.longestStreak || 0;
    const activeDays = state.streakInfo?.activeDays || 0;

    metricCurrentStreak.textContent = currentStreak;
    metricLongestStreak.textContent = longestStreak;
    metricActiveDays.textContent = activeDays.toLocaleString();

    const daysInYear = 365;
    const consistencyPct = Math.min(100, Math.round((activeDays / daysInYear) * 100));
    metricConsistency.textContent = `${consistencyPct}% of year active`;

    renderTodaySolved();
  }

  // Render Questions Solved Today
  function renderTodaySolved() {
    if (!todayCount || !todayItemsContainer) return;

    const now = new Date();
    const todayLocal = toLocalDateKey(now);
    const todayUtc = toDateKey(now);

    if (todayDateBadge) {
      const dateFormatted = now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      todayDateBadge.textContent = dateFormatted;
    }

    // Check recent submissions for unique accepted problems solved today
    const allRecent = getMergedRecentSubmissions();
    const uniqueTodayMap = new Map();

    for (const sub of allRecent) {
      const isAc = sub.verdict === 'Accepted' || sub.verdict === 'OK';
      if (!isAc) continue;
      const subD = new Date(sub.timestamp * 1000);
      const subLocal = toLocalDateKey(subD);
      const subUtc = toDateKey(subD);

      if (subLocal === todayLocal || subUtc === todayUtc) {
        // Normalize problem key so duplicate submissions to the same problem are counted once
        const cleanTitle = (sub.title || '').replace(/^🏆\s*/, '').trim().toLowerCase();
        const pKey = `${sub.platform}:${cleanTitle}`;
        if (!uniqueTodayMap.has(pKey)) {
          uniqueTodayMap.set(pKey, sub);
        }
      }
    }

    const todayUniqueSubs = Array.from(uniqueTodayMap.values());
    const lcSolvedToday = todayUniqueSubs.filter((s) => s.platform === 'leetcode').length;
    const cfSolvedToday = todayUniqueSubs.filter((s) => s.platform === 'codeforces').length;
    const todayTotal = todayUniqueSubs.length;

    todayCount.textContent = todayTotal;
    if (todayLcCount) todayLcCount.textContent = `${lcSolvedToday} LC`;
    if (todayCfCount) todayCfCount.textContent = `${cfSolvedToday} CF`;

    if (todayUniqueSubs.length > 0) {
      todayItemsContainer.innerHTML = `
        <div class="today-subs-list">
          ${todayUniqueSubs
            .map((item) => {
              const timeAgo = formatTimeAgo(new Date(item.timestamp * 1000));
              return `
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="today-sub-item">
                  <div class="sub-left">
                    <span class="sub-platform-pill ${item.platform === 'leetcode' ? 'lc' : 'cf'}">
                      ${item.platform === 'leetcode' ? 'LC' : 'CF'}
                    </span>
                    ${item.isContest ? '<span class="sub-contest-pill">Contest</span>' : ''}
                    <span class="sub-problem-title" title="${escapeHtml(item.title)}">
                      ${escapeHtml(item.title)}
                    </span>
                  </div>
                  <div class="sub-right">
                    <span class="sub-verdict accepted">Accepted</span>
                    <span class="sub-time">${timeAgo}</span>
                  </div>
                </a>
              `;
            })
            .join('')}
        </div>
      `;
    } else {
      const curStreak = state.streakInfo?.currentStreak || 0;
      todayItemsContainer.innerHTML = `
        <div class="today-empty-state">
          <span>🎯 No questions solved yet today.</span>
          <span style="font-size: 0.75rem; color: var(--text-muted)">
            ${curStreak > 0 ? `Solve a problem today to extend your <strong>${curStreak}-day streak</strong>!` : 'Solve a problem today to start your streak!'}
          </span>
        </div>
      `;
    }
  }

  // Get daily count based on active platform & filter
  function getCountForDate(dateStr) {
    const entry = state.combinedDailyMap[dateStr];
    if (!entry) {
      // Check CF unaccepted if needed
      if (!state.acceptedOnly && state.codeforces?.dailyMap) {
        const cfAll = state.codeforces.dailyMap[dateStr] || 0;
        const lc = state.leetcode?.dailyMap[dateStr] || 0;
        if (state.platformFilter === 'leetcode') return lc;
        if (state.platformFilter === 'codeforces') return cfAll;
        return lc + cfAll;
      }
      return 0;
    }

    if (state.platformFilter === 'leetcode') return entry.leetcode;
    if (state.platformFilter === 'codeforces') {
      if (!state.acceptedOnly && state.codeforces?.dailyMap) {
        return state.codeforces.dailyMap[dateStr] || 0;
      }
      return entry.codeforces;
    }

    if (!state.acceptedOnly && state.codeforces?.dailyMap) {
      const cfAll = state.codeforces.dailyMap[dateStr] || 0;
      return entry.leetcode + cfAll;
    }

    return entry.total;
  }

  function getLevel(count) {
    if (count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  }

  function toDateKey(d) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function toLocalDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateStr(d) {
    return toDateKey(d);
  }

  // Heatmap SVG Generation
  function renderHeatmap() {
    const cellSize = 11;
    const cellGap = 3;
    const leftMargin = 30;
    const topMargin = 20;

    let startDate, endDate;
    const now = new Date();

    if (state.selectedYear === 'last365') {
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      // Go back ~52 weeks to preceding Sunday
      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 364);
      while (startDate.getUTCDay() !== 0) {
        startDate.setUTCDate(startDate.getUTCDate() - 1);
      }
    } else {
      const y = parseInt(state.selectedYear, 10);
      startDate = new Date(Date.UTC(y, 0, 1));
      // align to previous Sunday if not Sunday
      while (startDate.getUTCDay() !== 0) {
        startDate.setUTCDate(startDate.getUTCDate() - 1);
      }
      endDate = new Date(Date.UTC(y, 11, 31));
      // align to end of week (Saturday)
      while (endDate.getUTCDay() !== 6) {
        endDate.setUTCDate(endDate.getUTCDate() + 1);
      }
    }

    // Build weeks
    const weeks = [];
    let currentWeek = [];
    let cur = new Date(startDate);
    let totalSubmissionsInPeriod = 0;

    const monthLabels = [];
    let lastMonth = -1;

    while (cur <= endDate) {
      const dateStr = formatDateStr(cur);
      const count = getCountForDate(dateStr);
      totalSubmissionsInPeriod += count;

      const dayOfWeek = cur.getUTCDay();
      const month = cur.getUTCMonth();

      if (month !== lastMonth) {
        if (cur.getUTCDate() <= 14) {
          monthLabels.push({
            weekIndex: weeks.length,
            name: cur.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
          });
        }
        lastMonth = month;
      }

      const lcCount = state.leetcode?.dailyMap[dateStr] || 0;
      let cfCount = state.codeforces?.dailyAcceptedMap?.[dateStr] || 0;
      if (!state.acceptedOnly && state.codeforces?.dailyMap) {
        cfCount = state.codeforces.dailyMap[dateStr] || 0;
      }

      currentWeek.push({
        date: dateStr,
        dayOfWeek,
        count,
        lcCount,
        cfCount,
        level: getLevel(count)
      });

      if (dayOfWeek === 6 || cur.getTime() === endDate.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    totalYearSubmissions.textContent = `${totalSubmissionsInPeriod.toLocaleString()} submissions in selected period`;

    // Compute SVG dimensions
    const width = leftMargin + weeks.length * (cellSize + cellGap) + 10;
    const height = topMargin + 7 * (cellSize + cellGap) + 10;

    let svgHtml = `<svg class="heatmap-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Month labels
    monthLabels.forEach((ml) => {
      const x = leftMargin + ml.weekIndex * (cellSize + cellGap);
      svgHtml += `<text class="month-label" x="${x}" y="12">${ml.name}</text>`;
    });

    // Day of week labels (Mon, Wed, Fri)
    const dayNames = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    dayNames.forEach((dName, idx) => {
      if (dName) {
        const y = topMargin + idx * (cellSize + cellGap) + cellSize - 2;
        svgHtml += `<text class="day-label" x="4" y="${y}">${dName}</text>`;
      }
    });

    // Day cells
    weeks.forEach((week, wIdx) => {
      week.forEach((day) => {
        const x = leftMargin + wIdx * (cellSize + cellGap);
        const y = topMargin + day.dayOfWeek * (cellSize + cellGap);
        const isSelected = state.selectedDate === day.date;
        const fillMap = {
          0: 'var(--cell-empty)',
          1: 'var(--cell-l1)',
          2: 'var(--cell-l2)',
          3: 'var(--cell-l3)',
          4: 'var(--cell-l4)'
        };
        const fillColor = fillMap[day.level] || 'var(--cell-empty)';

        svgHtml += `
          <rect
            class="day-cell level-${day.level} ${isSelected ? 'selected' : ''}"
            x="${x}"
            y="${y}"
            width="${cellSize}"
            height="${cellSize}"
            rx="2"
            fill="${fillColor}"
            data-date="${day.date}"
            data-count="${day.count}"
            data-lc="${day.lcCount}"
            data-cf="${day.cfCount}"
          />
        `;
      });
    });

    svgHtml += `</svg>`;
    heatmapSvgContainer.innerHTML = svgHtml;

    attachCellEvents();
  }

  // Hover & Click Events
  function attachCellEvents() {
    const cells = heatmapSvgContainer.querySelectorAll('.day-cell');

    cells.forEach((cell) => {
      cell.addEventListener('mouseenter', (e) => {
        const dateStr = cell.dataset.date;
        const count = parseInt(cell.dataset.count, 10);
        const lc = parseInt(cell.dataset.lc, 10);
        const cf = parseInt(cell.dataset.cf, 10);

        const d = new Date(dateStr + 'T00:00:00Z');
        const formattedDate = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        });

        const entry = state.combinedDailyMap[dateStr];
        const contestCount = entry?.contest || 0;

        tooltip.innerHTML = `
          <div class="tooltip-date">${formattedDate}</div>
          <div class="tooltip-count">${count} submission${count === 1 ? '' : 's'}</div>
          ${(lc > 0 || cf > 0) ? `
            <div class="tooltip-breakdown">
              ${lc > 0 ? `<span class="tooltip-lc">${lc} LeetCode</span>` : ''}
              ${cf > 0 ? `<span class="tooltip-cf">${cf} Codeforces</span>` : ''}
            </div>
          ` : ''}
          ${contestCount > 0 ? `<div class="tooltip-contest">🏆 ${contestCount} contest solve${contestCount === 1 ? '' : 's'}</div>` : ''}
        `;
        tooltip.style.display = 'block';
        updateTooltipPosition(e);
      });

      cell.addEventListener('mousemove', (e) => {
        updateTooltipPosition(e);
      });

      cell.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      cell.addEventListener('click', () => {
        tooltip.style.display = 'none';
        const dateStr = cell.dataset.date;
        cells.forEach((c) => c.classList.remove('selected'));
        cell.classList.add('selected');
        state.selectedDate = dateStr;
        inspectDate(dateStr);
      });
    });
  }

  function updateTooltipPosition(e) {
    const pad = 12;
    let left = e.clientX;
    let top = e.clientY - pad;

    // Bounds check
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left - tooltipRect.width / 2 < 10) {
      left = 10 + tooltipRect.width / 2;
    } else if (left + tooltipRect.width / 2 > window.innerWidth - 10) {
      left = window.innerWidth - 10 - tooltipRect.width / 2;
    }

    if (top < 40) {
      top = e.clientY + 25;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  // Day Inspector
  function inspectDate(dateStr) {
    resetInspectBtn.classList.remove('hidden');

    const d = new Date(dateStr + 'T00:00:00Z');
    const formattedDate = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });

    const count = getCountForDate(dateStr);
    inspectTitle.textContent = formattedDate;
    inspectSubtitle.textContent = `${count} total submission${count === 1 ? '' : 's'} recorded`;

    // Filter recent submissions that occurred on this date
    const allRecent = getMergedRecentSubmissions();
    const dayMatches = allRecent.filter((sub) => {
      const subDate = formatDateStr(new Date(sub.timestamp * 1000));
      return subDate === dateStr;
    });

    if (dayMatches.length > 0) {
      renderSubmissionsList(dayMatches);
    } else if (count > 0) {
      submissionsList.innerHTML = `
        <div class="empty-state">
          <p>📅 <strong>${count} submission${count === 1 ? '' : 's'} on this date</strong></p>
          <p style="margin-top: 6px; font-size: 0.75rem; color: var(--text-muted)">
            (Historical platform APIs only provide problem details for the most recent 30-50 solves, but counts are tracked in the calendar summary above.)
          </p>
        </div>
      `;
    } else {
      submissionsList.innerHTML = `
        <div class="empty-state">
          <p>No activity recorded on this day.</p>
        </div>
      `;
    }
  }

  // Get merged and sorted recent submissions
  function getMergedRecentSubmissions() {
    const lcList = state.leetcode?.recentSubmissions || [];
    const cfList = state.codeforces?.recentSubmissions || [];

    const merged = [...lcList, ...cfList].sort((a, b) => b.timestamp - a.timestamp);
    return merged;
  }

  // Fetch upcoming contests independently on page load
  async function fetchUpcomingContestsInitial() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      try {
        const res = await fetch('/api/upcoming-contests');
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
            state.upcomingContests = json.data;
            renderUpcomingContests();
            return;
          }
        }
      } catch (_) {}
    }

    // Direct Codeforces and LeetCode upcoming contests
    const upcoming = [];

    // 1. Codeforces upcoming
    try {
      const cfRes = await fetch('https://codeforces.com/api/contest.list?gym=false');
      if (cfRes.ok) {
        const cfJson = await cfRes.json().catch(() => null);
        if (cfJson?.status === 'OK' && Array.isArray(cfJson.result)) {
          const cfUpcoming = cfJson.result
            .filter((c) => c.phase === 'BEFORE')
            .reverse()
            .map((c) => ({
              platform: 'codeforces',
              title: c.name,
              url: `https://codeforces.com/contestRegistration/${c.id}`,
              startTime: c.startTimeSeconds,
              duration: c.durationSeconds
            }));
          upcoming.push(...cfUpcoming);
        }
      }
    } catch (e) {
      console.warn('Direct CF upcoming contests fetch failed:', e);
    }

    // 2. LeetCode upcoming
    try {
      const lcRes = await fetch('https://alfa-leetcode-api.onrender.com/contests');
      if (lcRes.ok) {
        const lcJson = await lcRes.json().catch(() => null);
        const nowSec = Math.floor(Date.now() / 1000);
        if (Array.isArray(lcJson?.allContests)) {
          const lcUpcoming = lcJson.allContests
            .filter((c) => c.startTime && (c.startTime + (c.duration || 5400)) > nowSec)
            .map((c) => ({
              platform: 'leetcode',
              title: c.title,
              url: `https://leetcode.com/contest/${c.titleSlug}`,
              startTime: c.startTime,
              duration: c.duration
            }));
          upcoming.push(...lcUpcoming);
        }
      }
    } catch (e) {
      console.warn('Direct LC upcoming contests fetch failed:', e);
    }

    if (upcoming.length > 0) {
      upcoming.sort((a, b) => a.startTime - b.startTime);
      state.upcomingContests = upcoming;
      renderUpcomingContests();
    }
  }

  // Render Upcoming Contests
  function renderUpcomingContests() {
    const allUpcoming = state.upcomingContests || [];
    const totalCount = allUpcoming.length;

    if (navUpcomingCount) {
      navUpcomingCount.textContent = `${totalCount} upcoming`;
    }

    if (!upcomingContestsList) return;

    let list = allUpcoming;
    if (state.upcomingPlatformFilter !== 'all') {
      list = list.filter((c) => c.platform === state.upcomingPlatformFilter);
    }

    if (list.length === 0) {
      const platLabel = state.upcomingPlatformFilter === 'all'
        ? ''
        : (state.upcomingPlatformFilter === 'leetcode' ? 'LeetCode' : 'Codeforces');
      upcomingContestsList.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No upcoming ${platLabel} contests scheduled at the moment.</p>
        </div>
      `;
      return;
    }

    upcomingContestsList.innerHTML = list
      .map((c) => {
        const isLc = c.platform === 'leetcode';
        const startMs = (c.startTime || 0) * 1000;
        const now = Date.now();
        const diffMs = startMs - now;

        let countdownText = '';
        let isSoon = false;

        if (diffMs <= 0) {
          countdownText = 'Live Now';
          isSoon = true;
        } else {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const diffDays = Math.floor(diffHours / 24);

          if (diffDays > 0) {
            const remHours = diffHours % 24;
            countdownText = `Starts in ${diffDays}d ${remHours}h`;
          } else if (diffHours > 0) {
            countdownText = `Starts in ${diffHours}h ${diffMins}m`;
            isSoon = true;
          } else {
            countdownText = `Starts in ${diffMins}m`;
            isSoon = true;
          }
        }

        const startDate = new Date(startMs);
        const localTimeStr = startDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        let durationStr = '';
        if (c.duration) {
          const durHours = Math.floor(c.duration / 3600);
          const durMins = Math.floor((c.duration % 3600) / 60);
          if (durHours > 0 && durMins > 0) {
            durationStr = `${durHours}h ${durMins}m`;
          } else if (durHours > 0) {
            durationStr = `${durHours}h`;
          } else if (durMins > 0) {
            durationStr = `${durMins}m`;
          }
        }

        return `
          <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="upcoming-contest-card">
            <div class="upcoming-card-top">
              <span class="sub-platform-pill ${isLc ? 'lc' : 'cf'}">
                ${isLc ? 'LeetCode' : 'Codeforces'}
              </span>
              <span class="upcoming-countdown ${isSoon ? 'soon' : ''}">
                ${countdownText}
              </span>
            </div>
            <div class="upcoming-card-title" title="${escapeHtml(c.title)}">
              ${escapeHtml(c.title)}
            </div>
            <div class="upcoming-card-bottom">
              <span class="upcoming-date">${localTimeStr}</span>
              ${durationStr ? `<span class="upcoming-duration">${durationStr}</span>` : ''}
            </div>
          </a>
        `;
      })
      .join('');
  }

  // Render Contests & Rating Change Section
  function renderContestSection() {
    // LeetCode Rating Card
    const lcRating = state.leetcode?.profile?.contestRating || 0;
    const lcRank = state.leetcode?.profile?.globalRanking;
    const lcAttended = state.leetcode?.profile?.contestsAttended || 0;
    const lcSolves = state.leetcode?.totalContestSolved || 0;
    const lcTop = state.leetcode?.profile?.topPercentage;

    lcRatingVal.textContent = lcRating > 0 ? lcRating.toLocaleString() : 'Unrated';
    lcGlobalRank.textContent = lcRank ? `Global #${lcRank.toLocaleString()}` : 'Unranked';
    lcContestsCount.textContent = `${lcAttended} Contests`;
    lcContestSolves.textContent = `${lcSolves} Solved`;
    lcTopPercent.textContent = lcTop ? `Top ${lcTop}%` : 'Top —%';

    // Codeforces Rating Card
    const cfRating = state.codeforces?.profile?.rating || 0;
    const cfMaxRatingVal = state.codeforces?.profile?.maxRating || 0;
    const cfRank = state.codeforces?.profile?.rank || '';
    const cfAttended = state.codeforces?.profile?.contestsAttended || 0;
    const cfSolves = state.codeforces?.totalContestSolved || 0;

    cfRatingVal.textContent = cfRating > 0 ? cfRating.toLocaleString() : 'Unrated';
    cfRankTitle.textContent = cfRank ? cfRank.charAt(0).toUpperCase() + cfRank.slice(1) : 'Unranked';
    cfContestsCount.textContent = `${cfAttended} Contests`;
    cfMaxRatingEl.textContent = `Peak ${cfMaxRatingVal > 0 ? cfMaxRatingVal.toLocaleString() : '—'}`;
    cfContestSolves.textContent = `${cfSolves} Solved`;

    // Contest List
    let contests = state.contests || [];
    if (state.contestPlatformFilter !== 'all') {
      contests = contests.filter((c) => c.platform === state.contestPlatformFilter);
    }

    if (contests.length === 0) {
      contestHistoryList.innerHTML = `
        <div class="empty-state">
          <p>No contest participation recorded for selected platform.</p>
        </div>
      `;
      return;
    }

    contestHistoryList.innerHTML = contests
      .map((c) => {
        const isPos = c.delta > 0;
        const isNeg = c.delta < 0;
        const deltaClass = isPos ? 'pos' : (isNeg ? 'neg' : 'neutral');
        const deltaText = isPos ? `▲ +${c.delta}` : (isNeg ? `▼ ${c.delta}` : '0');
        const dateStr = new Date(c.timestamp * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const solvedBadge = c.problemsSolved !== undefined && c.totalProblems
          ? `<span class="contest-solved-pill">${c.problemsSolved}/${c.totalProblems} solved</span>`
          : '';
        const rankBadge = c.rank ? `<span class="contest-rank">#${c.rank.toLocaleString()}</span>` : '';

        return `
          <a href="${c.contestUrl}" target="_blank" rel="noopener noreferrer" class="contest-item">
            <div class="contest-left">
              <span class="sub-platform-pill ${c.platform === 'leetcode' ? 'lc' : 'cf'}">
                ${c.platform === 'leetcode' ? 'LC' : 'CF'}
              </span>
              <span class="contest-name" title="${escapeHtml(c.contestName)}">
                ${escapeHtml(c.contestName)}
              </span>
            </div>
            <div class="contest-right">
              ${solvedBadge}
              ${rankBadge}
              <span class="contest-rating-val">${c.newRating ? c.newRating.toLocaleString() : '—'}</span>
              <span class="delta-badge ${deltaClass}">${deltaText}</span>
              <span class="contest-date">${dateStr}</span>
            </div>
          </a>
        `;
      })
      .join('');
  }

  // Render Recent Submissions
  function renderRecentSubmissions() {
    inspectTitle.textContent = 'Recent Submissions';
    inspectSubtitle.textContent = 'Latest accepted solves across platforms';
    resetInspectBtn.classList.add('hidden');

    let list = getMergedRecentSubmissions();
    if (state.platformFilter !== 'all') {
      list = list.filter((s) => s.platform === state.platformFilter);
    }

    renderSubmissionsList(list.slice(0, 15));
  }

  function renderSubmissionsList(items) {
    if (!items || items.length === 0) {
      submissionsList.innerHTML = `
        <div class="empty-state">
          <p>No recent submissions found.</p>
        </div>
      `;
      return;
    }

    submissionsList.innerHTML = items
      .map((item) => {
        const isAc = item.verdict === 'Accepted' || item.verdict === 'OK';
        const date = new Date(item.timestamp * 1000);
        const timeAgo = formatTimeAgo(date);

        return `
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="submission-item">
            <div class="sub-left">
              <span class="sub-platform-pill ${item.platform === 'leetcode' ? 'lc' : 'cf'}">
                ${item.platform === 'leetcode' ? 'LC' : 'CF'}
              </span>
              ${item.isContest ? '<span class="sub-contest-pill">Contest</span>' : ''}
              <span class="sub-problem-title" title="${escapeHtml(item.title)}">
                ${escapeHtml(item.title)}
              </span>
            </div>
            <div class="sub-right">
              <span class="sub-verdict ${isAc ? 'accepted' : 'rejected'}">
                ${isAc ? 'Accepted' : item.verdict}
              </span>
              <span class="sub-time">${timeAgo}</span>
            </div>
          </a>
        `;
      })
      .join('');
  }

  function formatTimeAgo(date) {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // MULTI-USER PROFILES & QUICK SWITCHING
  // ==========================================
  const DEFAULT_PROFILES = [
    { id: 'p_kartik', name: 'kartik_225', leetcode: 'kartik_225', codeforces: 'kartik225' },
    { id: 'p_tourist', name: 'lee215 / tourist', leetcode: 'lee215', codeforces: 'tourist' },
    { id: 'p_harsh', name: 'harshdangi', leetcode: 'harshdangi', codeforces: 'harshdangithakur' }
  ];

  function loadSavedProfiles() {
    try {
      const stored = localStorage.getItem('dsa_saved_profiles');
      if (stored) {
        state.savedProfiles = JSON.parse(stored);
      }
    } catch (_) {}

    if (!Array.isArray(state.savedProfiles) || state.savedProfiles.length === 0) {
      state.savedProfiles = [...DEFAULT_PROFILES];
      const savedLc = localStorage.getItem('dsa_lc_handle') || '';
      const savedCf = localStorage.getItem('dsa_cf_handle') || '';
      if (savedLc || savedCf) {
        const exists = state.savedProfiles.some((p) =>
          (savedLc && p.leetcode.toLowerCase() === savedLc.toLowerCase()) ||
          (savedCf && p.codeforces.toLowerCase() === savedCf.toLowerCase())
        );
        if (!exists) {
          state.savedProfiles.unshift({
            id: 'p_' + Date.now(),
            name: savedLc || savedCf,
            leetcode: savedLc,
            codeforces: savedCf
          });
        }
      }
      saveProfilesToStorage();
    }
  }

  function saveProfilesToStorage() {
    try {
      localStorage.setItem('dsa_saved_profiles', JSON.stringify(state.savedProfiles));
    } catch (e) {
      console.warn('Failed to save profiles to localStorage:', e);
    }
  }

  function renderSavedChips() {
    if (!savedChipsList) return;
    const curLc = (leetcodeInput.value || '').trim().toLowerCase();
    const curCf = (codeforcesInput.value || '').trim().toLowerCase();

    savedChipsList.innerHTML = state.savedProfiles
      .map((p) => {
        const isLcMatch = p.leetcode && curLc && p.leetcode.toLowerCase() === curLc;
        const isCfMatch = p.codeforces && curCf && p.codeforces.toLowerCase() === curCf;
        const isActive = isLcMatch || isCfMatch;
        const initials = (p.name || p.leetcode || p.codeforces || 'U').charAt(0).toUpperCase();

        const platforms = [];
        if (p.leetcode) platforms.push('LC');
        if (p.codeforces) platforms.push('CF');

        return `
          <div class="saved-user-chip ${isActive ? 'active' : ''}" data-id="${p.id}" title="Click to track ${escapeHtml(p.name)}">
            <span class="chip-avatar">${initials}</span>
            <span class="chip-name">${escapeHtml(p.name)}</span>
            <span class="chip-platforms">(${platforms.join('/')})</span>
            <button type="button" class="chip-delete-btn" data-delete-id="${p.id}" title="Remove ${escapeHtml(p.name)}">×</button>
          </div>
        `;
      })
      .join('');

    savedChipsList.querySelectorAll('.saved-user-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.chip-delete-btn')) return;
        const id = chip.dataset.id;
        const profile = state.savedProfiles.find((p) => p.id === id);
        if (profile) {
          switchToProfile(profile);
        }
      });
    });

    savedChipsList.querySelectorAll('.chip-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        deleteProfile(id);
      });
    });
  }

  function switchToProfile(profile) {
    leetcodeInput.value = profile.leetcode || '';
    codeforcesInput.value = profile.codeforces || '';
    localStorage.setItem('dsa_lc_handle', profile.leetcode || '');
    localStorage.setItem('dsa_cf_handle', profile.codeforces || '');

    if (state.activeTab !== 'activity') {
      switchTab('activity');
    }

    renderSavedChips();
    fetchUserData(profile.leetcode, profile.codeforces);
  }

  function saveCurrentProfile() {
    const lc = leetcodeInput.value.trim();
    const cf = codeforcesInput.value.trim();
    if (!lc && !cf) {
      showStatus('Please enter a LeetCode or Codeforces handle before saving', 'error');
      return;
    }

    const existing = state.savedProfiles.find((p) =>
      (lc && p.leetcode.toLowerCase() === lc.toLowerCase()) &&
      (cf && p.codeforces.toLowerCase() === cf.toLowerCase())
    );

    if (existing) {
      showStatus(`Profile "${existing.name}" is already in your saved list!`, 'info');
      renderSavedChips();
      return;
    }

    const name = lc || cf;
    const newProfile = {
      id: 'p_' + Date.now(),
      name,
      leetcode: lc,
      codeforces: cf
    };

    state.savedProfiles.unshift(newProfile);
    saveProfilesToStorage();
    renderSavedChips();
    populateCompareDropdowns();
    renderQuickPairs();
    showStatus(`Saved "${name}" to local storage! Click its chip anytime to switch.`, 'info');
  }

  function deleteProfile(id) {
    const profile = state.savedProfiles.find((p) => p.id === id);
    const pName = profile?.name || 'User';
    state.savedProfiles = state.savedProfiles.filter((p) => p.id !== id);
    saveProfilesToStorage();
    renderSavedChips();
    populateCompareDropdowns();
    renderQuickPairs();
    showStatus(`Removed "${pName}" from saved profiles.`, 'info');
  }

  // ==========================================
  // PARTICIPANT COMPARISON SECTION
  // ==========================================
  function populateCompareDropdowns() {
    if (!compareSelectP1 || !compareSelectP2) return;

    const optionsHtml =
      '<option value="">-- Choose from saved profiles --</option>' +
      state.savedProfiles
        .map((p) => {
          const platforms = [];
          if (p.leetcode) platforms.push(`LC: ${p.leetcode}`);
          if (p.codeforces) platforms.push(`CF: ${p.codeforces}`);
          return `<option value="${p.id}">${escapeHtml(p.name)} (${platforms.join(', ')})</option>`;
        })
        .join('');

    const curP1Val = compareSelectP1.value;
    const curP2Val = compareSelectP2.value;

    compareSelectP1.innerHTML = optionsHtml;
    compareSelectP2.innerHTML = optionsHtml;

    if (curP1Val) compareSelectP1.value = curP1Val;
    if (curP2Val) compareSelectP2.value = curP2Val;

    // Seed defaults if empty
    if (!compareSelectP1.value && state.savedProfiles.length >= 1) {
      compareSelectP1.value = state.savedProfiles[0].id;
      compareP1Lc.value = state.savedProfiles[0].leetcode || '';
      compareP1Cf.value = state.savedProfiles[0].codeforces || '';
    }
    if (!compareSelectP2.value && state.savedProfiles.length >= 2) {
      compareSelectP2.value = state.savedProfiles[1].id;
      compareP2Lc.value = state.savedProfiles[1].leetcode || '';
      compareP2Cf.value = state.savedProfiles[1].codeforces || '';
    }
  }

  function renderQuickPairs() {
    if (!quickPairButtons) return;
    const profiles = state.savedProfiles;
    if (profiles.length < 2) {
      quickPairButtons.innerHTML = '<span style="font-size:0.72rem; color:var(--text-muted)">Save at least 2 profiles to enable 1-click comparison.</span>';
      return;
    }

    const pairs = [];
    for (let i = 0; i < Math.min(profiles.length, 4); i++) {
      for (let j = i + 1; j < Math.min(profiles.length, 4); j++) {
        pairs.push([profiles[i], profiles[j]]);
      }
    }

    quickPairButtons.innerHTML = pairs
      .slice(0, 4)
      .map(([p1, p2]) => {
        return `
          <button type="button" class="quick-pair-btn" data-p1="${p1.id}" data-p2="${p2.id}">
            ${escapeHtml(p1.name)} vs ${escapeHtml(p2.name)}
          </button>
        `;
      })
      .join('');

    quickPairButtons.querySelectorAll('.quick-pair-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p1Id = btn.dataset.p1;
        const p2Id = btn.dataset.p2;
        const p1 = state.savedProfiles.find((p) => p.id === p1Id);
        const p2 = state.savedProfiles.find((p) => p.id === p2Id);
        if (p1 && p2) {
          compareSelectP1.value = p1.id;
          compareP1Lc.value = p1.leetcode || '';
          compareP1Cf.value = p1.codeforces || '';

          compareSelectP2.value = p2.id;
          compareP2Lc.value = p2.leetcode || '';
          compareP2Cf.value = p2.codeforces || '';

          runComparison();
        }
      });
    });
  }

  async function fetchSingleUserData(lcHandle, cfHandle) {
    const params = new URLSearchParams();
    if (lcHandle) params.set('leetcode', lcHandle);
    if (cfHandle) params.set('codeforces', cfHandle);

    try {
      const res = await fetch(`/api/user-data?${params.toString()}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json().catch(() => null);
      if (!json?.success || !json?.data) {
        throw new Error(json?.error || 'Invalid API data');
      }
      return json.data;
    } catch (_) {
      return await fetchClientSide(lcHandle, cfHandle);
    }
  }

  async function runComparison() {
    const lc1 = (compareP1Lc?.value || '').trim();
    const cf1 = (compareP1Cf?.value || '').trim();
    const lc2 = (compareP2Lc?.value || '').trim();
    const cf2 = (compareP2Cf?.value || '').trim();

    if (!lc1 && !cf1) {
      showCompareStatus('Please specify handles for Participant 1 (LeetCode or Codeforces)', 'error');
      return;
    }
    if (!lc2 && !cf2) {
      showCompareStatus('Please specify handles for Participant 2 (LeetCode or Codeforces)', 'error');
      return;
    }

    setCompareLoading(true);
    clearCompareStatus();

    try {
      const [r1, r2] = await Promise.allSettled([
        fetchSingleUserData(lc1, cf1),
        fetchSingleUserData(lc2, cf2)
      ]);

      if (r1.status === 'rejected') {
        throw new Error(`Participant 1 error: ${r1.reason.message}`);
      }
      if (r2.status === 'rejected') {
        throw new Error(`Participant 2 error: ${r2.reason.message}`);
      }

      const d1 = r1.value;
      const d2 = r2.value;

      state.compareP1Data = d1;
      state.compareP2Data = d2;

      const name1 = lc1 || cf1;
      const name2 = lc2 || cf2;

      renderComparisonMetrics(d1, d2, name1, name2);
      renderComparisonSubmissions(d1, d2, name1, name2);

      compareScoreboard?.classList.remove('hidden');
      compareSubsGrid?.classList.remove('hidden');
    } catch (err) {
      console.error('Comparison error:', err);
      showCompareStatus(err.message, 'error');
    } finally {
      setCompareLoading(false);
    }
  }

  function setCompareLoading(isLoading) {
    if (!runCompareBtn) return;
    if (isLoading) {
      runCompareBtn.classList.add('loading');
      runCompareBtn.disabled = true;
      if (compareBtnLabel) compareBtnLabel.textContent = 'Comparing...';
    } else {
      runCompareBtn.classList.remove('loading');
      runCompareBtn.disabled = false;
      if (compareBtnLabel) compareBtnLabel.textContent = 'Compare Now';
    }
  }

  function showCompareStatus(text, type = 'info') {
    if (!compareStatus) return;
    compareStatus.textContent = text;
    compareStatus.className = `status-msg ${type}`;
    compareStatus.classList.remove('hidden');
  }

  function clearCompareStatus() {
    if (!compareStatus) return;
    compareStatus.classList.add('hidden');
    compareStatus.textContent = '';
  }

  function renderComparisonMetrics(d1, d2, name1, name2) {
    const total1 = (d1.leetcode?.totalSolved || 0) + (d1.codeforces?.totalSolved || 0);
    const total2 = (d2.leetcode?.totalSolved || 0) + (d2.codeforces?.totalSolved || 0);

    const lcSolved1 = d1.leetcode?.totalSolved || 0;
    const lcSolved2 = d2.leetcode?.totalSolved || 0;

    const cfSolved1 = d1.codeforces?.totalSolved || 0;
    const cfSolved2 = d2.codeforces?.totalSolved || 0;

    const curStreak1 = d1.streakInfo?.currentStreak || 0;
    const curStreak2 = d2.streakInfo?.currentStreak || 0;

    const longStreak1 = d1.streakInfo?.longestStreak || 0;
    const longStreak2 = d2.streakInfo?.longestStreak || 0;

    const activeDays1 = d1.streakInfo?.activeDays || 0;
    const activeDays2 = d2.streakInfo?.activeDays || 0;

    const lcRating1 = d1.leetcode?.profile?.contestRating || 0;
    const lcRating2 = d2.leetcode?.profile?.contestRating || 0;

    const cfRating1 = d1.codeforces?.profile?.rating || 0;
    const cfRating2 = d2.codeforces?.profile?.rating || 0;

    const contestsAttended1 = (d1.leetcode?.profile?.contestsAttended || 0) + (d1.codeforces?.profile?.contestsAttended || 0);
    const contestsAttended2 = (d2.leetcode?.profile?.contestsAttended || 0) + (d2.codeforces?.profile?.contestsAttended || 0);

    const contestSolves1 = (d1.leetcode?.totalContestSolved || 0) + (d1.codeforces?.totalContestSolved || 0);
    const contestSolves2 = (d2.leetcode?.totalContestSolved || 0) + (d2.codeforces?.totalContestSolved || 0);

    const metrics = [
      {
        title: 'Total Problems Solved',
        v1: total1,
        v2: total2,
        sub1: `${lcSolved1} LC / ${cfSolved1} CF`,
        sub2: `${lcSolved2} LC / ${cfSolved2} CF`
      },
      {
        title: 'LeetCode Solved',
        v1: lcSolved1,
        v2: lcSolved2,
        sub1: d1.leetcode ? 'Verified' : 'No account',
        sub2: d2.leetcode ? 'Verified' : 'No account'
      },
      {
        title: 'Codeforces Solved',
        v1: cfSolved1,
        v2: cfSolved2,
        sub1: d1.codeforces ? 'Verified' : 'No account',
        sub2: d2.codeforces ? 'Verified' : 'No account'
      },
      {
        title: 'Current Streak',
        v1: curStreak1,
        v2: curStreak2,
        sub1: `${curStreak1} consecutive days`,
        sub2: `${curStreak2} consecutive days`
      },
      {
        title: 'Longest Streak',
        v1: longStreak1,
        v2: longStreak2,
        sub1: 'Record consistency',
        sub2: 'Record consistency'
      },
      {
        title: 'Total Active Days',
        v1: activeDays1,
        v2: activeDays2,
        sub1: 'Days with >= 1 solve',
        sub2: 'Days with >= 1 solve'
      },
      {
        title: 'LeetCode Contest Rating',
        v1: lcRating1,
        v2: lcRating2,
        sub1: d1.leetcode?.profile?.globalRanking ? `Global #${d1.leetcode.profile.globalRanking.toLocaleString()}` : 'Unranked',
        sub2: d2.leetcode?.profile?.globalRanking ? `Global #${d2.leetcode.profile.globalRanking.toLocaleString()}` : 'Unranked'
      },
      {
        title: 'Codeforces Rating',
        v1: cfRating1,
        v2: cfRating2,
        sub1: d1.codeforces?.profile?.rank ? `${d1.codeforces.profile.rank} (Peak ${d1.codeforces.profile.maxRating || '—'})` : 'Unrated',
        sub2: d2.codeforces?.profile?.rank ? `${d2.codeforces.profile.rank} (Peak ${d2.codeforces.profile.maxRating || '—'})` : 'Unrated'
      },
      {
        title: 'Contests Attended',
        v1: contestsAttended1,
        v2: contestsAttended2,
        sub1: `${d1.leetcode?.profile?.contestsAttended || 0} LC / ${d1.codeforces?.profile?.contestsAttended || 0} CF`,
        sub2: `${d2.leetcode?.profile?.contestsAttended || 0} LC / ${d2.codeforces?.profile?.contestsAttended || 0} CF`
      },
      {
        title: 'Contest Solves',
        v1: contestSolves1,
        v2: contestSolves2,
        sub1: `${d1.leetcode?.totalContestSolved || 0} LC / ${d1.codeforces?.totalContestSolved || 0} CF`,
        sub2: `${d2.leetcode?.totalContestSolved || 0} LC / ${d2.codeforces?.totalContestSolved || 0} CF`
      }
    ];

    let p1Wins = 0;
    let p2Wins = 0;

    const rowsHtml = metrics
      .map((m) => {
        const isWin1 = m.v1 > m.v2;
        const isWin2 = m.v2 > m.v1;
        if (isWin1) p1Wins++;
        if (isWin2) p2Wins++;

        let pct1 = 50;
        let pct2 = 50;
        if (m.v1 > 0 || m.v2 > 0) {
          const tot = m.v1 + m.v2;
          pct1 = Math.round((m.v1 / tot) * 100);
          pct2 = 100 - pct1;
        }

        const delta = Math.abs(m.v1 - m.v2);
        let deltaText = 'Tied';
        if (isWin1) deltaText = `+${delta.toLocaleString()} for ${name1}`;
        if (isWin2) deltaText = `+${delta.toLocaleString()} for ${name2}`;

        return `
          <div class="compare-metric-row">
            <div class="metric-row-header">
              <span class="metric-val-p1 ${isWin1 ? 'winner' : ''}">${m.v1 > 0 ? m.v1.toLocaleString() : '0'}</span>
              <span class="metric-row-title">${m.title}</span>
              <span class="metric-val-p2 ${isWin2 ? 'winner' : ''}">${m.v2 > 0 ? m.v2.toLocaleString() : '0'}</span>
            </div>
            <div class="metric-bars-wrap">
              <div class="metric-bar-p1" style="width: ${pct1}%" title="${name1}: ${pct1}%"></div>
              <div class="metric-bar-p2" style="width: ${pct2}%" title="${name2}: ${pct2}%"></div>
            </div>
            <div class="metric-row-footer">
              <span>${m.sub1}</span>
              <span style="font-weight: 700; color: ${isWin1 ? '#60a5fa' : (isWin2 ? '#f59e0b' : 'var(--text-muted)')}">${deltaText}</span>
              <span>${m.sub2}</span>
            </div>
          </div>
        `;
      })
      .join('');

    if (compareMetricsList) {
      compareMetricsList.innerHTML = rowsHtml;
    }

    // Scoreboard Hero Render
    const avatar1 = d1.leetcode?.profile?.avatar;
    const avatar2 = d2.leetcode?.profile?.avatar;
    const init1 = name1.charAt(0).toUpperCase();
    const init2 = name2.charAt(0).toUpperCase();

    if (sbUser1) {
      sbUser1.innerHTML = `
        ${avatar1 ? `<img src="${avatar1}" class="sb-avatar p1" alt="${escapeHtml(name1)}" />` : `<div class="sb-avatar p1">${init1}</div>`}
        <div class="sb-info">
          <span class="sb-name">${escapeHtml(name1)}</span>
          <div class="sb-handles">
            ${d1.leetcode ? `<span>LC: ${escapeHtml(d1.leetcode.username)}</span>` : ''}
            ${d1.codeforces ? `<span>CF: ${escapeHtml(d1.codeforces.username)}</span>` : ''}
          </div>
        </div>
      `;
    }

    if (sbUser2) {
      sbUser2.innerHTML = `
        ${avatar2 ? `<img src="${avatar2}" class="sb-avatar p2" alt="${escapeHtml(name2)}" />` : `<div class="sb-avatar p2">${init2}</div>`}
        <div class="sb-info">
          <span class="sb-name">${escapeHtml(name2)}</span>
          <div class="sb-handles">
            ${d2.leetcode ? `<span>LC: ${escapeHtml(d2.leetcode.username)}</span>` : ''}
            ${d2.codeforces ? `<span>CF: ${escapeHtml(d2.codeforces.username)}</span>` : ''}
          </div>
        </div>
      `;
    }

    if (sbWinnerBadge) {
      if (p1Wins > p2Wins) {
        sbWinnerBadge.className = 'winner-badge lead-p1';
        sbWinnerBadge.textContent = `🏆 ${name1} leads in ${p1Wins}/${metrics.length} metrics`;
      } else if (p2Wins > p1Wins) {
        sbWinnerBadge.className = 'winner-badge lead-p2';
        sbWinnerBadge.textContent = `🏆 ${name2} leads in ${p2Wins}/${metrics.length} metrics`;
      } else {
        sbWinnerBadge.className = 'winner-badge';
        sbWinnerBadge.textContent = `🤝 Evenly matched (${p1Wins} - ${p2Wins})`;
      }
    }
  }

  function renderComparisonSubmissions(d1, d2, name1, name2) {
    if (p1SubsTitle) p1SubsTitle.textContent = `${name1}'s Solves`;
    if (p2SubsTitle) p2SubsTitle.textContent = `${name2}'s Solves`;

    function buildSubs(data) {
      const lcList = data.leetcode?.recentSubmissions || [];
      const cfList = data.codeforces?.recentSubmissions || [];
      return [...lcList, ...cfList].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
    }

    function renderSubsHtml(list) {
      if (!list || list.length === 0) {
        return '<div class="empty-state"><p>No recent submissions found.</p></div>';
      }
      return list
        .map((item) => {
          const isAc = item.verdict === 'Accepted' || item.verdict === 'OK';
          const timeAgo = formatTimeAgo(new Date(item.timestamp * 1000));
          return `
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="submission-item">
              <div class="sub-left">
                <span class="sub-platform-pill ${item.platform === 'leetcode' ? 'lc' : 'cf'}">
                  ${item.platform === 'leetcode' ? 'LC' : 'CF'}
                </span>
                <span class="sub-problem-title" title="${escapeHtml(item.title)}">
                  ${escapeHtml(item.title)}
                </span>
              </div>
              <div class="sub-right">
                <span class="sub-verdict ${isAc ? 'accepted' : 'rejected'}">
                  ${isAc ? 'Accepted' : item.verdict}
                </span>
                <span class="sub-time">${timeAgo}</span>
              </div>
            </a>
          `;
        })
        .join('');
    }

    if (p1SubsList) p1SubsList.innerHTML = renderSubsHtml(buildSubs(d1));
    if (p2SubsList) p2SubsList.innerHTML = renderSubsHtml(buildSubs(d2));
  }

  // Start app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
