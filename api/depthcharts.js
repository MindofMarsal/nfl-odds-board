// Vercel serverless function — proxies ESPN's free depth chart API and
// resolves player ID references into actual names in a single response.
//
// Usage: /api/depthcharts?team=6&year=2026   (team = ESPN team ID, 1-32)

export default async function handler(req, res) {
  const { team, year = new Date().getFullYear() } = req.query;

  if (!team) {
    res.status(400).json({ error: 'Missing required "team" parameter (ESPN team ID, 1-32)' });
    return;
  }

  try {
    const chartUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${year}/teams/${team}/depthcharts`;
    const chartRes = await fetch(chartUrl);
    if (!chartRes.ok) {
      res.status(chartRes.status).json({ error: `ESPN depth chart API error (${chartRes.status})` });
      return;
    }
    const chartData = await chartRes.json();

    // Collect every unique athlete $ref URL across all formations/positions.
    const athleteRefs = new Set();
    for (const formation of chartData.items || []) {
      for (const posKey of Object.keys(formation.positions || {})) {
        const pos = formation.positions[posKey];
        for (const entry of pos.athletes || []) {
          if (entry.athlete?.$ref) athleteRefs.add(entry.athlete.$ref);
        }
      }
    }

    // Resolve all athlete names in parallel. Cache by ref so we only fetch once each.
    const refList = Array.from(athleteRefs);
    const nameMap = {};
    const BATCH_SIZE = 20; // be polite to ESPN's servers, batch the lookups
    for (let i = 0; i < refList.length; i += BATCH_SIZE) {
      const batch = refList.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (ref) => {
          try {
            const r = await fetch(ref.replace('http://', 'https://'));
            if (!r.ok) return null;
            const data = await r.json();
            return { ref, name: data.displayName || data.fullName || data.shortName || 'Unknown' };
          } catch {
            return null;
          }
        })
      );
      for (const item of results) {
        if (item) nameMap[item.ref] = item.name;
      }
    }

    // Rebuild a clean, simplified structure: formation -> position -> ranked players with names.
    const formations = (chartData.items || []).map((formation) => {
      const positions = Object.entries(formation.positions || {}).map(([key, pos]) => {
        const players = (pos.athletes || [])
          .map((entry) => ({
            rank: entry.rank,
            name: entry.athlete?.$ref ? (nameMap[entry.athlete.$ref] || 'Unknown') : 'Unknown',
          }))
          .sort((a, b) => a.rank - b.rank);
        return {
          abbreviation: pos.position?.abbreviation || key.toUpperCase(),
          name: pos.position?.displayName || key,
          players,
        };
      });
      return { id: formation.id, name: formation.name, positions };
    });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ team, year, formations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
