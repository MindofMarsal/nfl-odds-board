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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [season, setSeason] = useState(2026);
  const [pos, setPos] = useState('ALL');
  const [sortBy, setSortBy] = useState('overall');
  const [sortDir, setSortDir] = useState('asc');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'];

  const fetchAdp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('adp')
        .select('*')
        .eq('season', season)
        .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });
      if (pos !== 'ALL') {
        query = query.ilike('pos', `${pos}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setData(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [season, pos, sortBy, sortDir]);

  useEffect(() => { fetchAdp(); }, [fetchAdp]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const PLATFORM_COLS = [
    { key: 'cbs', label: 'CBS' },
    { key: 'espn', label: 'ESPN' },
    { key: 'yahoo', label: 'Yahoo' },
    { key: 'nffc', label: 'NFFC' },
    { key: 'mfl', label: 'MFL' },
    { key: 'draftkings', label: 'DraftKings' },
    { key: 'drafters', label: 'Drafters' },
    { key: 'underdog', label: 'Underdog' },
  ];

  const allCols = [
    { key: 'overall', label: 'Overall' },
    { key: 'player', label: 'Player' },
    { key: 'pos', label: 'Pos' },
    { key: 'team', label: 'Team' },
    { key: 'bye', label: 'Bye' },
    ...PLATFORM_COLS,
  ];

  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        Multi-platform ADP rankings from CBS, ESPN, Yahoo, NFFC, MFL, DraftKings, Drafters &amp; Underdog.
        Click any column header to sort. Updated manually — upload a new Excel file to refresh.
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <select className="select-control" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
          <option value={2026}>2026</option>
        </select>
        <select className="select-control" value={pos} onChange={(e) => setPos(e.target.value)}>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="refresh-btn" onClick={fetchAdp} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && (
        <div className="board-card rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-3 board-card-header flex items-center justify-between">
            <span className="font-display text-base tracking-wide uppercase">
              {season} Fantasy Football ADP {pos !== 'ALL' ? `— ${pos}` : ''}
            </span>
            <span className="text-xs kickoff-text">{data.length} players</span>
          </div>
          <div className="overflow-x-auto">
            <table className="opp-table">
              <thead>
                <tr>
                  {allCols.map((c) => (
                    <th key={c.key} onClick={() => handleSort(c.key)} className="opp-th">
                      {c.label}{sortBy === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={allCols.length} className="opp-td text-center kickoff-text">Loading…</td></tr>
                ) : data.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'stripe-a' : 'stripe-b'}>
                    {allCols.map((c) => (
                      <td key={c.key} className="opp-td">
                        {c.key === 'pos' ? <PosBadge pos={row.pos} /> : (row[c.key] ?? '—')}
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

// Position color coding used across ADP tables and the Draft Board.
// QB = yellow, WR = blue, RB = orange, TE = green.
function posColor(pos) {
  const base = (pos || '').replace(/[0-9]/g, '');
  switch (base) {
    case 'QB': return { bg: 'rgba(234, 179, 8, 0.12)', text: '#A16207', border: 'rgba(234, 179, 8, 0.35)' };
    case 'WR': return { bg: 'rgba(37, 99, 235, 0.10)', text: '#1D4ED8', border: 'rgba(37, 99, 235, 0.3)' };
    case 'RB': return { bg: 'rgba(234, 88, 12, 0.10)', text: '#C2410C', border: 'rgba(234, 88, 12, 0.3)' };
    case 'TE': return { bg: 'rgba(22, 163, 74, 0.10)', text: '#15803D', border: 'rgba(22, 163, 74, 0.3)' };
    default: return { bg: 'var(--row-alt)', text: 'var(--text-muted)', border: 'var(--card-border)' };
  }
}

function PosBadge({ pos }) {
  const c = posColor(pos);
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: '5px', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {pos}
    </span>
  );
}

function TwoQbAdpTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pos, setPos] = useState('ALL');
  const [sortBy, setSortBy] = useState('overall');
  const [sortDir, setSortDir] = useState('asc');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'];

  const fetchAdp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('adp_2qb')
        .select('*')
        .eq('season', 2026)
        .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });
      if (pos !== 'ALL') query = query.eq('pos', pos);
      const { data, error } = await query;
      if (error) throw error;
      setData(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pos, sortBy, sortDir]);

  useEffect(() => { fetchAdp(); }, [fetchAdp]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const cols = [
    { key: 'overall', label: 'Overall' },
    { key: 'player', label: 'Player' },
    { key: 'pos', label: 'Pos' },
    { key: 'team', label: 'Team' },
    { key: 'bye', label: 'Bye' },
    { key: 'avg_pick', label: 'Avg Pick' },
    { key: 'high', label: 'High' },
    { key: 'low', label: 'Low' },
    { key: 'pct_drafted', label: '% Drafted' },
  ];

  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        Consensus ADP specifically for 2-QB / Superflex leagues — QB value rises sharply compared to standard formats.
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <select className="select-control" value={pos} onChange={(e) => setPos(e.target.value)}>
          {positions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="refresh-btn" onClick={fetchAdp} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && (
        <div className="board-card rounded-lg overflow-hidden mb-5">
          <div className="px-4 py-3 board-card-header flex items-center justify-between">
            <span className="font-display text-base tracking-wide uppercase">
              2026 2-QB / Superflex ADP {pos !== 'ALL' ? `— ${pos}` : ''}
            </span>
            <span className="text-xs kickoff-text">{data.length} players</span>
          </div>
          <div className="overflow-x-auto">
            <table className="opp-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} onClick={() => handleSort(c.key)} className="opp-th">
                      {c.label}{sortBy === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
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
                        {c.key === 'pos' ? <PosBadge pos={row.pos} /> : (row[c.key] ?? '—')}
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

function ByeWeeksTab() {
  const [byeWeeks, setByeWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchByeWeeks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('bye_weeks')
        .select('*')
        .eq('season', 2026)
        .order('week', { ascending: true });
      if (error) throw error;
      setByeWeeks(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchByeWeeks(); }, [fetchByeWeeks]);

  // Group by week
  const byWeek = {};
  byeWeeks.forEach(row => {
    if (!byWeek[row.week]) byWeek[row.week] = [];
    byWeek[row.week].push(row.team);
  });
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);

  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        2026 NFL bye weeks by team.
      </p>

      {error && <div className="error-box">{error}</div>}

      {!error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {loading ? (
            <div className="text-sm kickoff-text">Loading…</div>
          ) : weeks.length === 0 ? (
            <div className="text-sm kickoff-text">No bye week data found.</div>
          ) : weeks.map(week => (
            <div key={week} className="board-card rounded-lg overflow-hidden">
              <div className="board-card-header px-4 py-2">
                <span className="font-display text-sm">Week {week}</span>
              </div>
              <div style={{ padding: '0.6rem 1rem' }}>
                {byWeek[week].map(team => (
                  <div key={team} style={{ fontSize: '0.82rem', padding: '0.25rem 0', color: 'var(--text-primary)' }}>
                    {team}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ESPN's numeric team IDs (1-34, with some gaps/retired franchise IDs).
const NFL_TEAMS = [
  { id: 22, abbr: 'ARI', name: 'Arizona Cardinals' },
  { id: 1, abbr: 'ATL', name: 'Atlanta Falcons' },
  { id: 33, abbr: 'BAL', name: 'Baltimore Ravens' },
  { id: 2, abbr: 'BUF', name: 'Buffalo Bills' },
  { id: 29, abbr: 'CAR', name: 'Carolina Panthers' },
  { id: 3, abbr: 'CHI', name: 'Chicago Bears' },
  { id: 4, abbr: 'CIN', name: 'Cincinnati Bengals' },
  { id: 5, abbr: 'CLE', name: 'Cleveland Browns' },
  { id: 6, abbr: 'DAL', name: 'Dallas Cowboys' },
  { id: 7, abbr: 'DEN', name: 'Denver Broncos' },
  { id: 8, abbr: 'DET', name: 'Detroit Lions' },
  { id: 9, abbr: 'GB', name: 'Green Bay Packers' },
  { id: 34, abbr: 'HOU', name: 'Houston Texans' },
  { id: 11, abbr: 'IND', name: 'Indianapolis Colts' },
  { id: 30, abbr: 'JAX', name: 'Jacksonville Jaguars' },
  { id: 12, abbr: 'KC', name: 'Kansas City Chiefs' },
  { id: 13, abbr: 'LV', name: 'Las Vegas Raiders' },
  { id: 24, abbr: 'LAC', name: 'Los Angeles Chargers' },
  { id: 14, abbr: 'LAR', name: 'Los Angeles Rams' },
  { id: 15, abbr: 'MIA', name: 'Miami Dolphins' },
  { id: 16, abbr: 'MIN', name: 'Minnesota Vikings' },
  { id: 17, abbr: 'NE', name: 'New England Patriots' },
  { id: 18, abbr: 'NO', name: 'New Orleans Saints' },
  { id: 19, abbr: 'NYG', name: 'New York Giants' },
  { id: 20, abbr: 'NYJ', name: 'New York Jets' },
  { id: 21, abbr: 'PHI', name: 'Philadelphia Eagles' },
  { id: 23, abbr: 'PIT', name: 'Pittsburgh Steelers' },
  { id: 25, abbr: 'SF', name: 'San Francisco 49ers' },
  { id: 26, abbr: 'SEA', name: 'Seattle Seahawks' },
  { id: 27, abbr: 'TB', name: 'Tampa Bay Buccaneers' },
  { id: 10, abbr: 'TEN', name: 'Tennessee Titans' },
  { id: 28, abbr: 'WSH', name: 'Washington Commanders' },
];

function DepthChartsTab() {
  const [teamId, setTeamId] = useState(NFL_TEAMS[0].id);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChart = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/depthcharts?team=${id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChart(teamId); }, [teamId, fetchChart]);

  const selectedTeam = NFL_TEAMS.find(t => t.id === Number(teamId));

  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        Live NFL depth charts by team, sourced from ESPN. Formations and ranked players update as teams adjust their rosters.
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <select className="select-control" value={teamId} onChange={(e) => setTeamId(Number(e.target.value))}>
          {NFL_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="refresh-btn" onClick={() => fetchChart(teamId)} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && !error && (
        <div className="text-sm kickoff-text">Loading {selectedTeam?.name} depth chart…</div>
      )}

      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.formations.map((formation) => (
            <div key={formation.id} className="board-card rounded-lg overflow-hidden">
              <div className="board-card-header px-4 py-2">
                <span className="font-display text-sm tracking-wide uppercase">{formation.name}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="opp-table">
                  <tbody>
                    {formation.positions.map((pos) => (
                      <tr key={pos.abbreviation} className="border-row">
                        <td className="opp-td" style={{ fontWeight: 700, color: 'var(--text-primary)', background: 'var(--row-alt)' }}>
                          {pos.abbreviation}
                        </td>
                        {pos.players.length === 0 ? (
                          <td className="opp-td" style={{ color: 'var(--text-muted)' }}>—</td>
                        ) : pos.players.map((p, i) => (
                          <td key={i} className="opp-td">
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '1px' }}>
                              {p.rank === 1 ? '1st' : p.rank === 2 ? '2nd' : p.rank === 3 ? '3rd' : `${p.rank}th`}
                            </div>
                            {p.name}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Transforms ESPN scoreboard event into a compact ticker item
function parseESPNGame(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  const status = event.status?.type;
  const state = status?.state; // pre, in, post
  const detail = status?.shortDetail || '';

  return {
    id: event.id,
    away: { abbr: away?.team?.abbreviation || '?', score: away?.score ?? '' },
    home: { abbr: home?.team?.abbreviation || '?', score: home?.score ?? '' },
    state,
    detail,
  };
}

function GameDetailModal({ sport, eventId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/scores?sport=${sport}&eventId=${eventId}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sport, eventId]);

  const header = data?.header;
  const comp = header?.competitions?.[0];
  const teams = comp?.competitors || [];
  const boxscore = data?.boxscore;
  const teamStats = boxscore?.teams || [];

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '640px', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(26,31,46,0.15)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
          <button className="auth-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="text-sm kickoff-text text-center" style={{ padding: '2rem 0' }}>Loading game details…</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && !error && teams.length === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginBottom: '1.25rem' }}>
              {teams.map((t, i) => (
                <React.Fragment key={t.id}>
                  {i === 1 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp?.status?.type?.shortDetail}</span>}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.team?.abbreviation}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.score}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {teamStats.length === 2 && (
              <div className="board-card rounded-lg overflow-hidden mb-3">
                <div className="px-4 py-2 board-card-header">
                  <span className="font-display text-sm">Team Stats</span>
                </div>
                <div style={{ padding: '0.5rem 1rem' }}>
                  {(teamStats[0].statistics || []).map((stat, idx) => {
                    const awayVal = teamStats[0].statistics?.[idx]?.displayValue;
                    const homeVal = teamStats[1].statistics?.[idx]?.displayValue;
                    return (
                      <div key={stat.name} className="border-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'center', padding: '0.4rem 0' }}>
                        <div style={{ fontSize: '0.8rem', textAlign: 'left', fontWeight: 600 }}>{awayVal ?? '—'}</div>
                        <div style={{ fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-muted)' }}>{stat.label || stat.name}</div>
                        <div style={{ fontSize: '0.8rem', textAlign: 'right', fontWeight: 600 }}>{homeVal ?? '—'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!teamStats.length && (
              <div className="text-sm kickoff-text text-center" style={{ padding: '1rem 0' }}>
                Box score not yet available for this game.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ScoreboardTab({ oddsCache, fetchOdds, sportsConfig }) {
  const [activeSport, setActiveSport] = useState('mlb');
  const [openDropdown, setOpenDropdown] = useState(false);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  const SPORTS = [
    { id: 'nfl', label: 'NFL' },
    { id: 'ncaaf', label: 'NCAAF' },
    { id: 'nba', label: 'NBA' },
    { id: 'wnba', label: 'WNBA' },
    { id: 'mlb', label: 'MLB' },
    { id: 'nhl', label: 'NHL' },
  ];

  // Sports where we also have spread data available via The Odds API.
  const ODDS_SPORTS = ['nfl', 'nba', 'mlb'];

  const fetchScores = useCallback(async (sport) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scores?sport=${sport}`);
      const json = await res.json();
      const parsed = (json.events || []).map(parseESPNGame).filter(Boolean);
      setGames(parsed);
    } catch (e) {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScores(activeSport); }, [activeSport, fetchScores]);

  useEffect(() => {
    const t = setInterval(() => fetchScores(activeSport), 60000);
    return () => clearInterval(t);
  }, [activeSport, fetchScores]);

  // Pull in spread data for sports we have odds for, reusing the shared cache
  // so we don't burn extra Odds API credits if the Betting tab already fetched it.
  useEffect(() => {
    if (!ODDS_SPORTS.includes(activeSport)) return;
    if (oddsCache[activeSport]) return;
    const sportObj = sportsConfig.find(s => s.id === activeSport);
    if (sportObj) fetchOdds(sportObj);
  }, [activeSport, oddsCache, fetchOdds, sportsConfig]);

  // Build a quick lookup of spreads by matching team names from the odds response.
  const spreadByTeams = {};
  if (ODDS_SPORTS.includes(activeSport) && oddsCache[activeSport]?.data) {
    for (const event of oddsCache[activeSport].data) {
      const bookmaker = event.bookmakers?.[0];
      const spreadsMarket = bookmaker?.markets?.find(m => m.key === 'spreads');
      if (!spreadsMarket) continue;
      const homeOutcome = spreadsMarket.outcomes?.find(o => o.name === event.home_team);
      const awayOutcome = spreadsMarket.outcomes?.find(o => o.name === event.away_team);
      spreadByTeams[`${event.away_team}@${event.home_team}`] = {
        home: homeOutcome?.point,
        away: awayOutcome?.point,
      };
    }
  }

  // Loosely match an ESPN game (by team abbreviation/short name) to an odds-API entry
  // by checking if either team's full name contains the ESPN abbreviation.
  const findSpread = (game) => {
    for (const key of Object.keys(spreadByTeams)) {
      const [away, home] = key.split('@');
      if (
        (away?.includes(game.away.abbr) || game.away.abbr.includes(away?.split(' ').pop() || '')) &&
        (home?.includes(game.home.abbr) || game.home.abbr.includes(home?.split(' ').pop() || ''))
      ) {
        return spreadByTeams[key];
      }
    }
    return null;
  };

  const activeLabel = SPORTS.find(s => s.id === activeSport)?.label;

  return (
    <div className="board-card rounded-lg mb-5" style={{ overflow: 'visible', position: 'relative' }}>
      {selectedGame && (
        <GameDetailModal
          sport={activeSport}
          eventId={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', height: '54px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <div className="nav-group" style={{ flexShrink: 0, borderRight: '1px solid var(--card-border)' }}>
          <button
            onClick={() => setOpenDropdown(v => !v)}
            style={{
              height: '100%', padding: '0 1rem', border: 'none', background: 'var(--card-header-bg)',
              fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap',
            }}
          >
            {activeLabel} <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{openDropdown ? '▲' : '▼'}</span>
          </button>
          {openDropdown && (
            <div className="nav-dropdown">
              {SPORTS.map(s => (
                <button
                  key={s.id}
                  className={`nav-dropdown-item ${activeSport === s.id ? 'active' : ''}`}
                  onClick={() => { setActiveSport(s.id); setOpenDropdown(false); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowX: 'auto', display: 'flex', alignItems: 'stretch', whiteSpace: 'nowrap' }}>
          {loading ? (
            <div className="text-xs kickoff-text" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>Loading scores…</div>
          ) : games.length === 0 ? (
            <div className="text-xs kickoff-text" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>No games today.</div>
          ) : (
            games.map(g => {
              const spread = ODDS_SPORTS.includes(activeSport) ? findSpread(g) : null;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGame(g.id)}
                  style={{
                    cursor: 'pointer', border: 'none', borderRight: '1px solid var(--row-border)',
                    background: 'transparent', padding: '0 0.9rem', display: 'inline-flex',
                    flexDirection: 'column', justifyContent: 'center', minWidth: '120px', flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>{g.away.abbr}</span>
                    {g.state !== 'pre' && <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>{g.away.score}</span>}
                    {spread && g.state === 'pre' && (
                      <span style={{ fontSize: '0.62rem', color: 'var(--amber-text)', fontWeight: 700 }}>
                        {spread.away > 0 ? `+${spread.away}` : spread.away}
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>@</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>{g.home.abbr}</span>
                    {g.state !== 'pre' && <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>{g.home.score}</span>}
                    {spread && g.state === 'pre' && (
                      <span style={{ fontSize: '0.62rem', color: 'var(--amber-text)', fontWeight: 700 }}>
                        {spread.home > 0 ? `+${spread.home}` : spread.home}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: g.state === 'in' ? 'var(--amber-text)' : 'var(--text-muted)', marginTop: '1px' }}>
                    {g.detail}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 1rem', borderLeft: '1px solid var(--card-border)' }}>
          <span className="text-xs kickoff-text" style={{ whiteSpace: 'nowrap' }}>{games.length} games</span>
        </div>
      </div>
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

function FantasyDataTab({ title, table, scoringCols }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [season, setSeason] = useState(2025);
  const [pos, setPos] = useState('ALL');
  const [scoring, setScoring] = useState(scoringCols[0].key);
  const [sortBy, setSortBy] = useState(scoringCols[0].key);
  const [sortDir, setSortDir] = useState('desc');

  const seasons = Array.from({ length: 2025 - 2013 + 1 }, (_, i) => 2025 - i);
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from(table)
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
  }, [season, pos, sortBy, sortDir, table]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const baseCols = [
    { key: 'player', label: 'Player' },
    { key: 'team', label: 'Team' },
    { key: 'pos', label: 'Pos' },
    { key: 'gms', label: 'GMs' },
  ];
  const displayCols = [...baseCols, ...scoringCols];

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
              {season} {title} {pos !== 'ALL' ? `— ${pos}` : ''}
            </span>
            <span className="text-xs kickoff-text">{data.length} players</span>
          </div>
          <div className="overflow-x-auto">
            <table className="opp-table">
              <thead>
                <tr>
                  {displayCols.map((c) => (
                    <th key={c.key} onClick={() => handleSort(c.key)} className="opp-th">
                      {c.label}{sortBy === c.key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={displayCols.length} className="opp-td text-center kickoff-text">Loading…</td></tr>
                ) : data.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'stripe-a' : 'stripe-b'}>
                    {displayCols.map((c) => (
                      <td key={c.key} className="opp-td">{row[c.key] ?? '—'}</td>
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

const FP_SCORING_COLS = [
  { key: 'ppr', label: 'PPR' },
  { key: 'half_ppr', label: '½ PPR' },
  { key: 'std', label: 'STD' },
  { key: 'pass_td_6pt', label: '6PT TD' },
  { key: 'ffpc', label: 'FFPC' },
  { key: 'dk', label: 'DK' },
  { key: 'fd', label: 'FD' },
  { key: 'underdog', label: 'Underdog' },
];

function RedZoneTab() {
  const [statType, setStatType] = useState('rz_rushing');
  const [season, setSeason] = useState(2025);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('i20_td');
  const [sortDir, setSortDir] = useState('desc');

  const seasons = Array.from({ length: 2025 - 2020 + 1 }, (_, i) => 2025 - i);

  const STAT_TYPES = [
    { key: 'rz_rushing', label: 'Rushing' },
    { key: 'rz_receiving', label: 'Receiving' },
    { key: 'rz_passing', label: 'Passing' },
    { key: 'rz_scoring_att_per_game', label: 'RZ Scoring Att/Gm' },
  ];

  const COL_DEFS = {
    rz_rushing: [
      { key: 'player', label: 'Player' }, { key: 'team', label: 'Team' },
      { key: 'i20_att', label: 'i20 Att' }, { key: 'i20_yds', label: 'i20 Yds' }, { key: 'i20_td', label: 'i20 TD' }, { key: 'i20_pctrush', label: 'i20 %Rush' },
      { key: 'i10_att', label: 'i10 Att' }, { key: 'i10_yds', label: 'i10 Yds' }, { key: 'i10_td', label: 'i10 TD' }, { key: 'i10_pctrush', label: 'i10 %Rush' },
      { key: 'i5_att', label: 'i5 Att' }, { key: 'i5_yds', label: 'i5 Yds' }, { key: 'i5_td', label: 'i5 TD' }, { key: 'i5_pctrush', label: 'i5 %Rush' },
    ],
    rz_receiving: [
      { key: 'player', label: 'Player' }, { key: 'team', label: 'Team' },
      { key: 'i20_tgt', label: 'i20 Tgt' }, { key: 'i20_rec', label: 'i20 Rec' }, { key: 'i20_ctchpct', label: 'i20 Ctch%' }, { key: 'i20_yds', label: 'i20 Yds' }, { key: 'i20_td', label: 'i20 TD' }, { key: 'i20_pcttgt', label: 'i20 %Tgt' },
      { key: 'i10_tgt', label: 'i10 Tgt' }, { key: 'i10_rec', label: 'i10 Rec' }, { key: 'i10_ctchpct', label: 'i10 Ctch%' }, { key: 'i10_yds', label: 'i10 Yds' }, { key: 'i10_td', label: 'i10 TD' }, { key: 'i10_pcttgt', label: 'i10 %Tgt' },
    ],
    rz_passing: [
      { key: 'player', label: 'Player' }, { key: 'team', label: 'Team' },
      { key: 'i20_att', label: 'i20 Att' }, { key: 'i20_cmp', label: 'i20 Cmp' }, { key: 'i20_cmppct', label: 'i20 Cmp%' }, { key: 'i20_yds', label: 'i20 Yds' }, { key: 'i20_td', label: 'i20 TD' }, { key: 'i20_int', label: 'i20 Int' },
      { key: 'i10_att', label: 'i10 Att' }, { key: 'i10_cmppct', label: 'i10 Cmp%' }, { key: 'i10_yds', label: 'i10 Yds' }, { key: 'i10_td', label: 'i10 TD' }, { key: 'i10_int', label: 'i10 Int' },
    ],
    rz_scoring_att_per_game: [
      { key: 'team', label: 'Team' }, { key: 'rank', label: 'Rank' },
      { key: 'season_avg', label: 'Season Avg' }, { key: 'last3', label: 'Last 3' }, { key: 'last1', label: 'Last 1' },
      { key: 'home', label: 'Home' }, { key: 'away', label: 'Away' }, { key: 'prev_season', label: 'Prev Season' },
    ],
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const defaultSort = statType === 'rz_scoring_att_per_game' ? 'rank' : 'i20_td';
      const currentSort = sortBy && COL_DEFS[statType]?.find(c => c.key === sortBy) ? sortBy : defaultSort;
      const { data, error } = await supabase
        .from(statType)
        .select('*')
        .eq('season', season)
        .order(currentSort, { ascending: sortDir === 'asc' });
      if (error) throw error;
      setData(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statType, season, sortBy, sortDir]);

  useEffect(() => {
    const defaultSort = statType === 'rz_scoring_att_per_game' ? 'rank' : 'i20_td';
    setSortBy(defaultSort);
    setSortDir(statType === 'rz_scoring_att_per_game' ? 'asc' : 'desc');
  }, [statType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const cols = COL_DEFS[statType] || [];

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <select className="select-control" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
          {seasons.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="select-control" value={statType} onChange={(e) => setStatType(e.target.value)}>
          {STAT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
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
              {season} Red Zone — {STAT_TYPES.find(t => t.key === statType)?.label}
            </span>
            <span className="text-xs kickoff-text">{data.length} rows</span>
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
                      <td key={c.key} className="opp-td">{row[c.key] ?? '—'}</td>
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

function LeagueSetupForm({ userId, onSaved, onCancel }) {
  const [leagueName, setLeagueName] = useState('');
  const [draftType, setDraftType] = useState('snake');
  const [numTeams, setNumTeams] = useState(12);
  const [scoringFormat, setScoringFormat] = useState('ppr');
  const [superflex, setSuperflex] = useState(false);
  const [roster, setRoster] = useState({ qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateRoster = (key, val) => {
    setRoster(r => ({ ...r, [key]: Math.max(0, Number(val) || 0) }));
  };

  const toggleSuperflex = (checked) => {
    setSuperflex(checked);
    // Common convention: superflex leagues add a 2nd startable QB-eligible slot
    setRoster(r => ({ ...r, qb: checked ? 2 : 1 }));
  };

  const handleSave = async () => {
    if (!leagueName.trim()) {
      setError('Please enter a league name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('leagues').insert({
        user_id: userId,
        league_name: leagueName.trim(),
        draft_type: draftType,
        num_teams: numTeams,
        scoring_format: scoringFormat,
        superflex,
        ...roster,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const ROSTER_FIELDS = [
    { key: 'qb', label: 'QB' },
    { key: 'rb', label: 'RB' },
    { key: 'wr', label: 'WR' },
    { key: 'te', label: 'TE' },
    { key: 'flex', label: 'FLEX' },
    { key: 'k', label: 'K' },
    { key: 'dst', label: 'DST' },
    { key: 'bench', label: 'Bench' },
  ];

  return (
    <div className="board-card rounded-lg p-5 mb-5" style={{ maxWidth: '560px' }}>
      <div className="font-display text-base mb-4">Create a League</div>

      {error && <div className="error-box">{error}</div>}

      <div className="mb-3">
        <label className="auth-label">League Name</label>
        <input className="auth-input" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} placeholder="e.g. Office League 2026" />
      </div>

      <div className="flex gap-3 mb-3">
        <div style={{ flex: 1 }}>
          <label className="auth-label">Draft Type</label>
          <select className="select-control" style={{ width: '100%' }} value={draftType} onChange={(e) => setDraftType(e.target.value)}>
            <option value="snake">Snake</option>
            <option value="auction">Auction</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="auth-label">Teams</label>
          <select className="select-control" style={{ width: '100%' }} value={numTeams} onChange={(e) => setNumTeams(Number(e.target.value))}>
            {[8,10,12,14,16].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="auth-label">Scoring</label>
          <select className="select-control" style={{ width: '100%' }} value={scoringFormat} onChange={(e) => setScoringFormat(e.target.value)}>
            <option value="ppr">PPR</option>
            <option value="half_ppr">Half PPR</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="superflex-toggle"
          checked={superflex}
          onChange={(e) => toggleSuperflex(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <label htmlFor="superflex-toggle" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
          2-QB / Superflex League
        </label>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(adds a 2nd startable QB slot)</span>
      </div>

      <label className="auth-label" style={{ marginBottom: '0.5rem' }}>Roster Spots</label>
      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {ROSTER_FIELDS.map(f => (
          <div key={f.key} style={{ width: '70px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px' }}>{f.label}</div>
            <input
              className="auth-input"
              type="number"
              min="0"
              style={{ textAlign: 'center', padding: '0.4rem' }}
              value={roster[f.key]}
              onChange={(e) => updateRoster(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="auth-submit" style={{ width: 'auto', padding: '0.55rem 1.5rem' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create League'}
        </button>
        <button className="refresh-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DraftBoard({ league, onBack }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState('ALL');
  const [search, setSearch] = useState('');
  const [picks, setPicks] = useState([]); // [{ player, pos, team, teamIndex, pickNumber }]
  const [myTeamIndex, setMyTeamIndex] = useState(0);
  const [showBoardModal, setShowBoardModal] = useState(false);

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  const numDrafters = league.num_teams || 12;
  const teamLabels = Array.from({ length: numDrafters }, (_, i) => `Team ${i + 1}`);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const table = league.superflex ? 'adp_2qb' : 'adp';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('season', 2026)
        .order('overall', { ascending: true });
      if (error) throw error;
      setPlayers(data || []);
    } catch (e) {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [league.superflex]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const draftedNames = new Set(picks.map(p => p.player));

  const ROSTER_FIELDS = [
    { key: 'qb', label: 'QB' },
    { key: 'rb', label: 'RB' },
    { key: 'wr', label: 'WR' },
    { key: 'te', label: 'TE' },
    { key: 'flex', label: 'FLEX' },
    { key: 'k', label: 'K' },
    { key: 'dst', label: 'DST' },
    { key: 'bench', label: 'Bench' },
  ];

  const filtered = players.filter(p => {
    if (draftedNames.has(p.player)) return false;
    if (pos !== 'ALL' && !p.pos?.startsWith(pos)) return false;
    if (search && !p.player?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Snake draft: odd rounds go 0→N-1, even rounds reverse N-1→0.
  // Auction: order doesn't really matter for nominations, so we just cycle round-robin.
  const teamIndexForPick = (pickCount) => {
    const round = Math.floor(pickCount / numDrafters);
    const slot = pickCount % numDrafters;
    if (league.draft_type === 'snake' && round % 2 === 1) {
      return numDrafters - 1 - slot;
    }
    return slot;
  };

  const draftPlayer = (player) => {
    const teamIndex = teamIndexForPick(picks.length);
    setPicks(p => [...p, { ...player, teamIndex, pickNumber: p.length + 1 }]);
  };

  const undoPick = (pickIdx) => {
    setPicks(p => p.filter((_, i) => i !== pickIdx).map((p2, i) => ({ ...p2, teamIndex: teamIndexForPick(i), pickNumber: i + 1 })));
  };

  const myPicks = picks.filter(p => p.teamIndex === myTeamIndex);
  const myPosCounts = {};
  myPicks.forEach(p => {
    const base = (p.pos || '').replace(/[0-9]/g, '');
    myPosCounts[base] = (myPosCounts[base] || 0) + 1;
  });

  const currentRound = Math.floor(picks.length / numDrafters) + 1;
  const pickInRound = (picks.length % numDrafters) + 1;
  const clockIndex = teamIndexForPick(picks.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="font-display text-base">{league.league_name}</div>
          <div className="text-xs kickoff-text">
            {league.num_teams}-team {league.draft_type} · {league.scoring_format.toUpperCase()}{league.superflex ? ' · Superflex' : ''}
          </div>
        </div>
        <button className="refresh-btn" onClick={onBack}>← Back to Leagues</button>
      </div>

      <div className="board-card rounded-lg mb-4" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="text-xs kickoff-text">Round {currentRound} · Pick {pickInRound}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber-text)', background: 'var(--amber-soft)', padding: '0.3rem 0.7rem', borderRadius: '20px' }}>
            On the clock: {teamLabels[clockIndex]}{clockIndex === myTeamIndex ? ' (Me)' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs kickoff-text">My team:</label>
          <select className="select-control" value={myTeamIndex} onChange={(e) => setMyTeamIndex(Number(e.target.value))}>
            {teamLabels.map((label, i) => <option key={i} value={i}>{label}</option>)}
          </select>
          <button className="refresh-btn" onClick={() => setShowBoardModal(true)} disabled={picks.length === 0}>
            View Draft Board
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 480px', minWidth: '320px' }}>
          {league.superflex && (
            <div className="text-xs kickoff-text mb-3" style={{ background: 'var(--amber-soft)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
              This league is Superflex — rankings below use 2-QB/Superflex-specific consensus ADP, where QB value rises compared to standard formats.
            </div>
          )}
          <div className="flex gap-2 flex-wrap mb-3">
            <input
              className="auth-input"
              style={{ maxWidth: '220px' }}
              placeholder="Search player…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="select-control" value={pos} onChange={(e) => setPos(e.target.value)}>
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="refresh-btn" onClick={fetchPlayers} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="board-card rounded-lg overflow-hidden">
            <div className="board-card-header px-4 py-2 flex items-center justify-between">
              <span className="font-display text-sm">Best Available</span>
              <span className="text-xs kickoff-text">{filtered.length} players</span>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="opp-table">
                <thead>
                  <tr>
                    <th className="opp-th">ADP</th>
                    <th className="opp-th">Player</th>
                    <th className="opp-th">Pos</th>
                    <th className="opp-th">Team</th>
                    <th className="opp-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="opp-td text-center kickoff-text">Loading…</td></tr>
                  ) : filtered.slice(0, 100).map((p, i) => (
                    <tr key={p.player} className={i % 2 === 0 ? 'stripe-a' : 'stripe-b'}>
                      <td className="opp-td">{p.overall ?? '—'}</td>
                      <td className="opp-td" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{p.player}</td>
                      <td className="opp-td"><PosBadge pos={p.pos} /></td>
                      <td className="opp-td">{p.team}</td>
                      <td className="opp-td">
                        <button
                          onClick={() => draftPlayer(p)}
                          style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 10px', borderRadius: '6px', border: 'none', background: 'var(--amber)', color: '#fff', cursor: 'pointer' }}
                        >
                          Draft
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
          <div className="board-card rounded-lg overflow-hidden">
            <div className="board-card-header px-4 py-2">
              <span className="font-display text-sm">My Team — {teamLabels[myTeamIndex]}</span>
            </div>
            <div style={{ padding: '0.75rem 1rem' }}>
              {ROSTER_FIELDS.map(f => {
                const need = league[f.key] ?? 0;
                const have = f.key === 'flex' ? 0 : (myPosCounts[f.label] || 0);
                return (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.25rem 0', borderBottom: '1px solid var(--row-border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                    <span style={{ fontWeight: 700, color: have >= need ? 'var(--amber-text)' : 'var(--text-primary)' }}>{have} / {need}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: '0.75rem' }}>
                {myPicks.length === 0 ? (
                  <div className="text-xs kickoff-text">No picks yet.</div>
                ) : myPicks.map(p => (
                  <div key={p.player} style={{ fontSize: '0.78rem', padding: '0.3rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{p.player}</span>
                    <PosBadge pos={p.pos} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBoardModal && (
        <div className="auth-overlay" onClick={() => setShowBoardModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1.25rem', width: '95%', maxWidth: '1100px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(26,31,46,0.15)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-base">Draft Board — {league.league_name}</span>
              <button className="auth-close" onClick={() => setShowBoardModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {teamLabels.map((label, teamIdx) => {
                const teamPicks = picks.filter(p => p.teamIndex === teamIdx);
                const isMe = teamIdx === myTeamIndex;
                return (
                  <div
                    key={teamIdx}
                    style={{
                      minWidth: '150px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden',
                      border: isMe ? '1.5px solid var(--amber)' : '1px solid var(--card-border)',
                    }}
                  >
                    <div style={{ padding: '0.5rem 0.7rem', background: isMe ? 'var(--amber-soft)' : 'var(--row-alt)', fontSize: '0.74rem', fontWeight: 700, color: isMe ? 'var(--amber-text)' : 'var(--text-primary)' }}>
                      {label}{isMe ? ' (Me)' : ''}
                    </div>
                    {teamPicks.length === 0 ? (
                      <div style={{ padding: '0.5rem 0.7rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>No picks</div>
                    ) : teamPicks.map((p) => {
                      const pickIdx = picks.indexOf(p);
                      const c = posColor(p.pos);
                      return (
                        <div key={p.player} style={{ padding: '0.45rem 0.7rem', borderTop: '1px solid var(--row-border)', borderLeft: `3px solid ${c.text}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.player}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                              <PosBadge pos={p.pos} />
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>#{p.pickNumber}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => undoPick(pickIdx)}
                            title="Undo this pick"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftAssistantTab({ userId }) {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeLeague, setActiveLeague] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLeagues = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeagues(data || []);
    } catch (e) {
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchLeagues(); }, [fetchLeagues]);

  const handleDelete = async (leagueId) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
      if (error) throw error;
      setConfirmDelete(null);
      fetchLeagues();
    } catch (e) {
      alert('Could not delete league: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (activeLeague) {
    return <DraftBoard league={activeLeague} onBack={() => setActiveLeague(null)} />;
  }

  return (
    <div>
      <p className="text-sm kickoff-text mb-4">
        Create a league profile with your draft type and roster spots, then use the Draft Board to track picks and see the best available players as your draft happens.
      </p>

      {showForm ? (
        <LeagueSetupForm
          userId={userId}
          onSaved={() => { setShowForm(false); fetchLeagues(); }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button className="auth-submit" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginBottom: '1.25rem' }} onClick={() => setShowForm(true)}>
          + New League
        </button>
      )}

      {loading ? (
        <div className="text-sm kickoff-text">Loading your leagues…</div>
      ) : leagues.length === 0 ? (
        <div className="text-sm kickoff-text">No leagues yet — create one to get started.</div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          {leagues.map(l => (
            <div
              key={l.id}
              className="board-card rounded-lg p-4"
              style={{ minWidth: '220px', position: 'relative' }}
            >
              {confirmDelete === l.id ? (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                    Delete "{l.league_name}"? This can't be undone.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting}
                      style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer' }}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="refresh-btn"
                      style={{ fontSize: '0.72rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmDelete(l.id)}
                    title="Delete league"
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 6px', borderRadius: '4px' }}
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => setActiveLeague(l)}
                    style={{ textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', width: '100%', padding: 0 }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{l.league_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {l.num_teams}-team {l.draft_type} · {l.scoring_format.toUpperCase()}{l.superflex ? ' · Superflex' : ''}
                    </div>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
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
  const [showPrivacy, setShowPrivacy] = useState(false);

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .board-root {
          --board-bg: #F7F8FA;
          --card-bg: #FFFFFF;
          --card-header-bg: #FAFBFC;
          --card-border: #E8EAF0;
          --row-border: #F0F1F5;
          --row-alt: #F5F6FA;
          --text-primary: #1A1F2E;
          --text-muted: #8A90A0;
          --amber: #6C47FF;
          --amber-soft: rgba(108, 71, 255, 0.08);
          --amber-text: #6C47FF;
          background: var(--board-bg);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .font-display { font-family: 'Inter', sans-serif; font-weight: 800; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        .board-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: 0 1px 4px rgba(26, 31, 46, 0.06);
        }
        .board-card-header { background: var(--card-header-bg); border-bottom: 1px solid var(--card-border); }
        .team-stripe { display: inline-block; width: 4px; height: 16px; border-radius: 1px; flex-shrink: 0; }
        .kickoff-text { color: var(--text-muted); }
        .label-text { color: var(--text-muted); }
        .book-header { letter-spacing: 0.05em; font-weight: 600; }
        .row-group-label { color: var(--text-muted); background: rgba(26, 31, 46, 0.02); letter-spacing: 0.12em; font-size: 0.7rem; }
        .border-row { border-top: 1px solid var(--row-border); }
        .side-label { color: var(--text-primary); font-weight: 500; }
        .line-muted { color: var(--text-muted); }
        .line-best { color: var(--amber-text); }
        .no-lines { color: var(--text-muted); opacity: 0.5; font-size: 0.75rem; }
        .stripe-a { background: var(--card-bg); }
        .stripe-b { background: var(--row-alt); }

        .best-line-header { background: var(--amber); color: #fff; margin-right: 6px; border-radius: 4px; }
        .best-cell { background: var(--amber); color: #fff; margin-right: 6px; border-radius: 4px; }
        .best-cell-line { color: rgba(255,255,255,0.8); }
        .odds-best {
          background: var(--amber-soft);
          color: var(--amber-text);
          box-shadow: inset 3px 0 0 var(--amber);
          font-weight: 700;
        }
        .best-book-badge { color: var(--amber-text); font-weight: 600; }

        .accordion-header { background: none; border: none; cursor: pointer; text-align: left; width: 100%; }
        .accordion-header:hover { background: var(--row-alt); }
        .accordion-chevron { font-size: 0.6rem; color: var(--text-muted); margin-top: 4px; }

        .prop-label { color: var(--text-primary); background: var(--row-alt); }
        .props-toggle-btn {
          width: 100%; text-align: left;
          font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem;
          padding: 0.5rem 0.75rem; background: transparent; border: none;
          color: var(--text-muted); cursor: pointer;
        }
        .props-toggle-btn:hover { color: var(--amber-text); }

        .leaderboard-track { height: 8px; background: var(--row-border); overflow: hidden; border-radius: 4px; }
        .leaderboard-bar { height: 100%; background: var(--text-muted); opacity: 0.3; border-radius: 4px; }
        .leaderboard-bar-top { background: var(--amber); opacity: 1; }

        .live-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: var(--amber);
          animation: pulse 1.6s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .tab-btn {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 0.82rem;
          padding: 0.5rem 1.1rem;
          border-radius: 8px;
          border: 1.5px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-muted);
          cursor: pointer;
          letter-spacing: 0.01em;
        }
        .tab-btn.active {
          color: var(--amber-text);
          border-color: var(--amber);
          background: var(--amber-soft);
        }
        .refresh-btn {
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
          border: 1.5px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-muted);
          cursor: pointer;
        }
        .refresh-btn:hover { color: var(--amber-text); border-color: var(--amber); }
        .select-control {
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          padding: 0.4rem 0.7rem;
          border-radius: 8px;
          border: 1.5px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-primary);
          cursor: pointer;
        }
        .error-box {
          border: 1px solid rgba(220, 38, 38, 0.25);
          background: rgba(220, 38, 38, 0.05);
          color: #B91C1C;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }
        .success-box {
          border: 1px solid rgba(108, 71, 255, 0.25);
          background: rgba(108, 71, 255, 0.05);
          color: #6C47FF;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
        }
        .auth-overlay {
          position: fixed; inset: 0;
          background: rgba(26,31,46,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 100;
        }
        .auth-modal {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 1.75rem;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 12px 40px rgba(26,31,46,0.15);
        }
        .auth-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: 0.25rem; }
        .auth-close:hover { color: var(--text-primary); }
        .auth-label {
          display: block; font-size: 0.75rem; font-weight: 600;
          color: var(--text-muted); margin-bottom: 0.35rem;
          font-family: 'Inter', sans-serif; letter-spacing: 0.02em;
        }
        .auth-input {
          width: 100%; padding: 0.55rem 0.85rem;
          border: 1.5px solid var(--card-border);
          border-radius: 8px; background: var(--board-bg);
          color: var(--text-primary); font-size: 0.875rem;
          font-family: 'Inter', sans-serif; box-sizing: border-box;
        }
        .auth-input:focus { outline: none; border-color: var(--amber); }
        .auth-submit {
          width: 100%; padding: 0.65rem 1rem;
          background: var(--amber); color: #fff; border: none;
          border-radius: 8px; font-family: 'Inter', sans-serif;
          font-size: 0.9rem; font-weight: 700; letter-spacing: 0.03em;
          cursor: pointer;
        }
        .auth-submit:hover { opacity: 0.88; }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-switch { background: none; border: none; color: var(--amber-text); cursor: pointer; font-size: 0.75rem; font-weight: 600; text-decoration: underline; padding: 0; }
        .auth-header-btn {
          font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600;
          padding: 0.35rem 0.85rem; border-radius: 20px;
          border: 1.5px solid var(--card-border); background: var(--card-bg);
          color: var(--text-muted); cursor: pointer; white-space: nowrap;
        }
        .auth-header-btn:hover { color: var(--amber-text); border-color: var(--amber); }

        .nav-group { position: relative; }
        .nav-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0;
          background: var(--card-bg); border: 1.5px solid var(--card-border);
          border-radius: 12px; box-shadow: 0 8px 24px rgba(26,31,46,0.1);
          z-index: 50; min-width: 200px; overflow: hidden;
        }
        .nav-dropdown-item {
          display: block; width: 100%; text-align: left;
          padding: 0.65rem 1rem; font-family: 'Inter', sans-serif;
          font-size: 0.85rem; font-weight: 500; background: none; border: none;
          color: var(--text-primary); cursor: pointer;
          border-bottom: 1px solid var(--row-border);
        }
        .nav-dropdown-item:last-child { border-bottom: none; }
        .nav-dropdown-item:hover { background: var(--amber-soft); color: var(--amber-text); }
        .nav-dropdown-item.active { color: var(--amber-text); font-weight: 700; background: var(--amber-soft); }

        .opp-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .opp-th {
          padding: 0.55rem 0.75rem; text-align: left;
          font-family: 'Inter', sans-serif; font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase;
          color: var(--text-muted); background: var(--card-header-bg);
          border-bottom: 1.5px solid var(--card-border);
          cursor: pointer; white-space: nowrap; user-select: none;
        }
        .opp-th:hover { color: var(--amber-text); }
        .opp-td {
          padding: 0.5rem 0.75rem;
          font-family: 'IBM Plex Mono', monospace;
          color: var(--text-primary); white-space: nowrap;
          border-bottom: 1px solid var(--row-border);
        }

        .gdb-logo { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; }
        .gdb-logo-accent { color: var(--amber); }
        .gdb-nav { background: var(--card-bg); border-bottom: 1.5px solid var(--card-border); padding: 0.65rem 1.5rem; display: flex; align-items: center; justify-content: space-between; margin: -1.5rem -1.5rem 1.5rem; }
      `}</style>

      <div className={`mx-auto ${['fantasy_points','fantasy_ppg','opportunities','red_zone','adp','adp_2qb','draft_assistant','bye_weeks','depth_charts'].includes(activeId) ? 'max-w-7xl' : 'max-w-3xl'}`}>
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuth={() => setShowAuth(false)}
          />
        )}

        <ScoreboardTab oddsCache={cache} fetchOdds={fetchSport} sportsConfig={SPORTS} />

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2" style={{ borderBottom: '1.5px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div className="gdb-logo">
            Game Day <span className="gdb-logo-accent">Blueprint</span>
          </div>
          <div className="flex items-center gap-3">
            {['nfl','nba','mlb'].includes(activeId) && (
              <div className="flex items-center gap-2 font-mono text-xs kickoff-text">
                <span className="live-dot" />
                {entry ? `updated ${mm}:${ss} ago` : loading ? 'loading…' : 'no data yet'}
              </div>
            )}
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs kickoff-text" style={{ fontWeight: 600 }}>👤 {username}</span>
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
                className={`tab-btn ${['fantasy_points','fantasy_ppg','opportunities','red_zone','adp','adp_2qb','draft_assistant','bye_weeks','depth_charts'].includes(activeId) ? 'active' : ''}`}
                onClick={() => setOpenNav(openNav === 'fantasy' ? null : 'fantasy')}
              >
                Fantasy {openNav === 'fantasy' ? '▲' : '▼'}
              </button>
              {openNav === 'fantasy' && (
                <div className="nav-dropdown">
                  {[
                    { id: 'adp', label: 'Average Draft Position (ADP)' },
                    { id: 'adp_2qb', label: '2-QB / Superflex ADP' },
                    { id: 'fantasy_points', label: 'Fantasy Points' },
                    { id: 'fantasy_ppg', label: 'Fantasy Points Per Game' },
                    { id: 'opportunities', label: 'Player Opportunities' },
                    { id: 'red_zone', label: 'Red Zone Usage' },
                    { id: 'draft_assistant', label: 'Draft Assistant' },
                    { id: 'bye_weeks', label: 'NFL Bye Weeks' },
                    { id: 'depth_charts', label: 'NFL Depth Charts' },
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
        {activeId === 'adp_2qb' && <TwoQbAdpTab />}
        {activeId === 'bye_weeks' && <ByeWeeksTab />}
        {activeId === 'depth_charts' && <DepthChartsTab />}
        {activeId === 'opportunities' && (session ? <OpportunitiesTab /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'fantasy_points' && (session ? <FantasyDataTab title="Fantasy Points" table="fantasy_points" scoringCols={FP_SCORING_COLS} /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'fantasy_ppg' && (session ? <FantasyDataTab title="Fantasy Points Per Game" table="fantasy_ppg" scoringCols={FP_SCORING_COLS} /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'red_zone' && (session ? <RedZoneTab /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}
        {activeId === 'draft_assistant' && (session ? <DraftAssistantTab userId={session.user.id} /> : <LoginPrompt onSignIn={() => setShowAuth(true)} />)}

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

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--card-border)', marginTop: '2.5rem', paddingTop: '1rem', paddingBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Game Day Blueprint. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowPrivacy(true)}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* Privacy Policy Modal */}
        {showPrivacy && (
          <div className="auth-overlay" onClick={() => setShowPrivacy(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(26,31,46,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Privacy Policy</h2>
                <button className="auth-close" onClick={() => setShowPrivacy(false)}>✕</button>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>1. Information We Collect</h3>
                <p>When you create an account on Game Day Blueprint, we collect your email address and a password (stored securely in encrypted form). We do not collect your name, address, phone number, or payment information.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>2. How We Use Your Information</h3>
                <p>Your email address is used solely to create and manage your account and to allow you to sign in to Game Day Blueprint. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>3. Data Storage</h3>
                <p>Your account data is stored securely using Supabase, a third-party authentication and database service. Supabase employs industry-standard encryption and security practices. You can review Supabase's privacy practices at supabase.com.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>4. Cookies & Tracking</h3>
                <p>Game Day Blueprint uses session tokens to keep you signed in. We do not use advertising cookies or track your behavior for marketing purposes.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>5. Sports Betting Disclaimer</h3>
                <p>Game Day Blueprint provides sports odds and fantasy football data for informational purposes only. We do not facilitate gambling transactions. Sports betting laws vary by jurisdiction — please ensure betting is legal in your location before using any sportsbook. If you or someone you know has a gambling problem, call 1-800-GAMBLER for help.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>6. Your Rights</h3>
                <p>You may request deletion of your account and associated data at any time by contacting us. Upon request, we will permanently delete your account information from our systems.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>7. Changes to This Policy</h3>
                <p>We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated date. Continued use of Game Day Blueprint after changes constitutes acceptance of the updated policy.</p>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', marginTop: '1rem' }}>8. Contact</h3>
                <p>If you have any questions about this Privacy Policy, please reach out through the Game Day Blueprint website.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
