// Vercel serverless function — proxies ESPN's free scoreboard and summary
// APIs to avoid CORS issues in the browser.
//
// Usage:
//   /api/scores?sport=nfl                    -> scoreboard (today's games)
//   /api/scores?sport=nfl&eventId=401584793  -> box score / game summary

const SPORT_PATHS = {
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
  ncaaf: 'football/college-football',
  wnba: 'basketball/wnba',
};

export default async function handler(req, res) {
  const { sport = 'nfl', eventId } = req.query;
  const path = SPORT_PATHS[sport];

  if (!path) {
    res.status(400).json({ error: `Unknown sport: ${sport}` });
    return;
  }

  const url = eventId
    ? `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${eventId}`
    : `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).json({ error: `ESPN API error (${response.status})` });
      return;
    }
    const data = await response.json();

    // Cache for 60 seconds — scores update frequently during games
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

