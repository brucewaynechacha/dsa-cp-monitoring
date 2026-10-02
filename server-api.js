import dns from 'node:dns';

// Fix macOS Node.js IPv6 undici fetch slowdown & 'fetch failed' timeouts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

// Simple in-memory cache: key -> { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Convert a Date object to YYYY-MM-DD
function toDateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function fetchLeetCode(username) {
  if (!username) return null;
  const cacheKey = `lc:${username.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const query = `
    query getUserActivity($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
        userCalendar {
          submissionCalendar
          streak
          totalActiveDays
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        problemsSolved
        totalProblems
        rating
        ranking
        contest {
          title
          startTime
        }
      }
      recentAcSubmissionList(username: $username, limit: 30) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  let res;
  try {
    res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({ query, variables: { username } })
    });
  } catch (err) {
    console.warn(`[LeetCode] Direct GraphQL fetch failed for "${username}": ${err.message}. Trying backup API...`);
    try {
      const backupRes = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/calendar`, {
        signal: AbortSignal.timeout(10000)
      });
      if (backupRes.ok) {
        const backupJson = await backupRes.json();
        const rawCalendar = JSON.parse(backupJson.submissionCalendar || '{}');
        const dailyMap = {};
        for (const [timestampStr, count] of Object.entries(rawCalendar)) {
          const ts = parseInt(timestampStr, 10);
          const date = new Date(ts * 1000);
          const key = toDateKey(date);
          dailyMap[key] = (dailyMap[key] || 0) + count;
        }

        let solvedData = null;
        try {
          const sRes = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/solved`, {
            signal: AbortSignal.timeout(8000)
          });
          if (sRes.ok) solvedData = await sRes.json();
        } catch (_) {}

        let totalContestSolved = 0;
        const dailyContestMap = {};
        const contestRecent = [];
        let lcContests = [];
        let contestInfo = null;

        try {
          const cRes = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/contest`, {
            signal: AbortSignal.timeout(8000)
          });
          if (cRes.ok) {
            const ctJson = await cRes.json();
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

            const hist = ctJson?.contestParticipation || ctJson?.data?.userContestRankingHistory || [];
            let prev = 1500;
            for (const c of hist.filter(x => x.attended)) {
              const nr = Math.round(c.rating || 0);
              const delta = Math.round(nr - prev);
              prev = nr;
              const contestTitle = c.contest?.title || 'Contest';
              const slug = contestTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const solved = c.problemsSolved || 0;
              if (solved > 0) {
                totalContestSolved += solved;
                const cDate = new Date(c.contest.startTime * 1000);
                const key = toDateKey(cDate);
                dailyMap[key] = (dailyMap[key] || 0) + solved;
                dailyContestMap[key] = (dailyContestMap[key] || 0) + solved;
                contestRecent.push({
                  platform: 'leetcode',
                  title: `🏆 ${c.contest.title} (${solved}/${c.totalProblems} solved)`,
                  url: `https://leetcode.com/contest/${slug}`,
                  timestamp: c.contest.startTime,
                  verdict: 'Accepted',
                  isContest: true,
                  problemsSolved: solved
                });
              }
              lcContests.push({
                platform: 'leetcode',
                contestName: c.contest.title,
                contestUrl: `https://leetcode.com/contest/${slug}`,
                timestamp: c.contest.startTime,
                problemsSolved: c.problemsSolved,
                totalProblems: c.totalProblems,
                rank: c.ranking,
                newRating: nr,
                delta
              });
            }
            lcContests.reverse();
          }
        } catch (_) {}

        let recentSubs = [];
        try {
          const acRes = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/acSubmission?limit=25`, {
            signal: AbortSignal.timeout(8000)
          });
          if (acRes.ok) {
            const acJson = await acRes.json();
            if (Array.isArray(acJson?.submission)) {
              recentSubs = acJson.submission.map(sub => ({
                platform: 'leetcode',
                title: sub.title,
                url: `https://leetcode.com/problems/${sub.titleSlug}/`,
                timestamp: parseInt(sub.timestamp, 10),
                verdict: 'Accepted',
                isContest: false
              }));
            }
          }
        } catch (_) {}

        const mergedRecent = [...recentSubs, ...contestRecent].sort((a, b) => b.timestamp - a.timestamp);

        const totalSolvedCount = solvedData?.solvedProblem != null
          ? solvedData.solvedProblem
          : (solvedData?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count || Object.keys(dailyMap).length);

        const result = {
          platform: 'leetcode',
          username,
          profile: {
            name: username,
            avatar: '',
            ranking: null,
            contestRating: Math.round(contestInfo?.rating || 0),
            globalRanking: contestInfo?.globalRanking || null,
            topPercentage: contestInfo?.topPercentage || null,
            contestsAttended: contestInfo?.attendedContestsCount || lcContests.length
          },
          totalSolved: totalSolvedCount,
          easySolved: solvedData?.easySolved || 0,
          mediumSolved: solvedData?.mediumSolved || 0,
          hardSolved: solvedData?.hardSolved || 0,
          streak: backupJson.streak || 0,
          totalActiveDays: backupJson.totalActiveDays || Object.keys(dailyMap).length,
          dailyMap,
          dailyContestMap,
          totalContestSolved,
          contests: lcContests,
          recentSubmissions: mergedRecent
        };
        setCache(cacheKey, result);
        return result;
      }
    } catch (_) {}
    throw new Error(`Unable to reach LeetCode: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status}`);
  }

  const json = await res.json();
  if (json.errors || !json.data?.matchedUser) {
    throw new Error(`User "${username}" not found on LeetCode`);
  }

  const user = json.data.matchedUser;
  const rawCalendar = JSON.parse(user.userCalendar?.submissionCalendar || '{}');

  // Convert raw timestamp calendar into daily map { "YYYY-MM-DD": count }
  const dailyMap = {};
  for (const [timestampStr, count] of Object.entries(rawCalendar)) {
    const ts = parseInt(timestampStr, 10);
    const date = new Date(ts * 1000);
    const key = toDateKey(date);
    dailyMap[key] = (dailyMap[key] || 0) + count;
  }

  // Merge live contest questions solved into dailyMap & recentSubmissions
  const contestHistory = json.data.userContestRankingHistory || [];
  const attendedContests = contestHistory.filter(c => c.attended);
  let totalContestQuestionsSolved = 0;
  const dailyContestMap = {};
  const contestRecent = [];

  for (const c of attendedContests) {
    const solved = c.problemsSolved || 0;
    if (solved > 0) {
      totalContestQuestionsSolved += solved;
      const contestDate = new Date(c.contest.startTime * 1000);
      const key = toDateKey(contestDate);

      // Add contest questions into daily activity
      dailyMap[key] = (dailyMap[key] || 0) + solved;
      dailyContestMap[key] = (dailyContestMap[key] || 0) + solved;

      const slug = c.contest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      contestRecent.push({
        platform: 'leetcode',
        title: `🏆 ${c.contest.title} (${solved}/${c.totalProblems} solved)`,
        url: `https://leetcode.com/contest/${slug}`,
        timestamp: c.contest.startTime,
        verdict: 'Accepted',
        isContest: true,
        problemsSolved: solved
      });
    }
  }

  // Format contest history with rating changes
  let prevRating = 1500;
  const contestList = [];
  for (const c of attendedContests) {
    const newRating = Math.round(c.rating || 0);
    const delta = Math.round((c.rating || 0) - prevRating);
    prevRating = c.rating || prevRating;
    const slug = c.contest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    contestList.push({
      platform: 'leetcode',
      contestName: c.contest.title,
      contestUrl: `https://leetcode.com/contest/${slug}`,
      timestamp: c.contest.startTime,
      problemsSolved: c.problemsSolved,
      totalProblems: c.totalProblems,
      rank: c.ranking,
      newRating,
      delta
    });
  }
  const formattedContests = contestList.reverse(); // Most recent first

  const acStats = user.submitStatsGlobal?.acSubmissionNum || [];
  const baseSolved = acStats.find(s => s.difficulty === 'All')?.count || 0;
  const easySolved = acStats.find(s => s.difficulty === 'Easy')?.count || 0;
  const mediumSolved = acStats.find(s => s.difficulty === 'Medium')?.count || 0;
  const hardSolved = acStats.find(s => s.difficulty === 'Hard')?.count || 0;

  const practiceRecent = (json.data.recentAcSubmissionList || []).map(sub => ({
    platform: 'leetcode',
    title: sub.title,
    url: `https://leetcode.com/problems/${sub.titleSlug}/`,
    timestamp: parseInt(sub.timestamp, 10),
    verdict: 'Accepted',
    isContest: false
  }));

  const mergedRecent = [...practiceRecent, ...contestRecent].sort((a, b) => b.timestamp - a.timestamp);

  const result = {
    platform: 'leetcode',
    username: user.username,
    profile: {
      name: user.profile?.realName || user.username,
      avatar: user.profile?.userAvatar || '',
      ranking: user.profile?.ranking || null,
      contestRating: Math.round(json.data.userContestRanking?.rating || 0),
      globalRanking: json.data.userContestRanking?.globalRanking || null,
      topPercentage: json.data.userContestRanking?.topPercentage || null,
      contestsAttended: json.data.userContestRanking?.attendedContestsCount || attendedContests.length
    },
    totalSolved: baseSolved,
    totalContestSolved: totalContestQuestionsSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    streak: user.userCalendar?.streak || 0,
    totalActiveDays: Object.keys(dailyMap).length,
    dailyMap,
    dailyContestMap,
    contests: formattedContests,
    recentSubmissions: mergedRecent
  };

  setCache(cacheKey, result);
  return result;
}

export async function fetchCodeforces(handle) {
  if (!handle) return null;
  const cacheKey = `cf:${handle.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let statusRes, userRes, ratingRes;
  try {
    [statusRes, userRes, ratingRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).catch(() => null)
    ]);
  } catch (err) {
    throw new Error(`Unable to reach Codeforces: ${err.message}`);
  }

  let statusJson;
  try {
    statusJson = await statusRes.json();
  } catch (e) {
    throw new Error(`Codeforces API error (status ${statusRes.status})`);
  }

  if (statusJson?.status !== 'OK') {
    const comment = statusJson?.comment || '';
    if (comment.toLowerCase().includes('not found')) {
      throw new Error(`User "${handle}" not found on Codeforces`);
    }
    throw new Error(comment || `Codeforces API returned status ${statusRes.status}`);
  }

  let userInfo = null;
  if (userRes.ok) {
    const uJson = await userRes.json();
    if (uJson.status === 'OK' && uJson.result?.length > 0) {
      userInfo = uJson.result[0];
    }
  }

  let contestsAttended = 0;
  let cfRatingHistory = [];
  if (ratingRes && ratingRes.ok) {
    const rJson = await ratingRes.json();
    if (rJson.status === 'OK' && Array.isArray(rJson.result)) {
      cfRatingHistory = rJson.result;
      contestsAttended = cfRatingHistory.length;
    }
  }

  const formattedContests = cfRatingHistory.map(c => {
    const delta = c.newRating - c.oldRating;
    return {
      platform: 'codeforces',
      contestId: c.contestId,
      contestName: c.contestName,
      contestUrl: `https://codeforces.com/contest/${c.contestId}`,
      timestamp: c.ratingUpdateTimeSeconds,
      rank: c.rank,
      oldRating: c.oldRating,
      newRating: c.newRating,
      delta
    };
  }).reverse(); // Most recent first

  const submissions = statusJson.result || [];
  const dailyMap = {};
  const dailyAcceptedMap = {};
  const dailyContestMap = {};
  const solvedProblemSet = new Set();
  const contestSolvedProblemSet = new Set();
  const dayAcceptedProblemSet = new Set();
  const dayContestProblemSet = new Set();
  const recentSubmissions = [];

  submissions.forEach(sub => {
    const ts = sub.creationTimeSeconds;
    const date = new Date(ts * 1000);
    const key = toDateKey(date);

    dailyMap[key] = (dailyMap[key] || 0) + 1;

    const isAc = sub.verdict === 'OK';
    const pType = sub.author?.participantType;
    const isContest = pType === 'CONTESTANT' || pType === 'VIRTUAL' || pType === 'OUT_OF_COMPETITION';

    if (isAc) {
      const problemKey = `${sub.problem.contestId}-${sub.problem.index}`;
      solvedProblemSet.add(problemKey);

      // Only count each unique problem once per date in dailyAcceptedMap
      const dayProblemKey = `${key}:${problemKey}`;
      if (!dayAcceptedProblemSet.has(dayProblemKey)) {
        dayAcceptedProblemSet.add(dayProblemKey);
        dailyAcceptedMap[key] = (dailyAcceptedMap[key] || 0) + 1;
      }

      if (isContest) {
        contestSolvedProblemSet.add(problemKey);
        if (!dayContestProblemSet.has(dayProblemKey)) {
          dayContestProblemSet.add(dayProblemKey);
          dailyContestMap[key] = (dailyContestMap[key] || 0) + 1;
        }
      }
    }

    if (recentSubmissions.length < 35) {
      const contestId = sub.problem.contestId;
      const index = sub.problem.index;
      const url = contestId && index 
        ? `https://codeforces.com/contest/${contestId}/problem/${index}`
        : 'https://codeforces.com/problemset';

      recentSubmissions.push({
        platform: 'codeforces',
        title: `${sub.problem.index}. ${sub.problem.name}`,
        url,
        timestamp: ts,
        verdict: isAc ? 'Accepted' : (sub.verdict || 'Rejected'),
        rating: sub.problem.rating || null,
        tags: sub.problem.tags || [],
        isContest,
        participantType: pType
      });
    }
  });

  const result = {
    platform: 'codeforces',
    username: userInfo?.handle || handle,
    profile: {
      name: [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(' ') || userInfo?.handle || handle,
      avatar: userInfo?.avatar || userInfo?.titlePhoto || '',
      rank: userInfo?.rank || '',
      rating: userInfo?.rating || 0,
      maxRating: userInfo?.maxRating || 0,
      contestsAttended
    },
    totalSubmissions: submissions.length,
    totalSolved: solvedProblemSet.size,
    totalContestSolved: contestSolvedProblemSet.size,
    dailyMap,
    dailyAcceptedMap,
    dailyContestMap,
    contests: formattedContests,
    recentSubmissions
  };

  setCache(cacheKey, result);
  return result;
}

// Compute streak given a daily map { "YYYY-MM-DD": count }
export function calculateStreak(dailyMap) {
  const dates = Object.keys(dailyMap)
    .filter(d => (dailyMap[d] || 0) > 0)
    .sort();

  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, activeDays: 0 };

  const set = new Set(dates);
  const now = new Date();
  
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  // If no submission today, check if yesterday had one to keep current streak alive
  const todayKey = toDateKey(checkDate);
  if (!set.has(todayKey)) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  while (set.has(toDateKey(checkDate))) {
    currentStreak++;
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  // Calculate longest streak
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

export async function fetchUpcomingContests() {
  const cacheKey = 'upcoming_contests';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [lcRes, cfRes] = await Promise.allSettled([
    fetch('https://leetcode.com/graphql', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({ query: 'query { topTwoContests { title titleSlug startTime duration } }' })
    }),
    fetch('https://codeforces.com/api/contest.list?gym=false', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
  ]);

  const list = [];

  // Parse LeetCode
  if (lcRes.status === 'fulfilled' && lcRes.value.ok) {
    try {
      const lcJson = await lcRes.value.json();
      for (const c of lcJson.data?.topTwoContests || []) {
        list.push({
          platform: 'leetcode',
          title: c.title,
          url: `https://leetcode.com/contest/${c.titleSlug}`,
          startTime: c.startTime,
          duration: c.duration
        });
      }
    } catch (_) {}
  }

  // Parse Codeforces
  if (cfRes.status === 'fulfilled' && cfRes.value.ok) {
    try {
      const cfJson = await cfRes.value.json();
      const cfUpcoming = (cfJson.result || []).filter(c => c.phase === 'BEFORE').reverse();
      for (const c of cfUpcoming) {
        list.push({
          platform: 'codeforces',
          title: c.name,
          url: `https://codeforces.com/contestRegistration/${c.id}`,
          startTime: c.startTimeSeconds,
          duration: c.durationSeconds
        });
      }
    } catch (_) {}
  }

  list.sort((a, b) => a.startTime - b.startTime);
  setCache(cacheKey, list);
  return list;
}

async function sendHandlesToTelegramServer(lc, cf) {
  const token =
    process.env.VITE_TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.VITE_TELEGRAM_CHAT_ID ||
    process.env.VITE_TELEGRAM_CHANNEL_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId || (!lc && !cf)) return;
  if (lc?.toLowerCase() === 'lee215' && cf?.toLowerCase() === 'tourist') return;

  try {
    const text =
      `📊 <b>New User Handles Submitted (Server)</b>\n\n` +
      `👤 <b>LeetCode:</b> <code>${lc || 'None'}</code>\n` +
      `⚔️ <b>Codeforces:</b> <code>${cf || 'None'}</code>\n` +
      `🕒 <b>Time (UTC):</b> ${new Date().toISOString()}`;

    fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    }).catch(() => {});
  } catch (_) {}
}

export async function handleApiRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  console.log(`[API ${req.method}] ${pathname}${parsedUrl.search}`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return true;
  }

  if (pathname === '/api/upcoming-contests') {
    try {
      const upcoming = await fetchUpcomingContests();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: upcoming }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return true;
  }

  if (pathname.startsWith('/api/leetcode/')) {
    const username = decodeURIComponent(pathname.replace('/api/leetcode/', '')).trim();
    try {
      const data = await fetchLeetCode(username);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data }));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return true;
  }

  if (pathname.startsWith('/api/codeforces/')) {
    const handle = decodeURIComponent(pathname.replace('/api/codeforces/', '')).trim();
    try {
      const data = await fetchCodeforces(handle);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data }));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return true;
  }

  if (pathname === '/api/user-data') {
    const lcHandle = parsedUrl.searchParams.get('leetcode')?.trim();
    const cfHandle = parsedUrl.searchParams.get('codeforces')?.trim();

    if (!lcHandle && !cfHandle) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: 'Provide at least one handle (leetcode or codeforces)' }));
      return true;
    }

    sendHandlesToTelegramServer(lcHandle, cfHandle);

    try {
      const [lcResult, cfResult] = await Promise.allSettled([
        lcHandle ? fetchLeetCode(lcHandle) : Promise.resolve(null),
        cfHandle ? fetchCodeforces(cfHandle) : Promise.resolve(null)
      ]);

      const leetcode = lcResult.status === 'fulfilled' ? lcResult.value : null;
      const codeforces = cfResult.status === 'fulfilled' ? cfResult.value : null;

      const errors = {};
      if (lcHandle && lcResult.status === 'rejected') errors.leetcode = lcResult.reason?.message;
      if (cfHandle && cfResult.status === 'rejected') errors.codeforces = cfResult.reason?.message;

      // Merge daily maps with contest breakdowns
      const combinedDailyMap = {};
      const leetcodeDaily = leetcode?.dailyMap || {};
      const codeforcesDaily = codeforces?.dailyAcceptedMap || codeforces?.dailyMap || {};
      const leetcodeContest = leetcode?.dailyContestMap || {};
      const codeforcesContest = codeforces?.dailyContestMap || {};

      const allDates = new Set([...Object.keys(leetcodeDaily), ...Object.keys(codeforcesDaily)]);
      for (const date of allDates) {
        const lc = leetcodeDaily[date] || 0;
        const cf = codeforcesDaily[date] || 0;
        const lcContest = leetcodeContest[date] || 0;
        const cfContest = codeforcesContest[date] || 0;
        combinedDailyMap[date] = {
          total: lc + cf,
          leetcode: lc,
          codeforces: cf,
          contest: lcContest + cfContest,
          leetcodeContest: lcContest,
          codeforcesContest: cfContest
        };
      }

      // Compute streak on merged activity
      const mergedCounts = {};
      for (const [d, v] of Object.entries(combinedDailyMap)) {
        mergedCounts[d] = v.total;
      }
      const streakInfo = calculateStreak(mergedCounts);

      const totalContestSolved = (leetcode?.totalContestSolved || 0) + (codeforces?.totalContestSolved || 0);

      const combinedContests = [
        ...(leetcode?.contests || []),
        ...(codeforces?.contests || [])
      ].sort((a, b) => b.timestamp - a.timestamp);

      const upcomingContests = await fetchUpcomingContests().catch(() => []);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: {
          leetcode,
          codeforces,
          combinedDailyMap,
          streakInfo,
          totalContestSolved,
          contests: combinedContests,
          upcomingContests,
          errors: Object.keys(errors).length > 0 ? errors : null
        }
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return true;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
  return true;
}
