// Vercel serverless function — runs on Vercel's servers, not in the browser.
// This avoids the CORS restriction on FantasyFootballCalculator's API by
// fetching the data server-to-server and handing it back to our app.
//
// Example: /api/adp?format=standard&teams=12&year=2026

export default async function handler(req, res) {
  const { format = 'standard', teams = '12', year } = req.query;
  const y = year || new Date().getFullYear();

  try {
    const url = `https://fantasyfootballcalculator.com/api/v1/adp/${format}?teams=${teams}&year=${y}`;
    const response = await fetch(url);

    if (!response.ok) {
      res.status(response.status).json({ error: `FFC API error (${response.status})` });
      return;
    }

    const data = await response.json();

    // Cache for an hour at the edge — ADP data doesn't change minute-to-minute.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
