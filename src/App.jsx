import React, { useState, useEffect } from 'react';

const BOOKS = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'];
const BOOK_SHORT = { DraftKings: 'DK', FanDuel: 'FD', BetMGM: 'MGM', Caesars: 'CZR' };

const GAMES = [
  {
    id: 'g1',
    kickoff: 'Sun · 1:00 PM ET',
    away: { name: 'Kansas City Chiefs', abbr: 'KC', color: '#E31837' },
    home: { name: 'Buffalo Bills', abbr: 'BUF', color: '#00338D' },
    spread: {
      away: {
        DraftKings: { line: 3, price: -108 }, FanDuel: { line: 2.5, price: -112 },
        BetMGM: { line: 3, price: -105 }, Caesars: { line: 2.5, price: -110 },
      },
      home: {
        DraftKings: { line: -3, price: -112 }, FanDuel: { line: -2.5, price: -108 },
        BetMGM: { line: -3, price: -115 }, Caesars: { line: -2.5, price: -110 },
      },
    },
    total: {
      over: {
        DraftKings: { line: 47.5, price: -110 }, FanDuel: { line: 47, price: -105 },
        BetMGM: { line: 47.5, price: -115 }, Caesars: { line: 48, price: -110 },
      },
      under: {
        DraftKings: { line: 47.5, price: -110 }, FanDuel: { line: 47, price: -115 },
        BetMGM: { line: 47.5, price: -105 }, Caesars: { line: 48, price: -110 },
      },
    },
    ml: {
      away: { DraftKings: 135, FanDuel: 130, BetMGM: 140, Caesars: 138 },
      home: { DraftKings: -160, FanDuel: -155, BetMGM: -165, Caesars: -162 },
    },
    props: [
      {
        player: 'Patrick Mahomes', team: 'KC', market: 'Pass Yds',
        over: {
          DraftKings: { line: 275.5, price: -110 }, FanDuel: { line: 276.5, price: -115 },
          BetMGM: { line: 275.5, price: -105 }, Caesars: { line: 274.5, price: -110 },
        },
        under: {
          DraftKings: { line: 275.5, price: -110 }, FanDuel: { line: 276.5, price: -105 },
          BetMGM: { line: 275.5, price: -115 }, Caesars: { line: 274.5, price: -110 },
        },
      },
      {
        player: 'Josh Allen', team: 'BUF', market: 'Pass Yds',
        over: {
          DraftKings: { line: 248.5, price: -115 }, FanDuel: { line: 247.5, price: -110 },
          BetMGM: { line: 248.5, price: -105 }, Caesars: { line: 249.5, price: -110 },
        },
        under: {
          DraftKings: { line: 248.5, price: -105 }, FanDuel: { line: 247.5, price: -110 },
          BetMGM: { line: 248.5, price: -115 }, Caesars: { line: 249.5, price: -110 },
        },
      },
    ],
  },
  {
    id: 'g2',
    kickoff: 'Sun · 4:25 PM ET',
    away: { name: 'Dallas Cowboys', abbr: 'DAL', color: '#003594' },
    home: { name: 'Philadelphia Eagles', abbr: 'PHI', color: '#004C54' },
    spread: {
      away: {
        DraftKings: { line: 1.5, price: -110 }, FanDuel: { line: 1.5, price: -108 },
        BetMGM: { line: 2, price: -112 }, Caesars: { line: 1.5, price: -105 },
      },
      home: {
        DraftKings: { line: -1.5, price: -110 }, FanDuel: { line: -1.5, price: -112 },
        BetMGM: { line: -2, price: -108 }, Caesars: { line: -1.5, price: -115 },
      },
    },
    total: {
      over: {
        DraftKings: { line: 49.5, price: -108 }, FanDuel: { line: 50, price: -110 },
        BetMGM: { line: 49.5, price: -105 }, Caesars: { line: 49.5, price: -110 },
      },
      under: {
        DraftKings: { line: 49.5, price: -112 }, FanDuel: { line: 50, price: -110 },
        BetMGM: { line: 49.5, price: -115 }, Caesars: { line: 49.5, price: -110 },
      },
    },
    ml: {
      away: { DraftKings: 105, FanDuel: 100, BetMGM: 110, Caesars: 102 },
      home: { DraftKings: -125, FanDuel: -120, BetMGM: -130, Caesars: -122 },
    },
    props: [
      {
        player: 'CeeDee Lamb', team: 'DAL', market: 'Rec Yds',
        over: {
          DraftKings: { line: 84.5, price: -110 }, FanDuel: { line: 85.5, price: -110 },
          BetMGM: { line: 84.5, price: -115 }, Caesars: { line: 83.5, price: -110 },
        },
        under: {
          DraftKings: { line: 84.5, price: -110 }, FanDuel: { line: 85.5, price: -110 },
          BetMGM: { line: 84.5, price: -105 }, Caesars: { line: 83.5, price: -110 },
        },
      },
      {
        player: 'A.J. Brown', team: 'PHI', market: 'Rec Yds',
        over: {
          DraftKings: { line: 71.5, price: -105 }, FanDuel: { line: 72.5, price: -110 },
          BetMGM: { line: 71.5, price: -115 }, Caesars: { line: 71.5, price: -110 },
        },
        under: {
          DraftKings: { line: 71.5, price: -115 }, FanDuel: { line: 72.5, price: -110 },
          BetMGM: { line: 71.5, price: -105 }, Caesars: { line: 71.5, price: -110 },
        },
      },
    ],
  },
  {
    id: 'g3',
    kickoff: 'Sun · 4:25 PM ET',
    away: { name: 'San Francisco 49ers', abbr: 'SF', color: '#AA0000' },
    home: { name: 'Seattle Seahawks', abbr: 'SEA', color: '#69BE28' },
    spread: {
      away: {
        DraftKings: { line: -1, price: -110 }, FanDuel: { line: -1.5, price: -105 },
        BetMGM: { line: -1, price: -115 }, Caesars: { line: -1, price: -108 },
      },
      home: {
        DraftKings: { line: 1, price: -110 }, FanDuel: { line: 1.5, price: -115 },
        BetMGM: { line: 1, price: -105 }, Caesars: { line: 1, price: -112 },
      },
    },
    total: {
      over: {
        DraftKings: { line: 44, price: -110 }, FanDuel: { line: 43.5, price: -108 },
        BetMGM: { line: 44, price: -110 }, Caesars: { line: 44, price: -105 },
      },
      under: {
        DraftKings: { line: 44, price: -110 }, FanDuel: { line: 43.5, price: -112 },
        BetMGM: { line: 44, price: -110 }, Caesars: { line: 44, price: -115 },
      },
    },
    ml: {
      away: { DraftKings: -118, FanDuel: -125, BetMGM: -115, Caesars: -120 },
      home: { DraftKings: -102, FanDuel: 105, BetMGM: -105, Caesars: 100 },
    },
    props: [
      {
        player: 'Christian McCaffrey', team: 'SF', market: 'Rush Yds',
        over: {
          DraftKings: { line: 94.5, price: -110 }, FanDuel: { line: 95.5, price: -115 },
          BetMGM: { line: 94.5, price: -105 }, Caesars: { line: 93.5, price: -110 },
        },
        under: {
          DraftKings: { line: 94.5, price: -110 }, FanDuel: { line: 95.5, price: -105 },
          BetMGM: { line: 94.5, price: -115 }, Caesars: { line: 93.5, price: -110 },
        },
      },
      {
        player: 'Kenneth Walker III', team: 'SEA', market: 'Rush Yds',
        over: {
          DraftKings: { line: 58.5, price: -110 }, FanDuel: { line: 57.5, price: -110 },
          BetMGM: { line: 58.5, price: -105 }, Caesars: { line: 59.5, price: -115 },
        },
        under: {
          DraftKings: { line: 58.5, price: -110 }, FanDuel: { line: 57.5, price: -110 },
          BetMGM: { line: 58.5, price: -115 }, Caesars: { line: 59.5, price: -105 },
        },
      },
    ],
  },
  {
    id: 'g4',
    kickoff: 'Sun · 8:20 PM ET',
    away: { name: 'Detroit Lions', abbr: 'DET', color: '#0076B6' },
    home: { name: 'Green Bay Packers', abbr: 'GB', color: '#FFB612' },
    spread: {
      away: {
        DraftKings: { line: -2.5, price: -108 }, FanDuel: { line: -2.5, price: -112 },
        BetMGM: { line: -3, price: -110 }, Caesars: { line: -2.5, price: -105 },
      },
      home: {
        DraftKings: { line: 2.5, price: -112 }, FanDuel: { line: 2.5, price: -108 },
        BetMGM: { line: 3, price: -110 }, Caesars: { line: 2.5, price: -115 },
      },
    },
    total: {
      over: {
        DraftKings: { line: 46.5, price: -105 }, FanDuel: { line: 46, price: -110 },
        BetMGM: { line: 46.5, price: -110 }, Caesars: { line: 46.5, price: -108 },
      },
      under: {
        DraftKings: { line: 46.5, price: -115 }, FanDuel: { line: 46, price: -110 },
        BetMGM: { line: 46.5, price: -110 }, Caesars: { line: 46.5, price: -112 },
      },
    },
    ml: {
      away: { DraftKings: -145, FanDuel: -140, BetMGM: -150, Caesars: -142 },
      home: { DraftKings: 125, FanDuel: 120, BetMGM: 130, Caesars: 122 },
    },
    props: [
      {
        player: 'Amon-Ra St. Brown', team: 'DET', market: 'Rec Yds',
        over: {
          DraftKings: { line: 76.5, price: -110 }, FanDuel: { line: 77.5, price: -105 },
          BetMGM: { line: 76.5, price: -115 }, Caesars: { line: 76.5, price: -110 },
        },
        under: {
          DraftKings: { line: 76.5, price: -110 }, FanDuel: { line: 77.5, price: -115 },
          BetMGM: { line: 76.5, price: -105 }, Caesars: { line: 76.5, price: -110 },
        },
      },
      {
        player: 'Jordan Love', team: 'GB', market: 'Pass Yds',
        over: {
          DraftKings: { line: 232.5, price: -105 }, FanDuel: { line: 233.5, price: -110 },
          BetMGM: { line: 232.5, price: -115 }, Caesars: { line: 231.5, price: -110 },
        },
        under: {
          DraftKings: { line: 232.5, price: -115 }, FanDuel: { line: 233.5, price: -110 },
          BetMGM: { line: 232.5, price: -105 }, Caesars: { line: 231.5, price: -110 },
        },
      },
    ],
  },
  {
    id: 'g5',
    kickoff: 'Mon · 8:15 PM ET',
    away: { name: 'Miami Dolphins', abbr: 'MIA', color: '#008E97' },
    home: { name: 'New York Jets', abbr: 'NYJ', color: '#125740' },
    spread: {
      away: {
        DraftKings: { line: -3.5, price: -110 }, FanDuel: { line: -3, price: -115 },
        BetMGM: { line: -3.5, price: -105 }, Caesars: { line: -3.5, price: -112 },
      },
      home: {
        DraftKings: { line: 3.5, price: -110 }, FanDuel: { line: 3, price: -105 },
        BetMGM: { line: 3.5, price: -115 }, Caesars: { line: 3.5, price: -108 },
      },
    },
    total: {
      over: {
        DraftKings: { line: 42.5, price: -110 }, FanDuel: { line: 42, price: -110 },
        BetMGM: { line: 42.5, price: -105 }, Caesars: { line: 42.5, price: -108 },
      },
      under: {
        DraftKings: { line: 42.5, price: -110 }, FanDuel: { line: 42, price: -110 },
        BetMGM: { line: 42.5, price: -115 }, Caesars: { line: 42.5, price: -112 },
      },
    },
    ml: {
      away: { DraftKings: -180, FanDuel: -175, BetMGM: -190, Caesars: -178 },
      home: { DraftKings: 155, FanDuel: 150, BetMGM: 162, Caesars: 152 },
    },
    props: [
      {
        player: 'Tyreek Hill', team: 'MIA', market: 'Rec Yds',
        over: {
          DraftKings: { line: 88.5, price: -110 }, FanDuel: { line: 89.5, price: -110 },
          BetMGM: { line: 88.5, price: -105 }, Caesars: { line: 87.5, price: -110 },
        },
        under: {
          DraftKings: { line: 88.5, price: -110 }, FanDuel: { line: 89.5, price: -110 },
          BetMGM: { line: 88.5, price: -115 }, Caesars: { line: 87.5, price: -110 },
        },
      },
      {
        player: 'Breece Hall', team: 'NYJ', market: 'Rush Yds',
        over: {
          DraftKings: { line: 64.5, price: -115 }, FanDuel: { line: 65.5, price: -110 },
          BetMGM: { line: 64.5, price: -105 }, Caesars: { line: 63.5, price: -110 },
        },
        under: {
          DraftKings: { line: 64.5, price: -105 }, FanDuel: { line: 65.5, price: -110 },
          BetMGM: { line: 64.5, price: -115 }, Caesars: { line: 63.5, price: -110 },
        },
      },
    ],
  },
];

function fmtPrice(p) {
  return p > 0 ? `+${p}` : `${p}`;
}

function fmtLine(l) {
  if (l === 0) return 'PK';
  return l > 0 ? `+${l}` : `${l}`;
}

// Best price = max() works for American odds regardless of sign.
function bestPriceBook(row) {
  return BOOKS.reduce((best, b) => (row[b].price > row[best].price ? b : best), BOOKS[0]);
}

// Best line: for spreads, higher line favors the bettor on both sides.
// For totals: lower line favors the over, higher line favors the under.
function bestLineBook(row, mode) {
  return BOOKS.reduce((best, b) => {
    if (mode === 'min') return row[b].line < row[best].line ? b : best;
    return row[b].line > row[best].line ? b : best;
  }, BOOKS[0]);
}

function bestMLBook(row) {
  return BOOKS.reduce((best, b) => (row[b] > row[best] ? b : best), BOOKS[0]);
}

// Collects the "best price" book across every market for a game —
// spread/total/moneyline plus all player props — for tallying purposes.
function getGameBestBooks(game) {
  const bests = [
    bestPriceBook(game.spread.away),
    bestPriceBook(game.spread.home),
    bestPriceBook(game.total.over),
    bestPriceBook(game.total.under),
    bestMLBook(game.ml.away),
    bestMLBook(game.ml.home),
  ];
  game.props.forEach((p) => {
    bests.push(bestPriceBook(p.over));
    bests.push(bestPriceBook(p.under));
  });
  return bests;
}

function tallyBooks(bookList) {
  const tally = {};
  BOOKS.forEach((b) => (tally[b] = 0));
  bookList.forEach((b) => tally[b]++);
  return tally;
}

function OddsCell({ price, line, isBestPrice, isBestLine }) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-2 px-1 rounded transition-colors ${
        isBestPrice ? 'odds-best' : ''
      }`}
    >
      {line !== undefined && (
        <span className={`text-xs leading-none mb-0.5 ${isBestLine ? 'line-best' : 'line-muted'}`}>
          {fmtLine(line)}
        </span>
      )}
      <span className="font-mono text-sm leading-none">{fmtPrice(price)}</span>
    </div>
  );
}

function GameCard({ game }) {
  const cols = `140px repeat(${BOOKS.length}, 1fr)`;

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

  // Tally which book has the most "best" cells for this game.
  const tally = tallyBooks(getGameBestBooks(game));
  const topBook = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

  return (
    <div className="board-card rounded-lg overflow-hidden mb-5">
      <div className="flex items-center justify-between px-4 py-3 board-card-header">
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
        <div className="text-right">
          <div className="text-xs kickoff-text font-mono tracking-wide">{game.kickoff}</div>
          <div className="text-xs mt-2 best-book-badge">
            Best value: <span className="font-mono">{topBook}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '520px' }}>
          {/* Column header */}
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="px-3 py-2 text-xs label-text">Market</div>
            {BOOKS.map((b) => (
              <div key={b} className="px-1 py-2 text-center text-xs font-mono book-header">
                {BOOK_SHORT[b]}
              </div>
            ))}
          </div>

          {/* Spread */}
          <RowGroup label="Spread" />
          <Row
            sideLabel={game.away.abbr}
            row={game.spread.away}
            bestPrice={spreadAwayBest}
            bestLine={spreadAwayLineBest}
            cols={cols}
            withLine
          />
          <Row
            sideLabel={game.home.abbr}
            row={game.spread.home}
            bestPrice={spreadHomeBest}
            bestLine={spreadHomeLineBest}
            cols={cols}
            withLine
          />

          {/* Total */}
          <RowGroup label="Total" />
          <Row
            sideLabel="Over"
            row={game.total.over}
            bestPrice={totalOverBest}
            bestLine={totalOverLineBest}
            cols={cols}
            withLine
            linePrefix="o"
          />
          <Row
            sideLabel="Under"
            row={game.total.under}
            bestPrice={totalUnderBest}
            bestLine={totalUnderLineBest}
            cols={cols}
            withLine
            linePrefix="u"
          />

          {/* Moneyline */}
          <RowGroup label="Moneyline" />
          <MoneylineRow sideLabel={game.away.abbr} row={game.ml.away} best={mlAwayBest} cols={cols} />
          <MoneylineRow sideLabel={game.home.abbr} row={game.ml.home} best={mlHomeBest} cols={cols} />

          {/* Player Props */}
          <RowGroup label="Player Props" />
          {game.props.map((p) => (
            <React.Fragment key={p.player}>
              <div className="px-3 py-1 text-xs prop-label border-row">
                <span className="font-display">{p.player}</span>{' '}
                <span className="kickoff-text">
                  ({p.team}) &middot; {p.market}
                </span>
              </div>
              <Row
                sideLabel="Over"
                row={p.over}
                bestPrice={bestPriceBook(p.over)}
                bestLine={bestLineBook(p.over, 'min')}
                cols={cols}
                withLine
                linePrefix="o"
              />
              <Row
                sideLabel="Under"
                row={p.under}
                bestPrice={bestPriceBook(p.under)}
                bestLine={bestLineBook(p.under, 'max')}
                cols={cols}
                withLine
                linePrefix="u"
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function Leaderboard() {
  const tally = {};
  BOOKS.forEach((b) => (tally[b] = 0));
  let total = 0;

  GAMES.forEach((g) => {
    getGameBestBooks(g).forEach((b) => {
      tally[b]++;
      total++;
    });
  });

  const ranked = BOOKS.map((b) => ({ book: b, count: tally[b] }))
    .sort((a, b) => b.count - a.count);
  const max = ranked[0].count;

  return (
    <div className="board-card rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h2 className="font-display text-sm tracking-widest uppercase label-text">
          Best Book Overall
        </h2>
        <span className="text-xs kickoff-text">
          {total} markets across {GAMES.length} games &mdash; spreads, totals, moneylines &amp; props
        </span>
      </div>
      <div className="space-y-2">
        {ranked.map((r, i) => (
          <div key={r.book} className="flex items-center gap-3">
            <div className="w-24 font-mono text-sm side-label">
              {i === 0 && <span style={{ color: 'var(--amber-text)' }}>&#9733; </span>}
              {r.book}
            </div>
            <div className="flex-1 leaderboard-track rounded">
              <div
                className={`leaderboard-bar rounded ${i === 0 ? 'leaderboard-bar-top' : ''}`}
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

function RowGroup({ label }) {
  return (
    <div className="px-3 py-1 text-xs uppercase tracking-widest row-group-label">{label}</div>
  );
}

function Row({ sideLabel, row, bestPrice, bestLine, cols, withLine, linePrefix }) {
  return (
    <div className="grid items-center border-row" style={{ gridTemplateColumns: cols }}>
      <div className="px-3 py-1 text-sm font-mono side-label">{sideLabel}</div>
      {BOOKS.map((b) => {
        const display = linePrefix ? `${linePrefix}${row[b].line}` : fmtLine(row[b].line);
        return (
          <OddsCell
            key={b}
            price={row[b].price}
            line={withLine ? display : undefined}
            isBestPrice={b === bestPrice}
            isBestLine={b === bestLine}
          />
        );
      })}
    </div>
  );
}

function MoneylineRow({ sideLabel, row, best, cols }) {
  return (
    <div className="grid items-center border-row" style={{ gridTemplateColumns: cols }}>
      <div className="px-3 py-1 text-sm font-mono side-label">{sideLabel}</div>
      {BOOKS.map((b) => (
        <div
          key={b}
          className={`flex items-center justify-center py-2 px-1 rounded font-mono text-sm ${
            b === best ? 'odds-best' : ''
          }`}
        >
          {fmtPrice(row[b])}
        </div>
      ))}
    </div>
  );
}

export default function NFLOddsBoard() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="board-root min-h-screen px-4 py-6 sm:px-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

        .board-root {
          --board-bg: #0F1612;
          --card-bg: #182019;
          --card-header-bg: #1D2820;
          --card-border: #2C3A30;
          --row-border: #232E27;
          --text-primary: #EDE8DC;
          --text-muted: #8FA092;
          --amber: #FFB627;
          --amber-soft: rgba(255, 182, 39, 0.16);
          --amber-text: #FFD27A;
          background: var(--board-bg);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        .board-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
        }
        .board-card-header {
          background: var(--card-header-bg);
          border-bottom: 1px solid var(--card-border);
        }
        .team-stripe {
          display: inline-block;
          width: 4px;
          height: 16px;
          border-radius: 1px;
        }
        .kickoff-text { color: var(--text-muted); }
        .label-text { color: var(--text-muted); }
        .book-header { color: var(--text-muted); letter-spacing: 0.05em; }
        .row-group-label {
          color: var(--text-muted);
          background: rgba(255,255,255,0.02);
          letter-spacing: 0.15em;
        }
        .border-row { border-top: 1px solid var(--row-border); }
        .side-label { color: var(--text-primary); }
        .line-muted { color: var(--text-muted); }
        .line-best { color: var(--amber-text); }
        .odds-best {
          background: var(--amber-soft);
          color: var(--amber-text);
          box-shadow: inset 0 0 0 1px rgba(255, 182, 39, 0.35);
        }
        .best-book-badge { color: var(--amber-text); }
        .prop-label { color: var(--text-primary); background: rgba(255,255,255,0.015); }

        .leaderboard-track {
          height: 10px;
          background: var(--row-border);
          overflow: hidden;
        }
        .leaderboard-bar {
          height: 100%;
          background: var(--text-muted);
          opacity: 0.45;
        }
        .leaderboard-bar-top {
          background: var(--amber);
          opacity: 1;
        }

        .live-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--amber);
          animation: pulse 1.6s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl tracking-widest uppercase">NFL Odds Board</h1>
          <div className="flex items-center gap-2 font-mono text-xs kickoff-text">
            <span className="live-dot" />
            synced {mm}:{ss} ago
          </div>
        </div>
        <p className="text-sm kickoff-text mb-6">
          Comparing spreads, totals, moneylines &amp; player props across {BOOKS.join(', ')}.{' '}
          <span style={{ color: 'var(--amber-text)' }}>Amber</span> marks the best price for each
          line; the small amber number marks the best point spread, total, or prop line.
        </p>

        <Leaderboard />

        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}

        <p className="text-xs kickoff-text mt-6 text-center">
          Placeholder data — shaped to match The Odds API response format for an easy live swap.
        </p>
      </div>
    </div>
  );
}
