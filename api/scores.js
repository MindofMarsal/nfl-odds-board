// Vercel serverless function — proxies ESPN's free scoreboard API
// to avoid CORS issues in the browser.
//
// Usage: /api/scores?sport=nfl  (or nba, mlb)

const SPORT_URLS = {
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  ncaaf: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  wnba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
};

export default async function handler(req, res) {
  const { sport = 'nfl' } = req.query;
  const url = SPORT_URLS[sport];

  if (!url) {
    res.status(400).json({ error: `Unknown sport: ${sport}` });
    return;
  }

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
