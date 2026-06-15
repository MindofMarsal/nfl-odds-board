import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const API_KEY = import.meta.env.VITE_ODDS_API_KEY;

const BOOKS = ['DraftKings', 'FanDuel', 'BetMGM', 'BetRivers', 'Bovada'];
const BOOK_SHORT = { DraftKings: 'DK', FanDuel: 'FD', BetMGM: 'MGM', BetRivers: 'RIV', Bovada: 'BOV' };
// The Odds API bookmaker "key" values to match against (lowercase).
const BOOK_KEYS = {
  DraftKings: ['draftkings'],
  FanDuel: ['fanduel'],
  BetMGM: ['betmgm'],
  BetRivers: ['betrivers'],
  Bovada: ['bovada'],
};

// Header colors for each sportsbook column, evoking each book's branding.
// DraftKings uses near-black (rather than green) so it doesn't get confused
// with the green "Best" highlight.
const BOOK_COLORS = {
  DraftKings: '#16181D',
  FanDuel: '#1565C0',
  BetMGM: '#A6824B',
  BetRivers: '#0E7490',
  Bovada: '#7C2D2D',
};

const SPORTS = [
  { id: 'nfl', label: 'NFL', sportKey: 'americanfootball_nfl', type: 'game' },
  { id: 'nba', label: 'NBA', sportKey: 'basketball_nba', type: 'game' },
  { id: 'mlb', label: 'MLB', sportKey: 'baseball_mlb', type: 'game' },
  { id: 'nfl_futures', label: 'NFL Futures', type: 'nfl_futures' },
  { id: 'fantasy', label: 'Fantasy ADP', type: 'fantasy' },
  { id: 'opportunities', label: 'Opportunities', type: 'opportunities' },
];

// Only the Super Bowl Winner market is available on the free plan right now.
// Additional markets (MVP, OPOY, Win Totals) can be added when The Odds API
// makes them available later in the season.
const NFL_FUTURES_MARKETS = [
  { id: 'sb_winner', label: 'Super Bowl Winner', sportKey: 'americanfootball_nfl_super_bowl_winner' },
];

// FantasyFootballCalculator's free, no-key ADP API: a single "consensus"
// source (their own mock draft pool), with a few scoring/format views.
const FANTASY_FORMATS = [
  { id: 'standard', label: 'Standard' },
  { id: 'ppr', label: 'PPR' },
  { id: '2qb', label: '2QB / Superflex' },
  { id: 'dynasty', label: 'Dynasty' },
  { id: 'rookie', label: 'Rookie' },
];
const FANTASY_TEAM_SIZES = [8, 10, 12, 14];

// Player prop markets fetched per-game, on demand, when the user clicks
// "Show player props" on a game card. Keeping this list short keeps each
// click's API credit cost low (1 credit per market per region).
const PROP_MARKETS = {
  nfl: [
    { key: 'player_pass_yds', label: 'Pass Yds' },
    { key: 'player_rush_yds', label: 'Rush Yds' },
    { key: 'player_reception_yds', label: 'Rec Yds' },
  ],
  nba: [
    { key: 'player_points', label: 'Points' },
    { key: 'player_rebounds', label: 'Rebounds' },
    { key: 'player_assists', label: 'Assists' },
  ],
  mlb: [
    { key: 'batter_hits', label: 'Hits' },
    { key: 'pitcher_strikeouts', label: 'Strikeouts' },
    { key: 'batter_home_runs', label: 'Home Runs' },
  ],
};

const MAX_PROPS_SHOWN = 8;

const MAX_GAMES = 8;

// Primary team colors, used for the small stripe next to each team name.
const TEAM_COLORS = {
  // NFL
  'Arizona Cardinals': '#97233F', 'Atlanta Falcons': '#A71930', 'Baltimore Ravens': '#241773',
  'Buffalo Bills': '#00338D', 'Carolina Panthers': '#0085CA', 'Chicago Bears': '#0B162A',
  'Cincinnati Bengals': '#FB4F14', 'Cleveland Browns': '#311D00', 'Dallas Cowboys': '#003594',
  'Denver Broncos': '#FB4F14', 'Detroit Lions': '#0076B6', 'Green Bay Packers': '#203731',
  'Houston Texans': '#03202F', 'Indianapolis Colts': '#002C5F', 'Jacksonville Jaguars': '#101820',
  'Kansas City Chiefs': '#E31837', 'Las Vegas Raiders': '#000000', 'Los Angeles Chargers': '#0080C6',
  'Los Angeles Rams': '#003594', 'Miami Dolphins': '#008E97', 'Minnesota Vikings': '#4F2683',
  'New England Patriots': '#002244', 'New Orleans Saints': '#D3BC8D', 'New York Giants': '#0B2265',
  'New York Jets': '#125740', 'Philadelphia Eagles': '#004C54', 'Pittsburgh Steelers': '#FFB612',
  'San Francisco 49ers': '#AA0000', 'Seattle Seahawks': '#69BE28', 'Tampa Bay Buccaneers': '#D50A0A',
  'Tennessee Titans': '#4B92DB', 'Washington Commanders': '#5A1414',
  // NBA
  'Atlanta Hawks': '#E03A3E', 'Boston Celtics': '#007A33', 'Brooklyn Nets': '#000000',
  'Charlotte Hornets': '#1D1160', 'Chicago Bulls': '#CE1141', 'Cleveland Cavaliers': '#6F263D',
  'Dallas Mavericks': '#00538C', 'Denver Nuggets': '#0E2240', 'Detroit Pistons': '#C8102E',
  'Golden State Warriors': '#1D428A', 'Houston Rockets': '#CE1141', 'Indiana Pacers': '#002D62',
  'LA Clippers': '#C8102E', 'Los Angeles Lakers': '#552583', 'Memphis Grizzlies': '#5D76A9',
  'Miami Heat': '#98002E', 'Milwaukee Bucks': '#00471B', 'Minnesota Timberwolves': '#0C2340',
  'New Orleans Pelicans': '#0C2340', 'New York Knicks': '#006BB6', 'Oklahoma City Thunder': '#007AC1',
  'Orlando Magic': '#0077C0', 'Philadelphia 76ers': '#006BB6', 'Phoenix Suns': '#1D1160',
  'Portland Trail Blazers': '#E03A3E', 'Sacramento Kings': '#5A2D81', 'San Antonio Spurs': '#C4CED4',
  'Toronto Raptors': '#CE1141', 'Utah Jazz': '#002B5C', 'Washington Wizards': '#002B5C',
  // MLB
  'Arizona Diamondbacks': '#A71930', 'Atlanta Braves': '#CE1141', 'Baltimore Orioles': '#DF4601',
  'Boston Red Sox': '#BD3039', 'Chicago Cubs': '#0E3386', 'Chicago White Sox': '#27251F',
  'Cincinnati Reds': '#C6011F', 'Cleveland Guardians': '#00385D', 'Colorado Rockies': '#33006F',
  'Detroit Tigers': '#0C2340', 'Houston Astros': '#002D62', 'Kansas City Royals': '#004687',
  'Los Angeles Angels': '#BA0021', 'Los Angeles Dodgers': '#005A9C', 'Miami Marlins': '#00A3E0',
  'Milwaukee Brewers': '#0A2351', 'Minnesota Twins': '#002B5C', 'New York Mets': '#002D72',
  'New York Yankees': '#0C2340', 'Athletics': '#003831', 'Oakland Athletics': '#003831',
  'Philadelphia Phillies': '#E81828', 'Pittsburgh Pirates': '#FDB827', 'San Diego Padres': '#2F241D',
  'San Francisco Giants': '#FD5A1E', 'Seattle Mariners': '#0C2C56', 'St. Louis Cardinals': '#C41E3A',
  'St Louis Cardinals': '#C41E3A', 'Tampa Bay Rays': '#092C5C', 'Texas Rangers': '#003278',
  'Toronto Blue Jays': '#134A8E', 'Washington Nationals': '#AB0003',
};

function teamColor(name) {
  return TEAM_COLORS[name] || '#5F5E5A';
}

// "Kansas City Chiefs" -> "Chiefs", "Portland Trail Blazers" -> "Blazers"
function teamShort(name) {
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

function fmtPrice(p) {
  if (p === undefined || p === null) return '—';
  return p > 0 ? `+${p}` : `${p}`;
}

function fmtLine(l) {
  if (l === 0) return 'PK';
  return l > 0 ? `+${l}` : `${l}`;
}

function formatKickoff(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function findBookmaker(bookmakers, bookName) {
  const keys = BOOK_KEYS[bookName];
  return bookmakers.find((b) => keys.includes((b.key || '').toLowerCase()));
}

// Converts one event from the API into the shape our UI components expect.
function transformGame(event) {
  const bookmakers = event.bookmakers || [];
  const result = {
    id: event.id,
    kickoff: formatKickoff(event.commence_time),
    away: { name: event.away_team, color: teamColor(event.away_team) },
    home: { name: event.home_team, color: teamColor(event.home_team) },
    spread: { away: {}, home: {} },
    total: { over: {}, under: {} },
    ml: { away: {}, home: {} },
  };

  BOOKS.forEach((bookName) => {
    const bm = findBookmaker(bookmakers, bookName);
    if (!bm) return;
    const markets = bm.markets || [];
    const h2h = markets.find((m) => m.key === 'h2h');
    const spreads = markets.find((m) => m.key === 'spreads');
    const totals = markets.find((m) => m.key === 'totals');

    if (h2h) {
      const away = h2h.outcomes.find((o) => o.name === event.away_team);
      const home = h2h.outcomes.find((o) => o.name === event.home_team);
      if (away) result.ml.away[bookName] = away.price;
      if (home) result.ml.home[bookName] = home.price;
    }
    if (spreads) {
      const away = spreads.outcomes.find((o) => o.name === event.away_team);
      const home = spreads.outcomes.find((o) => o.name === event.home_team);
      if (away) result.spread.away[bookName] = { line: away.point, price: away.price };
      if (home) result.spread.home[bookName] = { line: home.point, price: home.price };
    }
    if (totals) {
      const over = totals.outcomes.find((o) => o.name === 'Over');
      const under = totals.outcomes.find((o) => o.name === 'Under');
      if (over) result.total.over[bookName] = { line: over.point, price: over.price };
      if (under) result.total.under[bookName] = { line: under.point, price: under.price };
    }
  });

  return result;
}

// Converts the outrights event into a sorted list of { team, prices }.
function transformFutures(events) {
  const event = events && events[0];
  if (!event) return [];
  const bookmakers = event.bookmakers || [];
  const teams = {};

  BOOKS.forEach((bookName) => {
    const bm = findBookmaker(bookmakers, bookName);
    if (!bm) return;
    const market = (bm.markets || []).find((m) => m.key === 'outrights');
    if (!market) return;
    market.outcomes.forEach((o) => {
      if (!teams[o.name]) teams[o.name] = {};
      teams[o.name][bookName] = o.price;
    });
  });

  return Object.entries(teams)
    .map(([team, prices]) => ({ team, prices, color: teamColor(team) }))
    .sort((a, b) => {
      const aMin = Math.min(...Object.values(a.prices));
      const bMin = Math.min(...Object.values(b.prices));
      return aMin - bMin;
    });
}

// Converts a per-event player-props response into a list of
// { player, market, over: {book: {line, price}}, under: {...} }.
function transformPlayerProps(eventData, marketDefs) {
  const bookmakers = eventData.bookmakers || [];
  const props = {};

  BOOKS.forEach((bookName) => {
    const bm = findBookmaker(bookmakers, bookName);
    if (!bm) return;
    (bm.markets || []).forEach((market) => {
      const def = marketDefs.find((d) => d.key === market.key);
      if (!def) return;
      (market.outcomes || []).forEach((o) => {
        const player = o.description || o.name;
        const propKey = `${player}|${market.key}`;
        if (!props[propKey]) props[propKey] = { player, market: def.label, over: {}, under: {} };
        if (o.name === 'Over') props[propKey].over[bookName] = { line: o.point, price: o.price };
        else if (o.name === 'Under') props[propKey].under[bookName] = { line: o.point, price: o.price };
      });
    });
  });

  return Object.values(props).filter(
    (p) => Object.keys(p.over).length > 0 || Object.keys(p.under).length > 0
  );
}

// Lists every distinct bookmaker key/title actually present in a response —
// useful for confirming what The Odds API is sending back for this account.
function getReturnedBookmakers(data, isFutures) {
  const seen = new Map();
  const events = isFutures ? (data && data[0] ? [data[0]] : []) : data || [];
  events.forEach((event) => {
    (event.bookmakers || []).forEach((b) => {
      if (!seen.has(b.key)) seen.set(b.key, b.title);
    });
  });
  return Array.from(seen.entries());
}

// Best price = max() works for American odds regardless of sign.
// Returns null if no book has data for this row.
function bestPriceBook(row) {
  let best = null;
  BOOKS.forEach((b) => {
    if (!row[b]) return;
    if (best === null || row[b].price > row[best].price) best = b;
  });
  return best;
}

// Best line: for spreads, higher line favors the bettor on both sides.
// For totals: lower line favors the over, higher line favors the under.
function bestLineBook(row, mode) {
  let best = null;
  BOOKS.forEach((b) => {
    if (!row[b]) return;
    if (best === null) { best = b; return; }
    if (mode === 'min') { if (row[b].line < row[best].line) best = b; }
    else if (row[b].line > row[best].line) best = b;
  });
  return best;
}

function bestMLBook(row) {
  let best = null;
  BOOKS.forEach((b) => {
    if (row[b] === undefined) return;
    if (best === null || row[b] > row[best]) best = b;
  });
  return best;
}

function getGameBestBooks(game) {
  return [
    bestPriceBook(game.spread.away),
    bestPriceBook(game.spread.home),
    bestPriceBook(game.total.over),
    bestPriceBook(game.total.under),
    bestMLBook(game.ml.away),
    bestMLBook(game.ml.home),
  ].filter(Boolean);
}

function tallyBooks(bookList) {
  const tally = {};
  BOOKS.forEach((b) => (tally[b] = 0));
  bookList.forEach((b) => tally[b]++);
  return tally;
}

function EmptyCell() {
  return <div className="flex items-center justify-center py-2 px-1 text-xs no-lines">No Lines</div>;
}

function OddsCell({ price, line, isBestPrice, isBestLine }) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-2 px-1 rounded transition-colors ${
        isBestPrice ? 'odds-best' : ''
      }`}
    >
      {line !== undefined && (
        <span className={`text-xs leading-none mb-0.5 ${isBestPrice || isBestLine ? 'line-best' : 'line-muted'}`}>
          {line}
        </span>
      )}
      <span className="font-mono text-sm leading-none">{fmtPrice(price)}</span>
    </div>
  );
}

// The highlighted "Best Line" column — shows the single best price (and best
// line, where applicable) found across all books for this row.
function BestCell({ row, bestKey, withLine, linePrefix, isMoneyline }) {
  if (!bestKey) {
    return <div className="flex items-center justify-center py-2 px-1 text-xs no-lines">—</div>;
  }
  if (isMoneyline) {
    return (
      <div className="flex items-center justify-center py-2 px-1 font-mono text-sm rounded best-cell">
        {fmtPrice(row[bestKey])}
      </div>
    );
  }
  const cell = row[bestKey];
  const display = linePrefix ? `${linePrefix}${cell.line}` : fmtLine(cell.line);
  return (
    <div className="flex flex-col items-center justify-center py-2 px-1 rounded best-cell">
      {withLine && <span className="text-xs leading-none mb-0.5 best-cell-line">{display}</span>}
      <span className="font-mono text-sm leading-none">{fmtPrice(cell.price)}</span>
    </div>
  );
}

function RowGroup({ label }) {
  return (
    <div className="px-3 py-1 text-xs uppercase tracking-widest row-group-label">{label}</div>
  );
}

function Row({ sideLabel, row, bestPrice, bestLine, cols, withLine, linePrefix, stripe }) {
  return (
    <div className={`grid items-center border-row ${stripe}`} style={{ gridTemplateColumns: cols }}>
      <div className="px-3 py-1 text-sm font-mono side-label">{sideLabel}</div>
      <BestCell row={row} bestKey={bestPrice} withLine={withLine} linePrefix={linePrefix} />
      {BOOKS.map((b) => {
        const cell = row[b];
        if (!cell) return <EmptyCell key={b} />;
        const display = linePrefix ? `${linePrefix}${cell.line}` : fmtLine(cell.line);
        return (
          <OddsCell
            key={b}
            price={cell.price}
            line={withLine ? display : undefined}
            isBestPrice={b === bestPrice}
            isBestLine={b === bestLine}
          />
        );
      })}
    </div>
  );
}

function MoneylineRow({ sideLabel, row, best, cols, stripe }) {
  return (
    <div className={`grid items-center border-row ${stripe}`} style={{ gridTemplateColumns: cols }}>
      <div className="px-3 py-1 text-sm font-mono side-label">{sideLabel}</div>
      <BestCell row={row} bestKey={best} isMoneyline />
      {BOOKS.map((b) => {
        if (row[b] === undefined) return <EmptyCell key={b} />;
        return (
          <div
            key={b}
            className={`flex items-center justify-center py-2 px-1 rounded font-mono text-sm ${
              b === best ? 'odds-best' : ''
            }`}
          >
            {fmtPrice(row[b])}
          </div>
        );
      })}
    </div>
  );
}

function GameCard({ game, sportKey, propMarkets, onQuota }) {
  const cols = `90px 76px repeat(${BOOKS.length}, 1fr)`;
  let stripeIndex = 0;
  const stripe = () => (stripeIndex++ % 2 === 0 ? 'stripe-a' : 'stripe-b');

  const [open, setOpen] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const [props, setProps] = useState(null);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propsError, setPropsError] = useState(null);

  const loadProps = useCallback(async () => {
    setPropsLoading(true);
    setPropsError(null);
    try {
      const marketsParam = propMarkets.map((m) => m.key).join(',');
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${game.id}/odds?regions=us&markets=${marketsParam}&oddsFormat=american&apiKey=${API_KEY}`;
      const res = await fetch(url);
      const remaining = res.headers.get('x-requests-remaining');
      if (remaining !== null && onQuota) onQuota(remaining);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Props error (${res.status}): ${text.slice(0, 150)}`);
      }
      const json = await res.json();
      setProps(transformPlayerProps(json, propMarkets));
    } catch (e) {
      setPropsError(e.message);
    } finally {
      setPropsLoading(false);
    }
  }, [propMarkets, sportKey, game.id, onQuota]);

  const handleTogglePropsClick = () => {
    const next = !showProps;
    setShowProps(next);
    if (next && props === null && !propsLoading) loadProps();
  };

  const spreadAwayBest = bestPriceBook(game.spread.away);
  const spreadAwayLineBest = bestLineBook(game.spread.away, 'max');
  const spreadHomeBest = bestPriceBook(game.spread.home);
  const spreadHomeLineBest = bestLineBook(game.spread.home, 'max');

  const totalOverBest = bestPriceBook(game.total.over);
  const totalOverLineBest = bestLineBook(game.total.over, 'min');
  const totalUnderBest = bestPriceBook(game.total.under);
  const totalUnderLineBest = bestLineBook(game.total.under, 'max');

  const mlAwayBest = bestMLBook(game.ml.away);
  const mlHomeBest = bestMLBook(game.ml.home);

  const tally = tallyBooks(getGameBestBooks(game));
  const topEntry = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  const topBook = topEntry[1] > 0 ? topEntry[0] : null;

  return (
    <div className="board-card rounded-lg overflow-hidden mb-3">
      <button
        className="accordion-header w-full flex items-center justify-between px-4 py-3 board-card-header"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="team-stripe" style={{ background: game.away.color }} />
            <span className="font-display text-base tracking-wide uppercase">{game.away.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs kickoff-text">
            <span className="font-display tracking-widest">@</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="team-stripe" style={{ background: game.home.color }} />
            <span className="font-display text-base tracking-wide uppercase">{game.home.name}</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="text-xs kickoff-text font-mono tracking-wide">{game.kickoff}</div>
          {topBook && (
            <div className="text-xs best-book-badge">
              Best: <span className="font-mono">{topBook}</span>
            </div>
          )}
          <span className="accordion-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <div style={{ minWidth: '600px' }}>
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="px-3 py-2 text-xs label-text">Market</div>
            <div className="px-1 py-2 text-center text-xs font-display tracking-wide uppercase best-line-header">
              Best
            </div>
            {BOOKS.map((b) => (
              <div
                key={b}
                className="px-1 py-2 text-center text-xs font-mono book-header"
                style={{ background: BOOK_COLORS[b], color: '#fff' }}
              >
                {BOOK_SHORT[b]}
              </div>
            ))}
          </div>

          <RowGroup label="Spread" />
          <Row
            sideLabel={teamShort(game.away.name)}
            row={game.spread.away}
            bestPrice={spreadAwayBest}
            bestLine={spreadAwayLineBest}
            cols={cols}
            withLine
            stripe={stripe()}
          />
          <Row
            sideLabel={teamShort(game.home.name)}
            row={game.spread.home}
            bestPrice={spreadHomeBest}
            bestLine={spreadHomeLineBest}
            cols={cols}
            withLine
            stripe={stripe()}
          />

          <RowGroup label="Total" />
          <Row
            sideLabel="Over"
            row={game.total.over}
            bestPrice={totalOverBest}
            bestLine={totalOverLineBest}
            cols={cols}
            withLine
            linePrefix="o"
            stripe={stripe()}
          />
          <Row
            sideLabel="Under"
            row={game.total.under}
            bestPrice={totalUnderBest}
            bestLine={totalUnderLineBest}
            cols={cols}
            withLine
            linePrefix="u"
            stripe={stripe()}
          />

          <RowGroup label="Moneyline" />
          <MoneylineRow sideLabel={teamShort(game.away.name)} row={game.ml.away} best={mlAwayBest} cols={cols} stripe={stripe()} />
          <MoneylineRow sideLabel={teamShort(game.home.name)} row={game.ml.home} best={mlHomeBest} cols={cols} stripe={stripe()} />

          {propMarkets && (
            <div className="border-row">
              <button className="props-toggle-btn" onClick={handleTogglePropsClick}>
                {showProps ? 'Hide player props' : 'Show player props'}
                {propsLoading ? ' (loading…)' : ''}
              </button>

              {showProps && propsError && (
                <div className="error-box" style={{ margin: '0.5rem 0.75rem' }}>{propsError}</div>
              )}

              {showProps && props && props.length === 0 && (
                <div className="px-3 py-2 text-xs kickoff-text">No player props available for this game yet.</div>
              )}

              {showProps && props && props.length > 0 && (
                <>
                  <RowGroup label="Player Props" />
                  {props.slice(0, MAX_PROPS_SHOWN).map((p) => (
                    <React.Fragment key={`${p.player}-${p.market}`}>
                      <div className="px-3 py-1 text-xs prop-label border-row">
                        <span className="font-display">{p.player}</span>{' '}
                        <span className="kickoff-text">&middot; {p.market}</span>
                      </div>
                      <Row
                        sideLabel="Over"
                        row={p.over}
                        bestPrice={bestPriceBook(p.over)}
                        bestLine={bestLineBook(p.over, 'min')}
                        cols={cols}
                        withLine
                        linePrefix="o"
                        stripe={stripe()}
                      />
                      <Row
                        sideLabel="Under"
                        row={p.under}
                        bestPrice={bestPriceBook(p.under)}
                        bestLine={bestLineBook(p.under, 'max')}
                        cols={cols}
                        withLine
                        linePrefix="u"
                        stripe={stripe()}
                      />
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ games }) {
  const tally = {};
  BOOKS.forEach((b) => (tally[b] = 0));
  let total = 0;

  games.forEach((g) => {
    getGameBestBooks(g).forEach((b) => {
      tally[b]++;
      total++;
    });
  });

  const ranked = BOOKS.map((b) => ({ book: b, count: tally[b] })).sort((a, b) => b.count - a.count);
  const max = ranked[0].count || 1;

  return (
    <div className="board-card rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h2 className="font-display text-sm tracking-widest uppercase label-text">
          Best Book Overall
        </h2>
        <span className="text-xs kickoff-text">
          {total} markets across {games.length} games &mdash; spreads, totals &amp; moneylines
        </span>
      </div>
      <div className="space-y-2">
        {ranked.map((r, i) => (
          <div key={r.book} className="flex items-center gap-3">
            <div className="w-24 font-mono text-sm side-label">
              {i === 0 && r.count > 0 && <span style={{ color: 'var(--amber-text)' }}>&#9733; </span>}
              {r.book}
            </div>
            <div className="flex-1 leaderboard-track rounded">
              <div
                className={`leaderboard-bar rounded ${i === 0 && r.count > 0 ? 'leaderboard-bar-top' : ''}`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <div className="w-20 text-right font-mono text-xs kickoff-text">
              {r.count} / {total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// A single futures market accordion card — fetches its own data on open.
function FuturesCard({ market }) {
  const cols = `1fr 76px repeat(${BOOKS.length}, 1fr)`;
  let stripeIndex = 0;
  const stripe = () => (stripeIndex++ % 2 === 0 ? 'stripe-a' : 'stripe-b');

  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${market.sportKey}/odds?regions=us&markets=outrights&oddsFormat=american&apiKey=${API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text.slice(0, 150)}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [market.sportKey]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data === null && !loading) fetchData();
  };

  // Parse outrights response into { team/player, prices } list.
  const teams = React.useMemo(() => {
    if (!data) return [];
    const event = data[0];
    if (!event) return [];
    const bookmakers = event.bookmakers || [];
    const entries = {};
    BOOKS.forEach((bookName) => {
      const bm = findBookmaker(bookmakers, bookName);
      if (!bm) return;
      const mkt = (bm.markets || []).find((m) => m.key === 'outrights');
      if (!mkt) return;
      mkt.outcomes.forEach((o) => {
        if (!entries[o.name]) entries[o.name] = {};
        entries[o.name][bookName] = o.price;
      });
    });
    return Object.entries(entries)
      .map(([name, prices]) => ({ name, prices, color: teamColor(name) }))
      .sort((a, b) => Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices)));
  }, [data]);

  return (
    <div className="board-card rounded-lg overflow-hidden mb-3">
      <button
        className="accordion-header w-full flex items-center justify-between px-4 py-3 board-card-header"
        onClick={handleToggle}
      >
        <span className="font-display text-base tracking-wide uppercase">
          {market.label}
          {loading && <span className="font-mono text-xs kickoff-text ml-2">(loading…)</span>}
        </span>
        <span className="accordion-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          {error && <div className="error-box" style={{ margin: '0.75rem' }}>{error}</div>}

          {!error && teams.length === 0 && !loading && (
            <div className="px-4 py-3 text-sm kickoff-text">
              No odds available for this market right now — the sport key may not be active yet this season.
            </div>
          )}

          {!error && teams.length > 0 && (
            <div className="overflow-x-auto">
              <div style={{ minWidth: '600px' }}>
                <div className="grid" style={{ gridTemplateColumns: cols }}>
                  <div className="px-3 py-2 text-xs label-text">
                    {market.isWinTotal ? 'Team' : 'Candidate'}
                  </div>
                  <div className="px-1 py-2 text-center text-xs font-display tracking-wide uppercase best-line-header">
                    Best
                  </div>
                  {BOOKS.map((b) => (
                    <div
                      key={b}
                      className="px-1 py-2 text-center text-xs font-mono book-header"
                      style={{ background: BOOK_COLORS[b], color: '#fff' }}
                    >
                      {BOOK_SHORT[b]}
                    </div>
                  ))}
                </div>
                {teams.map((t, i) => {
                  const best = bestMLBook(t.prices);
                  return (
                    <div
                      key={t.name}
                      className={`grid items-center border-row ${i % 2 === 0 ? 'stripe-a' : 'stripe-b'}`}
                      style={{ gridTemplateColumns: cols }}
                    >
                      <div className="px-3 py-2 text-sm side-label flex items-center gap-2">
                        <span className="team-stripe" style={{ background: t.color }} />
                        {t.name}
                      </div>
                      <BestCell row={t.prices} bestKey={best} isMoneyline />
                      {BOOKS.map((b) => {
                        if (t.prices[b] === undefined) return <EmptyCell key={b} />;
                        return (
                          <div
                            key={b}
                            className={`flex items-center justify-center py-2 px-1 rounded font-mono text-sm ${
                              b === best ? 'odds-best' : ''
                            }`}
                          >
                            {fmtPrice(t.prices[b])}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NflFuturesTab() {
  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        Click the market below to expand and see live Super Bowl winner odds across all five books. Additional futures markets (MVP, Win Totals, etc.) will be added as they become available closer to the season.
      </p>
      {NFL_FUTURES_MARKETS.map((market) => (
        <FuturesCard key={market.id} market={market} />
      ))}
    </div>
  );
}

function FantasyAdpTab() {
  const [format, setFormat] = useState('standard');
  const [teamSize, setTeamSize] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const fetchAdp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = new Date().getFullYear();
      const url = `/api/adp?format=${format}&teams=${teamSize}&year=${year}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text.slice(0, 150)}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [format, teamSize]);

  useEffect(() => {
    fetchAdp();
  }, [fetchAdp]);

  const players = data?.players || [];
  const cols = '48px 1fr 56px 60px 70px 90px';

  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        Consensus Average Draft Position from FantasyFootballCalculator&apos;s mock draft pool —
        a single community-sourced ranking (not yet broken out by individual platform).
      </p>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <div className="flex gap-2 flex-wrap items-center">
          <select className="select-control" value={format} onChange={(e) => setFormat(e.target.value)}>
            {FANTASY_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <select className="select-control" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))}>
            {FANTASY_TEAM_SIZES.map((t) => (
              <option key={t} value={t}>{t}-team</option>
            ))}
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchAdp} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && loading && !data && (
        <div className="text-sm kickoff-text mb-6">Fetching ADP data…</div>
      )}

      {!error && data && players.length === 0 && (
        <div className="text-sm kickoff-text mb-6">No ADP data returned for this format/team size.</div>
      )}

      {!error && players.length > 0 && (
        <div className="board-card rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-3 board-card-header">
            <span className="font-display text-base tracking-wide uppercase">
              {FANTASY_FORMATS.find((f) => f.id === format)?.label} ADP &mdash; {teamSize}-Team
            </span>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: '480px' }}>
              <div className="grid" style={{ gridTemplateColumns: cols }}>
                <div className="px-3 py-2 text-xs label-text">#</div>
                <div className="px-3 py-2 text-xs label-text">Player</div>
                <div className="px-1 py-2 text-center text-xs label-text">Pos</div>
                <div className="px-1 py-2 text-center text-xs label-text">Team</div>
                <div className="px-1 py-2 text-center text-xs label-text">ADP</div>
                <div className="px-1 py-2 text-center text-xs label-text">Range</div>
              </div>
              {players.map((p, i) => (
                <div
                  key={p.player_id ?? i}
                  className={`grid items-center border-row ${i % 2 === 0 ? 'stripe-a' : 'stripe-b'}`}
                  style={{ gridTemplateColumns: cols }}
                >
                  <div className="px-3 py-2 text-sm font-mono side-label">{i + 1}</div>
                  <div className="px-3 py-2 text-sm side-label">{p.name ?? '—'}</div>
                  <div className="px-1 py-2 text-center text-sm font-mono kickoff-text">{p.position ?? '—'}</div>
                  <div className="px-1 py-2 text-center text-sm font-mono kickoff-text">{p.team ?? '—'}</div>
                  <div className="px-1 py-2 text-center text-sm font-mono side-label">
                    {p.adp_formatted ?? p.adp ?? '—'}
                  </div>
                  <div className="px-1 py-2 text-center text-xs font-mono kickoff-text">
                    {p.high !== undefined && p.low !== undefined ? `${p.high}–${p.low}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="text-center mt-3">
          <button className="refresh-btn" onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? 'Hide' : 'Show'} raw API response (debug)
          </button>
          {showDebug && (
            <div className="board-card rounded-lg p-3 mt-2 text-left text-xs font-mono kickoff-text" style={{ maxHeight: '300px', overflow: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(data, null, 2).slice(0, 4000)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoginPrompt({ onSignIn }) {
  return (
    <div className="board-card rounded-lg p-6 text-center mb-5">
      <div className="font-display text-lg tracking-wide uppercase mb-2">Sign In Required</div>
      <p className="text-sm kickoff-text mb-4">This section is available to logged-in users only.</p>
      <button className="auth-submit" style={{ width: 'auto', padding: '0.5rem 2rem' }} onClick={onSignIn}>
        Sign In
      </button>
    </div>
  );
}

function FantasyPointsPlaceholder({ title }) {
  return (
    <div className="board-card rounded-lg p-6 text-center mb-5">
      <div className="font-display text-lg tracking-wide uppercase mb-2">{title}</div>
      <p className="text-sm kickoff-text">Coming soon — data upload in progress.</p>
    </div>
  );
}

function OpportunitiesTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [season, setSeason] = useState(2025);
  const [pos, setPos] = useState('ALL');
  const [sortBy, setSortBy] = useState('opps');
  const [sortDir, setSortDir] = useState('desc');

  const seasons = Array.from({ length: 2025 - 2013 + 1 }, (_, i) => 2025 - i);
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('season', season)
        .order(sortBy, { ascending: sortDir === 'asc' });

      if (pos !== 'ALL') query = query.eq('pos', pos);

      const { data, error } = await query;
      if (error) throw error;
      setData(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [season, pos, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const cols = [
    { key: 'player', label: 'Player' },
    { key: 'team', label: 'Team' },
    { key: 'pos', label: 'Pos' },
    { key: 'gms', label: 'GMs' },
    { key: 'snaps', label: 'Snaps' },
    { key: 'snap_pct', label: 'Snap%', pct: true },
    { key: 'tgt', label: 'Tgt' },
    { key: 'tgt_shr', label: 'Tgt Shr%', pct: true },
    { key: 'att', label: 'Att' },
    { key: 'pct_tm_att', label: '% Tm Att', pct: true },
    { key: 'opps', label: 'Opps' },
    { key: 'pct_tm_opps', label: '% Tm Opps', pct: true },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <select className="select-control" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
          {seasons.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select-control" value={pos} onChange={(e) => setPos(e.target.value)}>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && (
        <div className="board-card rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-3 board-card-header flex items-center justify-between">
            <span className="font-display text-base tracking-wide uppercase">
              {season} Player Opportunities {pos !== 'ALL' ? `— ${pos}` : ''}
            </span>
            <span className="text-xs kickoff-text">{data.length} players</span>
          </div>
          <div className="overflow-x-auto">
            <table className="opp-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} onClick={() => handleSort(c.key)} className="opp-th">
                      {c.label}{sortBy === c.key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={cols.length} className="opp-td text-center kickoff-text">Loading…</td></tr>
                ) : data.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'stripe-a' : 'stripe-b'}>
                    {cols.map((c) => (
                      <td key={c.key} className="opp-td">
                        {c.pct && row[c.key] != null ? `${row[c.key]}%` : row[c.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        setMessage('Account created! Check your email to confirm your address, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth();
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg tracking-widest uppercase">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button className="auth-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-box mb-3">{error}</div>}
        {message && <div className="success-box mb-3">{message}</div>}

        {mode === 'signup' && (
          <div className="mb-3">
            <label className="auth-label">Username</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        <div className="mb-3">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <button
          className="auth-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <p className="text-center text-xs kickoff-text mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="auth-switch"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null); }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [activeId, setActiveId] = useState('adp');
  const [openNav, setOpenNav] = useState(null);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quota, setQuota] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Listen for Supabase auth state changes (login, logout, session restore).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseReady(true);
    }).catch(() => setSupabaseReady(true));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || null;


  const activeSport = SPORTS.find((s) => s.id === activeId) || SPORTS[0];

  const fetchSport = useCallback(async (sport) => {
    if (!API_KEY) {
      setError('Missing API key. Add VITE_ODDS_API_KEY to your .env file and restart the dev server.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const market = 'h2h,spreads,totals';
      const url = `https://api.the-odds-api.com/v4/sports/${sport.sportKey}/odds?regions=us&markets=${market}&oddsFormat=american&apiKey=${API_KEY}`;
      const res = await fetch(url);
      const remaining = res.headers.get('x-requests-remaining');
      if (remaining !== null) setQuota(remaining);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text.slice(0, 200)}`);
      }
      const json = await res.json();
      setCache((prev) => ({ ...prev, [sport.id]: { data: json, fetchedAt: Date.now() } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cache[activeId] && ['nfl','nba','mlb'].includes(activeId)) fetchSport(activeSport);
  }, [activeId, cache, activeSport, fetchSport]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const entry = cache[activeId];
  const ageSeconds = entry ? Math.floor((Date.now() - entry.fetchedAt) / 1000) : null;
  const mm = ageSeconds !== null ? String(Math.floor(ageSeconds / 60)).padStart(2, '0') : '--';
  const ss = ageSeconds !== null ? String(ageSeconds % 60).padStart(2, '0') : '--';

  let games = [];
  if (entry && ['nfl','nba','mlb'].includes(activeId)) {
    games = (entry.data || [])
      .slice()
      .sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time))
      .slice(0, MAX_GAMES)
      .map(transformGame);
  }

  return (
    <div className="board-root min-h-screen px-4 py-6 sm:px-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

        .board-root {
          --board-bg: #F1F3F5;
          --card-bg: #FFFFFF;
          --card-header-bg: #FAFBFC;
          --card-border: #E2E5E9;
          --row-border: #ECEEF1;
          --row-alt: #F6F7F9;
          --text-primary: #1F2937;
          --text-muted: #6B7280;
          --amber: #16A34A;
          --amber-soft: rgba(22, 163, 74, 0.12);
          --amber-text: #15803D;
          background: var(--board-bg);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        .board-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
        }
        .board-card-header { background: var(--card-header-bg); border-bottom: 1px solid var(--card-border); }
        .team-stripe { display: inline-block; width: 4px; height: 16px; border-radius: 1px; flex-shrink: 0; }
        .kickoff-text { color: var(--text-muted); }
        .label-text { color: var(--text-muted); }
        .book-header { letter-spacing: 0.05em; font-weight: 600; }
        .row-group-label { color: var(--text-muted); background: rgba(15, 23, 42, 0.03); letter-spacing: 0.15em; }
        .border-row { border-top: 1px solid var(--row-border); }
        .side-label { color: var(--text-primary); }
        .line-muted { color: var(--text-muted); }
        .line-best { color: var(--amber-text); }
        .no-lines { color: var(--text-muted); opacity: 0.55; }
        .stripe-a { background: var(--card-bg); }
        .stripe-b { background: var(--row-alt); }

        .best-line-header { background: var(--amber); color: #fff; margin-right: 6px; }
        .best-cell { background: var(--amber); color: #fff; margin-right: 6px; }
        .best-cell-line { color: rgba(255, 255, 255, 0.8); }
        .odds-best {
          background: var(--amber-soft);
          color: var(--amber-text);
          box-shadow: inset 3px 0 0 var(--amber);
        }
        .best-book-badge { color: var(--amber-text); }
        .accordion-header {
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .accordion-header:hover { filter: brightness(0.97); }
        .accordion-chevron {
          font-size: 0.6rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .prop-label { color: var(--text-primary); background: rgba(15, 23, 42, 0.02); }
        .props-toggle-btn {
          width: 100%;
          text-align: left;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .props-toggle-btn:hover { color: var(--amber-text); }

        .leaderboard-track { height: 10px; background: var(--row-border); overflow: hidden; }
        .leaderboard-bar { height: 100%; background: var(--text-muted); opacity: 0.4; }
        .leaderboard-bar-top { background: var(--amber); opacity: 1; }

        .live-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: var(--amber);
          box-shadow: 0 0 6px rgba(22, 163, 74, 0.5);
          animation: pulse 1.6s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .tab-btn {
          font-family: 'Oswald', sans-serif;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-size: 0.8rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-muted);
          cursor: pointer;
        }
        .tab-btn.active {
          color: var(--amber-text);
          border-color: rgba(22, 163, 74, 0.4);
          background: var(--amber-soft);
        }
        .refresh-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.75rem;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-muted);
          cursor: pointer;
        }
        .refresh-btn:hover { color: var(--amber-text); border-color: rgba(22, 163, 74, 0.4); }
        .select-control {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.75rem;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-primary);
          cursor: pointer;
        }
        .error-box {
          border: 1px solid rgba(220, 38, 38, 0.3);
          background: rgba(220, 38, 38, 0.06);
          color: #B91C1C;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }
        .success-box {
          border: 1px solid rgba(22, 163, 74, 0.3);
          background: rgba(22, 163, 74, 0.06);
          color: #15803D;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
        }
        .auth-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 100;
        }
        .auth-modal {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 1.5rem;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        .auth-close {
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          font-size: 1rem; padding: 0.25rem;
        }
        .auth-close:hover { color: var(--text-primary); }
        .auth-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.35rem;
          font-family: 'Inter', sans-serif;
        }
        .auth-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--card-border);
          border-radius: 6px;
          background: var(--board-bg);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
        }
        .auth-input:focus {
          outline: none;
          border-color: rgba(22, 163, 74, 0.5);
        }
        .auth-submit {
          width: 100%;
          padding: 0.6rem 1rem;
          background: var(--amber);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-family: 'Oswald', sans-serif;
          font-size: 0.9rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .auth-submit:hover { opacity: 0.9; }
        .auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-switch {
          background: none; border: none;
          color: var(--amber-text);
          cursor: pointer; font-size: 0.75rem;
          text-decoration: underline; padding: 0;
        }
        .auth-header-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.75rem;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
        }
        .auth-header-btn:hover { color: var(--amber-text); border-color: rgba(22, 163, 74, 0.4); }

        .nav-group { position: relative; }
        .nav-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          z-index: 50;
          min-width: 180px;
          overflow: hidden;
        }
        .nav-dropdown-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.6rem 1rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          border-bottom: 1px solid var(--row-border);
        }
        .nav-dropdown-item:last-child { border-bottom: none; }
        .nav-dropdown-item:hover { background: var(--amber-soft); color: var(--amber-text); }
        .nav-dropdown-item.active { color: var(--amber-text); font-weight: 600; }

        .opp-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .opp-th {
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem;
          color: var(--text-muted);
          background: var(--card-header-bg);
          border-bottom: 1px solid var(--card-border);
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
        }
        .opp-th:hover { color: var(--amber-text); }
        .opp-td {
          padding: 0.45rem 0.75rem;
          font-family: 'IBM Plex Mono', monospace;
          color: var(--text-primary);
          white-space: nowrap;
          border-bottom: 1px solid var(--row-border);
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuth={() => setShowAuth(false)}
          />
        )}

        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h1 className="font-display text-2xl tracking-widest uppercase">Fantasy Bets</h1>
          <div className="flex items-center gap-3">
            {['nfl','nba','mlb'].includes(activeId) && (
              <div className="flex items-center gap-2 font-mono text-xs kickoff-text">
                <span className="live-dot" />
                {entry ? `updated ${mm}:${ss} ago` : loading ? 'loading…' : 'no data yet'}
              </div>
            )}
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs kickoff-text font-mono">👤 {username}</span>
                <button className="auth-header-btn" onClick={handleSignOut}>Sign out</button>
              </div>
            ) : (
              <button className="auth-header-btn" onClick={() => setShowAuth(true)}>
                Sign in
              </button>
            )}
          </div>
        </div>

        {['nfl','nba','mlb'].includes(activeId) && (
          <p className="text-sm kickoff-text mb-4">
            Live odds from DraftKings, FanDuel, BetMGM, BetRivers &amp; Bovada via The Odds API.
            The <span style={{ color: 'var(--amber-text)' }}>green &quot;Best&quot;</span> column and
            highlighted cells show the top price across all five books for each line. Kickoff times
            shown in your local time.
          </p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
          <div className="flex gap-2 flex-wrap">
            {/* Fantasy dropdown */}
            <div className="nav-group">
              <button
                className={`tab-btn ${['fantasy_points','fantasy_ppg','opportunities','red_zone','adp'].includes(activeId) ? 'active' : ''}`}
                onClick={() => setOpenNav(openNav === 'fantasy' ? null : 'fantasy')}
              >
                Fantasy {openNav === 'fantasy' ? '▲' : '▼'}
              </button>
              {openNav === 'fantasy' && (
                <div className="nav-dropdown">
                  {[
                    { id: 'fantasy_points', label: 'Fantasy Points' },
                    { id: 'fantasy_ppg', label: 'Fantasy Points Per Game' },
                    { id: 'opportunities', label: 'Player Opportunities' },
                    { id: 'red_zone', label: 'Red Zone Usage' },
                    { id: 'adp', label: 'Average Draft Position (ADP)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      className={`nav-dropdown-item ${activeId === item.id ? 'active' : ''}`}
                      onClick={() => { setActiveId(item.id); setOpenNav(null); }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bet dropdown */}
            <div className="nav-group">
              <button
                className={`tab-btn ${['nfl','nba','mlb','nfl_futures'].includes(activeId) ? 'active' : ''}`}
                onClick={() => setOpenNav(openNav === 'bet' ? null : 'bet')}
              >
                Betting {openNav === 'bet' ? '▲' : '▼'}
              </button>
              {openNav === 'bet' && (
                <div className="nav-dropdown">
                  {[
                    { id: 'nfl', label: 'NFL' },
                    { id: 'nba', label: 'NBA' },
                    { id: 'mlb', label: 'MLB' },
                    { id: 'nfl_futures', label: 'NFL Futures' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      className={`nav-dropdown-item ${activeId === item.id ? 'active' : ''}`}
                      onClick={() => { setActiveId(item.id); setOpenNav(null); }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {activeId && ['nfl','nba','mlb'].includes(activeId) && (
            <button className="refresh-btn" onClick={() => fetchSport(activeSport)} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>

        {activeId === 'adp' && <FantasyAdpTab />}
        {activeId === 'opportunities' && (session ? <OpportunitiesTab /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'fantasy_points' && (session ? <FantasyPointsPlaceholder title="Fantasy Points" /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'fantasy_ppg' && (session ? <FantasyPointsPlaceholder title="Fantasy Points Per Game" /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'red_zone' && (session ? <FantasyPointsPlaceholder title="Red Zone Usage" /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}

        {error && <div className="error-box">{error}</div>}

        {!error && loading && !entry && ['nfl','nba','mlb'].includes(activeId) && (
          <div className="text-sm kickoff-text mb-6">Fetching {activeSport?.label} odds…</div>
        )}

        {!error && entry && ['nfl','nba','mlb'].includes(activeId) && games.length === 0 && (
          <div className="text-sm kickoff-text mb-6">No upcoming {activeSport?.label} games found right now.</div>
        )}

        {!error && entry && ['nfl','nba','mlb'].includes(activeId) && games.length > 0 && (
          <>
            <Leaderboard games={games} />
            {games.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                sportKey={activeSport.sportKey}
                propMarkets={PROP_MARKETS[activeSport.id]}
                onQuota={setQuota}
              />
            ))}
          </>
        )}

        {activeId === 'nfl_futures' && <NflFuturesTab />}

        {quota !== null && ['nfl','nba','mlb'].includes(activeId) && (
          <p className="text-xs kickoff-text mt-4 text-center">
            The Odds API credits remaining this month: {quota}
          </p>
        )}

        {entry && ['nfl','nba','mlb'].includes(activeId) && (
          <div className="text-center mt-3">
            <button className="refresh-btn" onClick={() => setShowDebug((v) => !v)}>
              {showDebug ? 'Hide' : 'Show'} raw bookmaker list (debug)
            </button>
            {showDebug && (
              <div className="board-card rounded-lg p-3 mt-2 text-left text-xs font-mono kickoff-text">
                {getReturnedBookmakers(entry.data, false).length === 0 ? (
                  <div>No bookmakers returned for this sport right now.</div>
                ) : (
                  getReturnedBookmakers(entry.data, false).map(([key, title]) => (
                    <div key={key}>
                      {title} <span className="line-muted">({key})</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
