import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  Flag,
  Goal,
  Home,
  Landmark,
  Radio,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Sprout,
  Target,
  Trophy,
  Upload,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  advanceMatch,
  advanceWeek,
  attributes,
  chooseEvent,
  potentialStars,
  club,
  homeFixture,
  loanIn,
  negotiate,
  newGame,
  renewContract,
  opponent,
  setTactics,
  setTraining,
  sellPlayer,
  standings,
  startMatch,
  toggleStarter,
  upgradeFacility,
} from './game.ts';
import type {
  Club,
  Formation,
  GameState,
  Mentality,
  Player,
  Press,
  Tab,
  Tempo,
  Training,
} from './game.ts';
import { TransferMarket } from './Market.tsx';
import { LEAGUES, WORLD, league as leagueDef, leagueName } from './world.ts';
import { WorldPanel } from './World.tsx';
import { CupPanel } from './Cup.tsx';
import { BoardRoom, SackedModal } from './Board.tsx';
import { askingPrice } from './game.ts';
import { decodeSave, encodeSave, loadSave, storeSave } from './save.ts';

const money = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(2)}m` : `£${Math.round(n)}k`;
const ordinal = (n: number) =>
  `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const nav = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'squad', label: 'Squad', icon: Users },
  { id: 'tactics', label: 'Tactics', icon: Settings2 },
  { id: 'recruitment', label: 'Recruitment', icon: Search },
  { id: 'club', label: 'Club', icon: Landmark },
] as const;
function Crest({
  team,
  small = false,
}: {
  team: Pick<Club, 'color' | 'short'>;
  small?: boolean;
}) {
  return (
    <span
      className={`crest ${small ? 'small' : ''}`}
      style={{ '--crest': team.color } as React.CSSProperties}
    >
      <Shield />
      <b>{team.short.slice(0, 1)}</b>
    </span>
  );
}
function Meter({ value, color = 'lime' }: { value: number; color?: string }) {
  return (
    <span className={`meter ${color}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}
function Form({ values }: { values: string[] }) {
  return (
    <span className="form">
      {values.length ? (
        values.map((v, i) => (
          <i className={v} key={i}>
            {v}
          </i>
        ))
      ) : (
        <span className="muted">New season</span>
      )}
    </span>
  );
}
function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Pitch({
  players,
  compact = false,
}: {
  players: Player[];
  compact?: boolean;
}) {
  return (
    <div className={`pitch ${compact ? 'compact' : ''}`}>
      <div className="pitch-outline">
        <span className="centre-line" />
        <span className="centre-circle" />
        <span className="box top" />
        <span className="box bottom" />
      </div>
      <div className="pitch-players">
        {(['FW', 'MF', 'DF', 'GK'] as const).map((pos) => (
          <div className={`pitch-row ${pos}`} key={pos}>
            {players
              .filter((p) => p.starting && p.position === pos)
              .map((p, i) => (
                <div className="pitch-player" key={p.id}>
                  <span>
                    {pos === 'GK'
                      ? 1
                      : pos === 'DF'
                        ? 2 + i
                        : pos === 'MF'
                          ? 6 + i
                          : 9 + i}
                  </span>
                  <b>{p.name.split(' ').slice(-1)}</b>
                  <small>{p.rating}</small>
                </div>
              ))}
          </div>
        ))}
      </div>
      <span className="pitch-caption">YOUR STARTING XI</span>
    </div>
  );
}

function Table({ state, full = false, division }: { state: GameState; full?: boolean; division?: number }) {
  const own = club(state);
  const teams = standings(state).filter((c) => c.division === (division ?? own.division));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>CLUB</th>
            <th>P</th>
            {full && (
              <>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GD</th>
              </>
            )}
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {teams.slice(0, full ? 10 : 5).map((c, i) => (
            <tr className={c.id === state.clubId ? 'your-club' : ''} key={c.id}>
              <td>
                <span
                  className={i < 2 ? 'promotion' : i > 7 ? 'relegation' : ''}
                >
                  {i + 1}
                </span>
              </td>
              <td>
                <Crest team={c} small />
                <span>{c.name}</span>
                {c.id === state.clubId && <small>YOU</small>}
              </td>
              <td>{c.played}</td>
              {full && (
                <>
                  <td>{c.wins}</td>
                  <td>{c.draws}</td>
                  <td>{c.losses}</td>
                  <td>
                    {c.gf - c.ga > 0 ? '+' : ''}
                    {c.gf - c.ga}
                  </td>
                </>
              )}
              <td>
                <b>{c.points}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ATTR_LABEL: Record<string, string> = {
  pace: 'PAC',
  shooting: 'SHO',
  passing: 'PAS',
  defending: 'DEF',
  stamina: 'STA',
  mental: 'MEN',
  goalkeeping: 'GK',
};
export function Stars({ p }: { p: Player }) {
  const n = potentialStars(p);
  return (
    <span className="stars" title={`Potential ${p.potential}`}>
      {'★'.repeat(Math.floor(n))}
      {n % 1 ? '½' : ''}
    </span>
  );
}
export function AttrGrid({ p }: { p: Player }) {
  const a = attributes(p);
  return (
    <div className="attr-grid">
      {Object.entries(a)
        .filter(([k]) => (p.position === 'GK') === (k === 'goalkeeping') || k === 'mental' || k === 'passing')
        .map(([k, v]) => (
          <span key={k}>
            {ATTR_LABEL[k]} <b>{v}</b>
          </span>
        ))}
    </div>
  );
}
function PlayerCard({
  player,
  onStart,
  onSell,
  onRenew,
  locked,
}: {
  player: Player;
  onStart: () => void;
  onSell?: () => void;
  onRenew?: () => void;
  locked: boolean;
}) {
  return (
    <div className={`player-card ${player.starting ? 'selected' : ''}`}>
      <div className="player-avatar" data-pos={player.position}>
        <span>
          {player.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </span>
        <small>{player.position}</small>
      </div>
      <div className="player-info">
        <h3>
          {player.name}
          {player.academyGraduate && <Sprout size={14} />}
        </h3>
        <p>
          {player.age} years · {player.position} · {money(player.wage)}/wk
          {player.injured ? ` · Injured ${player.injured}w` : ''}
        </p>
        <p>
          {player.personality} · <Stars p={player} /> ·{' '}
          {player.loan ? 'On loan' : `Contract ${player.contract ?? '?'}y`}
        </p>
        <AttrGrid p={player} />
        <div className="player-bars">
          <span>
            FIT <Meter value={player.fitness} />
          </span>
          <span>
            MOR <Meter value={player.morale} color="blue" />
          </span>
        </div>
      </div>
      <div className="rating">
        <b>{player.rating}</b>
        <small>OVR</small>
      </div>
      <div className="player-actions">
        {player.starting ? (
          <span className="xi-badge">
            <Check size={12} /> XI
          </span>
        ) : (
          <button
            className="mini"
            disabled={locked || !!player.injured}
            onClick={onStart}
          >
            Start
          </button>
        )}
        {onRenew && !player.loan && (player.contract ?? 9) <= 1 && (
          <button className="text-button" disabled={locked} onClick={onRenew}>
            Renew 3y
          </button>
        )}
        {onSell && !player.starting && (
          <button className="text-button" disabled={locked} onClick={onSell}>
            Sell {money(Math.round(player.price * 0.68))}
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState | null>(loadSave);
  const [tab, setTab] = useState<Tab>('home');
  const [chosen, setChosen] = useState('wrexham');
  const [pickLeague, setPickLeague] = useState(2);
  const [tableDiv, setTableDiv] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [help, setHelp] = useState(false);
  const [saveOk, setSaveOk] = useState(true);
  const [filter, setFilter] = useState('All');
  const [confirmReset, setConfirmReset] = useState(false);
  const [deal, setDeal] = useState<{
    id: string;
    fee: number;
    wage: number;
    years: number;
    instalments: boolean;
    swapId: string;
  } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    if (state) setSaveOk(storeSave(state));
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    container.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [tab, !!state?.match, state?.clubId]);
  const update = (next: GameState, message?: string) => {
    if (next === state) {
      if (message) setToast('That action is unavailable right now.');
      return;
    }
    setState(next);
    if (message) setToast(message);
  };
  const exportGame = () => {
    if (!state) return;
    const blob = new Blob([encodeSave(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `touchline-season-${state.season}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importGame = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > 2_000_000) {
      setToast('Save is too large. Please choose a Touchline JSON save.');
      return;
    }
    const parsed = decodeSave(await selected.text());
    if (parsed) {
      setState(parsed);
      setTab('home');
      setToast('Career imported. Welcome back, gaffer.');
    } else setToast('Invalid save. Your current career has been kept.');
    event.target.value = '';
  };
  const hiddenFile = (
    <input
      ref={file}
      type="file"
      accept=".json,application/json"
      className="file-input"
      aria-label="Import career save"
      onChange={importGame}
    />
  );
  if (!state) {
    return (
      <div className="welcome">
        <div className="welcome-brand">
          <Goal /> TOUCHLINE <span>CLUB ARCHITECT</span>
        </div>
        <div className="welcome-grid">
          <div className="welcome-copy">
            <span className="eyebrow">A CLUB. A TOWN. YOUR LEGACY.</span>
            <h1>
              The next great
              <br />
              football story
              <br />
              <em>starts with you.</em>
            </h1>
            <p>
              Build a squad. Find your identity. Turn a hopeful little club into
              a name they’ll remember.
            </p>
            <div className="welcome-features">
              <span>
                <Trophy /> 8 leagues · 152 clubs
              </span>
              <span>
                <Sprout /> Growing talent
              </span>
              <span>
                <Zap /> Matchday decisions
              </span>
            </div>
            <p className="fine">
              An original, single-player management game. No purchases. No
              accounts. Your career saves in this browser.
            </p>
          </div>
          <div className="club-select">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR FIRST CHAPTER</span>
                <h2>Choose your club</h2>
              </div>
              <span className="tag">SEASON 01</span>
            </div>
            <select className="league-select" value={pickLeague} onChange={(e) => setPickLeague(+e.target.value)}>
              {LEAGUES.map((l) => (
                <option key={l.division} value={l.division}>{l.flag} {l.name} · {l.country}</option>
              ))}
            </select>
            <div className="club-pick-list">
              {WORLD.filter((w) => w.division === pickLeague).map((c) => (
                <button className={`club-option ${chosen === c.id ? 'active' : ''}`} key={c.id} onClick={() => setChosen(c.id)}>
                  <Crest team={{ ...c, short: c.name.split(' ').slice(-1)[0]! }} />
                  <div>
                    <small>{c.rating >= 80 ? 'Title contender' : c.rating >= 72 ? 'Established side' : c.rating >= 66 ? 'Ambitious club' : 'Underdog story'}</small>
                    <h3>{c.name}</h3>
                    <p>Strength {c.rating}</p>
                  </div>
                  <span className="radio-check">{chosen === c.id && <Check size={14} />}</span>
                </button>
              ))}
            </div>
            <button
              className="primary wide"
              onClick={() => setState(newGame(Date.now() >>> 0, chosen))}
            >
              Take the manager’s seat <ArrowRight size={18} />
            </button>
            <button
              className="text-button import-start"
              onClick={() => file.current?.click()}
            >
              <Upload size={15} /> Continue from an exported save
            </button>
            {hiddenFile}
          </div>
        </div>
        <div className="welcome-footer">
          <span>EVERY SEASON, A DIFFERENT STORY.</span>
          <span>FICTIONAL WORLD · REAL DECISIONS</span>
        </div>
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    );
  }
  const team = club(state),
    opp = opponent(state),
    home = homeFixture(state),
    roster = state.players.filter((p) => p.clubId === state.clubId),
    starters = roster.filter((p) => p.starting),
    league = standings(state).filter((c) => c.division === team.division),
    rank = league.findIndex((c) => c.id === team.id) + 1;
  const average = (key: 'fitness' | 'morale' | 'rating') =>
    Math.round(starters.reduce((a, p) => a + p[key], 0) / 11);
  const locked = !!state.match;
  const seasonLabel = `${String(2026 + state.season).slice(2)}/${String(2027 + state.season).slice(2)}`;
  const matchAction = () => {
    if (!state.match) update(startMatch(state));
    else if (state.match.complete)
      update(advanceWeek(state), 'A new week. A fresh challenge.');
    else update(advanceMatch(state));
  };
  const actionLabel = !state.match
    ? 'Go to matchday'
    : state.match.complete
      ? 'Continue to next week'
      : state.match.minute === 45
        ? 'Start second half'
        : `Play next 15 minutes`;
  const TacticChoice = ({
    label,
    value,
    values,
    change,
  }: {
    label: string;
    value: string;
    values: readonly string[];
    change: (v: string) => void;
  }) => (
    <div className="tactic-control">
      <span>{label}</span>
      <div className="segmented">
        {values.map((v) => (
          <button
            key={v}
            disabled={!!state.match?.complete}
            className={value === v ? 'active' : ''}
            onClick={() => change(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab('home');
          }}
        >
          <Goal />
          <span>
            TOUCHLINE<small>CLUB ARCHITECT</small>
          </span>
        </a>
        <div className="side-club">
          <Crest team={team} />
          <div>
            <b>{team.name}</b>
            <span>Head coach</span>
          </div>
        </div>
        <span className="nav-caption">THE MANAGER’S OFFICE</span>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
              {label}
              {id === 'home' && state.inbox && !state.inbox.resolved && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <span className="live-dot" /> Career in progress{' '}
          <button aria-label="How to play" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
          </button>
          <small>
            Season {state.season} · {seasonLabel}
          </small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Goal size={23} />
            <b>TOUCHLINE</b>
          </div>
          <div className="breadcrumb">
            Manager’s office <ChevronRight size={13} />{' '}
            <b>{nav.find((n) => n.id === tab)?.label}</b>
          </div>
          <div className="topbar-right">
            <span className="saved">
              <span className={saveOk ? 'live-dot' : 'error-dot'} />
              {saveOk ? 'Autosaved' : 'Save unavailable'}
            </span>
            <button
              className="icon-button"
              aria-label="How to play"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
            <span className="manager-avatar">YOU</span>
          </div>
        </header>
        <main ref={container}>
          {!saveOk && (
            <div className="save-warning">
              Autosave is unavailable. Export your career from Club before
              closing the game.
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                SEASON {String(state.season).padStart(2, '0')} / MATCHWEEK{' '}
                {String(state.week + 1).padStart(2, '0')}
              </span>
              <h1>
                {state.match
                  ? 'Under the floodlights.'
                  : tab === 'home'
                    ? 'Welcome back, gaffer.'
                    : tab === 'squad'
                      ? 'The people behind the badge.'
                      : tab === 'tactics'
                        ? 'Give your football an identity.'
                        : tab === 'recruitment'
                          ? 'Find your next difference-maker.'
                          : 'Build beyond the next result.'}
              </h1>
              <p>
                {state.match
                  ? 'Every decision can change the next fifteen minutes.'
                  : tab === 'home'
                    ? `${team.name}. A new week. A chance to write the next chapter.`
                    : tab === 'squad'
                      ? 'Start a reserve to replace an injured teammate first, then the lowest-rated starter in the same position.'
                      : tab === 'tactics'
                        ? 'Balance risk, preparation and the strengths of the opposition.'
                        : tab === 'recruitment'
                          ? 'The market refreshes every three weeks. Keep an eye on your wage bill.'
                          : 'Keep the club healthy, develop tomorrow’s talent and protect your legacy.'}
              </p>
            </div>
            <div className="season-pill">
              <Flag size={15} />{' '}
              {leagueName(team.division)}
            </div>
          </div>
          {state.match ? (
            <div className="match-layout">
              <section className="match-centre card">
                <div className="match-status">
                  <span>
                    <Radio size={14} />{' '}
                    {state.match.complete
                      ? 'FULL-TIME'
                      : state.match.minute === 45
                        ? 'HALF-TIME'
                        : 'MATCHDAY LIVE'}
                  </span>
                  <b>{state.match.minute}′</b>
                </div>
                <div className="scoreboard">
                  <div>
                    <Crest team={team} />
                    <h3>{team.name}</h3>
                    <small>{home ? 'HOME' : 'AWAY'}</small>
                  </div>
                  <div className="score">
                    {state.match.us}
                    <span>:</span>
                    {state.match.them}
                  </div>
                  <div>
                    <Crest team={opp} />
                    <h3>{opp.name}</h3>
                    <small>{home ? 'AWAY' : 'HOME'}</small>
                  </div>
                </div>
                <div className="match-progress">
                  <i style={{ width: `${(state.match.minute / 90) * 100}%` }} />
                </div>
                <div className="xg-row">
                  <span>{state.match.xgUs.toFixed(2)}</span>
                  <small>EXPECTED GOALS</small>
                  <span>{state.match.xgThem.toFixed(2)}</span>
                </div>
                {state.match.complete ? (
                  <div className="ft-report">
                    <h3>
                      {state.match.us > state.match.them
                        ? 'Victory!'
                        : state.match.us < state.match.them
                          ? 'Defeat'
                          : 'All square'}
                    </h3>
                    <p className="ft-scorers">
                      {state.match.timeline
                        .filter((e) => e.kind === 'goal')
                        .map(
                          (e) =>
                            `${e.side === 'us' ? (roster.find((p) => p.id === e.playerId)?.name ?? team.short) : opp.short} ${e.minute}′`,
                        )
                        .join(' · ') || 'No goals'}
                    </p>
                    <div className="ft-ratings">
                      {starters
                        .slice()
                        .sort(
                          (a, b) =>
                            (state.match!.ratings?.[b.id] ?? 0) -
                            (state.match!.ratings?.[a.id] ?? 0),
                        )
                        .map((p) => (
                          <span
                            key={p.id}
                            className={p.id === state.match!.motm ? 'motm' : ''}
                          >
                            <small>{p.position}</small> {p.name}
                            <b>
                              {state.match!.motm === p.id && '★ '}
                              {state.match!.ratings?.[p.id]?.toFixed(1) ?? '-'}
                            </b>
                          </span>
                        ))}
                    </div>
                  </div>
                ) : (
                  <Pitch players={roster} compact />
                )}
                <div className="match-cta">
                  <button className="primary wide" onClick={matchAction}>
                    {actionLabel}
                    <ArrowRight size={18} />
                  </button>
                  <small>
                    {state.match.complete
                      ? 'Results, training and finances settle when you continue.'
                      : 'Your tactical changes affect the next passage of play.'}
                  </small>
                </div>
              </section>
              <div className="match-right">
                <section className="card live-tactics">
                  <SectionTitle
                    eyebrow="FROM THE TOUCHLINE"
                    title="Change the game"
                  />
                  <TacticChoice
                    label="Mentality"
                    value={state.tactics.mentality}
                    values={['cautious', 'balanced', 'attacking']}
                    change={(v) =>
                      update(setTactics(state, { mentality: v as Mentality }))
                    }
                  />
                  <TacticChoice
                    label="Pressing"
                    value={state.tactics.press}
                    values={['low', 'normal', 'high']}
                    change={(v) =>
                      update(setTactics(state, { press: v as Press }))
                    }
                  />
                  <p className="fine">
                    Attacking and high pressing create more chances but expose
                    your defence and drain energy.
                  </p>
                </section>
                <section className="card commentary">
                  <SectionTitle
                    eyebrow="THE MATCH STORY"
                    title="From the press box"
                  />
                  <div className="timeline" aria-live="polite">
                    {[...state.match.timeline].reverse().map((e, i) => (
                      <div
                        className={`timeline-event ${e.kind} ${e.side}`}
                        key={`${e.minute}-${i}`}
                      >
                        <b>{e.minute}′</b>
                        <div>
                          {e.kind === 'goal' && (
                            <strong>
                              <Goal size={15} /> GOAL
                            </strong>
                          )}
                          <p>{e.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <>
              {tab === 'home' && (
                <>
                  <div className="overview-grid">
                    <section className="fixture-hero">
                      <div className="fixture-top">
                        <span className="eyebrow">
                          <span className="live-dot" /> THE NEXT CHAPTER
                        </span>
                        <span>LEAGUE · MATCHWEEK {state.week + 1}</span>
                      </div>
                      <h2>
                        Make your
                        <br />
                        <em>mark.</em>
                      </h2>
                      <div className="fixture-teams">
                        <div>
                          <Crest team={team} />
                          <b>{team.name}</b>
                          <small>{home ? 'HOME' : 'AWAY'}</small>
                        </div>
                        <span className="versus">VS</span>
                        <div>
                          <Crest team={opp} />
                          <b>{opp.name}</b>
                          <small>{home ? 'AWAY' : 'HOME'}</small>
                        </div>
                      </div>
                      <div className="hero-footer">
                        <span>
                          <Target size={14} /> Opponent: {opp.style} football
                        </span>
                        <button className="primary" onClick={matchAction}>
                          Go to matchday <ArrowRight size={17} />
                        </button>
                      </div>
                      <div className="hero-lines" aria-hidden="true" />
                    </section>
                    <section className="briefing card">
                      <div className="section-heading">
                        <span className="eyebrow">THE BIG PICTURE</span>
                        <span className="tag">{seasonLabel}</span>
                      </div>
                      <div className="position-stat">
                        <b>{ordinal(rank)}</b>
                        <span>
                          in the {leagueDef(team.division).name}
                          <br />
                          <strong>{team.points} points</strong> from{' '}
                          {team.played} matches
                        </span>
                      </div>
                      <div className="stat-separator" />
                      <div className="brief-stat">
                        <span>Recent form</span>
                        <Form values={team.form} />
                      </div>
                      <div className="brief-stat">
                        <span>Available funds</span>
                        <b>{money(state.budget)}</b>
                      </div>
                      <div className="brief-stat">
                        <span>Board confidence</span>
                        <b>{state.trust}%</b>
                      </div>
                      <Meter value={state.trust} />
                      <p className="fine">
                        {rank <= 2
                          ? 'The promotion places are in reach. Keep your momentum.'
                          : state.trust < 35
                            ? 'The board is losing patience. Results and financial discipline matter.'
                            : 'The board wants a stable club and progress up the table.'}
                      </p>
                    </section>
                  </div>
                  <div className="metrics">
                    <div>
                      <Users />
                      <span>
                        Squad quality
                        <b>
                          {average('rating')}
                          <small>/100</small>
                        </b>
                      </span>
                      <small>Starting eleven</small>
                    </div>
                    <div>
                      <Zap />
                      <span>
                        Match readiness
                        <b>
                          {average('fitness')}
                          <small>%</small>
                        </b>
                      </span>
                      <Meter value={average('fitness')} />
                    </div>
                    <div>
                      <Shield />
                      <span>
                        Dressing room
                        <b>
                          {average('morale')}
                          <small>%</small>
                        </b>
                      </span>
                      <Meter value={average('morale')} color="blue" />
                    </div>
                    <div>
                      <Flag />
                      <span>
                        Fan sentiment
                        <b>
                          {state.fans}
                          <small>%</small>
                        </b>
                      </span>
                      <Meter value={state.fans} color="orange" />
                    </div>
                  </div>
                  <div className="content-columns">
                    <section className="card inbox">
                      <SectionTitle
                        eyebrow="A MANAGER’S WORK IS NEVER DONE"
                        title="On your desk"
                        action={
                          <span className="notification">
                            <Bell size={16} />
                            {state.inbox?.resolved ? 'DONE' : '1 NEW'}
                          </span>
                        }
                      />
                      {state.inbox && (
                        <>
                          <span className="story-topic">
                            {state.inbox.id.toUpperCase()} · WEEK{' '}
                            {state.week + 1}
                          </span>
                          <h3>{state.inbox.title}</h3>
                          <p>{state.inbox.body}</p>
                          {state.inbox.resolved ? (
                            <div className="decision-result">
                              <Check size={18} />
                              <p>{state.inbox.outcome}</p>
                            </div>
                          ) : (
                            <div className="decision-buttons">
                              {state.inbox.options.map((text, i) => (
                                <button
                                  key={text}
                                  onClick={() =>
                                    update(
                                      chooseEvent(state, i as 0 | 1),
                                      'Decision made. The club moves forward.',
                                    )
                                  }
                                >
                                  {text}
                                  <ArrowUpRight size={16} />
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </section>
                    <section className="card">
                      <SectionTitle
                        eyebrow="THE RACE TAKES SHAPE"
                        title="League snapshot"
                        action={
                          <button
                            className="text-button"
                            onClick={() => setTab('club')}
                          >
                            Full table <ArrowRight size={14} />
                          </button>
                        }
                      />
                      <Table state={state} />
                      <p className="table-note">
                        <span className="live-dot" /> Top two go up · Bottom two
                        go down in the Premier League
                      </p>
                    </section>
                  </div>
                  <section className="news-strip">
                    <span className="eyebrow">AROUND THE CLUB</span>
                    {state.headlines.slice(0, 3).map((n, i) => (
                      <p key={i}>
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        {n}
                      </p>
                    ))}
                  </section>
                </>
              )}
              {tab === 'squad' && (
                <>
                  <div className="squad-banner">
                    <div>
                      <span className="eyebrow">
                        ONE BADGE. {roster.length} STORIES.
                      </span>
                      <h2>Your first team ({roster.length})</h2>
                      <p>
                        {starters.length} starters ·{' '}
                        {roster.filter((p) => p.injured).length} injuries ·{' '}
                        {money(roster.reduce((a, p) => a + p.wage, 0))} weekly
                        wages
                      </p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => setTab('tactics')}
                    >
                      Set your tactics <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="filter-row">
                    {['All', 'GK', 'DF', 'MF', 'FW'].map((v) => (
                      <button
                        className={filter === v ? 'active' : ''}
                        key={v}
                        onClick={() => setFilter(v)}
                      >
                        {v === 'All' ? 'All players' : v}
                      </button>
                    ))}
                  </div>
                  <div className="squad-grid">
                    {roster
                      .filter((p) => filter === 'All' || p.position === filter)
                      .sort(
                        (a, b) =>
                          Number(b.starting) - Number(a.starting) ||
                          b.rating - a.rating,
                      )
                      .map((p) => (
                        <PlayerCard
                          key={p.id}
                          player={p}
                          locked={locked}
                          onStart={() =>
                            update(
                              toggleStarter(state, p.id),
                              `${p.name} joins the starting eleven.`,
                            )
                          }
                          onRenew={() =>
                            update(
                              renewContract(state, p.id, 3),
                              `${p.name} signs a new deal.`,
                            )
                          }
                        />
                      ))}
                  </div>
                </>
              )}
              {tab === 'tactics' && (
                <div className="tactics-grid">
                  <section className="card tactics-pitch">
                    <SectionTitle
                      eyebrow="THE BLUEPRINT"
                      title={state.tactics.formation}
                      action={<span className="tag">STARTING XI</span>}
                    />
                    <Pitch players={roster} />
                    <p className="fine">
                      Shirt positions show the selected squad’s natural roles.
                      Change personnel in Squad.
                    </p>
                  </section>
                  <section className="card tactic-settings">
                    <SectionTitle
                      eyebrow="YOUR FOOTBALL, YOUR WAY"
                      title="Team instructions"
                    />
                    <TacticChoice
                      label="Formation"
                      value={state.tactics.formation}
                      values={['4-3-3', '4-4-2', '3-5-2']}
                      change={(v) =>
                        update(setTactics(state, { formation: v as Formation }))
                      }
                    />
                    <p className="control-hint">
                      4-3-3 stretches cautious teams. 3-5-2 helps against
                      attacking sides. 4-4-2 is solid against balanced
                      opponents.
                    </p>
                    <TacticChoice
                      label="Mentality"
                      value={state.tactics.mentality}
                      values={['cautious', 'balanced', 'attacking']}
                      change={(v) =>
                        update(setTactics(state, { mentality: v as Mentality }))
                      }
                    />
                    <TacticChoice
                      label="Pressing"
                      value={state.tactics.press}
                      values={['low', 'normal', 'high']}
                      change={(v) =>
                        update(setTactics(state, { press: v as Press }))
                      }
                    />
                    <TacticChoice
                      label="Tempo"
                      value={state.tactics.tempo}
                      values={['patient', 'normal', 'quick']}
                      change={(v) =>
                        update(setTactics(state, { tempo: v as Tempo }))
                      }
                    />
                    <div className="assistant-note">
                      <Sparkles size={20} />
                      <p>
                        <b>Assistant’s report</b>
                        {opp.name} favour {opp.style} football. Your squad is{' '}
                        {average('fitness') < 60
                          ? 'tired — protect their energy.'
                          : 'ready for the challenge.'}
                      </p>
                    </div>
                  </section>
                  <section className="card training-card">
                    <SectionTitle
                      eyebrow="WORK ON THE TRAINING GROUND"
                      title="This week’s focus"
                    />
                    <div className="training-options">
                      {(
                        [
                          {
                            id: 'balanced',
                            name: 'Balanced',
                            description:
                              'Steady recovery and youth development.',
                          },
                          {
                            id: 'fitness',
                            name: 'Recovery',
                            description:
                              'Restore fitness; less technical work.',
                          },
                          {
                            id: 'attack',
                            name: 'Attacking',
                            description:
                              'Develop forwards at the cost of energy.',
                          },
                          {
                            id: 'defence',
                            name: 'Defending',
                            description:
                              'Develop defenders at the cost of energy.',
                          },
                          {
                            id: 'bonding',
                            name: 'Team bonding',
                            description: 'Build morale and recover together.',
                          },
                        ] as {
                          id: Training;
                          name: string;
                          description: string;
                        }[]
                      ).map((t) => (
                        <button
                          key={t.id}
                          className={state.training === t.id ? 'active' : ''}
                          onClick={() => update(setTraining(state, t.id))}
                        >
                          <span>
                            {state.training === t.id ? (
                              <Check size={17} />
                            ) : (
                              <Target size={17} />
                            )}
                          </span>
                          <div>
                            <b>{t.name}</b>
                            <small>{t.description}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}
              {tab === 'recruitment' && (
                <>
                  <div className="recruitment-summary">
                    <div>
                      <Search size={25} />
                      <span>
                        Scouting network<b>Level {state.scouting}</b>
                      </span>
                    </div>
                    <div>
                      <Wallet size={25} />
                      <span>
                        Transfer funds<b>{money(state.budget)}</b>
                      </span>
                    </div>
                    <div>
                      <Users size={25} />
                      <span>
                        Squad spaces<b>{roster.length}/25</b>
                      </span>
                    </div>
                  </div>
                  <SectionTitle eyebrow="BUY · SELL · SCOUT" title="Transfer market" />
                  <TransferMarket
                    state={state}
                    locked={locked}
                    onUpdate={update}
                    onNegotiate={(p) =>
                      setDeal({
                        id: p.id,
                        fee: p.counter ?? Math.round(askingPrice(p) * 0.85),
                        wage: p.wage,
                        years: 3,
                        instalments: false,
                        swapId: '',
                      })
                    }
                  />
                  <SectionTitle
                    eyebrow="EYES ON THE FUTURE"
                    title="The shortlist"
                    action={
                      <span className="tag">
                        REFRESH IN {3 - (state.week % 3)} WEEKS
                      </span>
                    }
                  />
                  <div className="market-grid">
                    {state.market.map((p) => (
                      <article className="market-card card" key={p.id}>
                        <div className="market-top">
                          <span className="position-pill">{p.position}</span>
                          <span className="scouted">
                            <Check size={12} /> SCOUTED
                          </span>
                        </div>
                        <div className="market-player">
                          <div className="portrait">
                            {p.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                            <i />
                          </div>
                          <div>
                            <h3>{p.name}</h3>
                            <p>
                              {p.age} years · {p.position} · {p.personality}
                            </p>
                            <Stars p={p} />
                          </div>
                          <div className="rating">
                            <b>{p.rating}</b>
                            <small>OVR</small>
                          </div>
                        </div>
                        <AttrGrid p={p} />
                        <div className="market-stats">
                          <span>
                            Potential<b>{p.potential}</b>
                          </span>
                          <span>
                            Weekly wage<b>{money(p.wage)}</b>
                          </span>
                          <span>
                            Transfer fee<b>{money(p.price)}</b>
                          </span>
                        </div>
                        <div className="btn-row">
                          <button
                            className="secondary"
                            onClick={() =>
                              setDeal({
                                id: p.id,
                                fee: p.counter ?? Math.round(p.price * 0.85),
                                wage: p.wage,
                                years: 3,
                                instalments: false,
                                swapId: '',
                              })
                            }
                          >
                            Negotiate <ArrowUpRight size={16} />
                          </button>
                          <button
                            className="text-button"
                            disabled={
                              state.budget < Math.round(p.price * 0.15) ||
                              roster.length >= 25
                            }
                            onClick={() =>
                              update(loanIn(state, p.id), `${p.name} joins on loan.`)
                            }
                          >
                            Loan {money(Math.round(p.price * 0.15))}
                          </button>
                        </div>
                        {p.counter && (
                          <small className="muted">Asking: {money(p.counter)}</small>
                        )}
                      </article>
                    ))}
                  </div>
                  <section className="departures">
                    <SectionTitle
                      eyebrow="CREATE ROOM TO GROW"
                      title="Possible departures"
                    />
                    <p className="muted">
                      Reserve players can be sold for 68% of their listed value.
                      Keep at least 14 players.
                    </p>
                    <div className="squad-grid">
                      {roster
                        .filter((p) => !p.starting)
                        .map((p) => (
                          <PlayerCard
                            key={p.id}
                            player={p}
                            locked={locked || roster.length <= 14}
                            onStart={() => update(toggleStarter(state, p.id))}
                            onSell={() =>
                              update(
                                sellPlayer(state, p.id),
                                `${p.name} has left the club.`,
                              )
                            }
                          />
                        ))}
                    </div>
                  </section>
                </>
              )}
              {tab === 'club' && (
                <>
                  <BoardRoom state={state} onUpdate={update} />
                  <CupPanel state={state} />
                  <CupPanel state={state} euro />
                  <WorldPanel state={state} onUpdate={update} />
                  <div className="content-columns">
                    <section className="card club-foundation">
                      <SectionTitle
                        eyebrow="INVEST IN THE LONG GAME"
                        title="The club’s foundations"
                      />
                      {(['academy', 'scouting'] as const).map((type) => (
                        <div className="facility" key={type}>
                          <span className="facility-icon">
                            {type === 'academy' ? <Sprout /> : <Search />}
                          </span>
                          <div>
                            <h3>
                              {type === 'academy'
                                ? 'Youth academy'
                                : 'Scouting network'}{' '}
                              <small>LVL {state[type]}/5</small>
                            </h3>
                            <p>
                              {type === 'academy'
                                ? 'Stronger annual intakes and faster youth development.'
                                : 'Better players appear on your transfer shortlist.'}
                            </p>
                            <button
                              className="mini"
                              disabled={
                                state[type] >= 5 ||
                                state.budget <
                                  (type === 'academy'
                                    ? 350 + state.academy * 250
                                    : 240 + state.scouting * 180)
                              }
                              onClick={() =>
                                update(
                                  upgradeFacility(state, type),
                                  'The club is building for the future.',
                                )
                              }
                            >
                              {state[type] >= 5
                                ? 'Fully developed'
                                : `Upgrade · ${money(type === 'academy' ? 350 + state.academy * 250 : 240 + state.scouting * 180)}`}
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                    <section className="legacy-card">
                      <Trophy size={31} />
                      <span className="eyebrow">YOUR MANAGERIAL RECORD</span>
                      <h2>Leave a legacy.</h2>
                      <div>
                        <span>
                          <b>{state.careerGames}</b>matches
                        </span>
                        <span>
                          <b>{state.careerWins}</b>wins
                        </span>
                        <span>
                          <b>
                            {
                              state.history.filter(
                                (h) => h.outcome === 'Champions',
                              ).length
                            }
                          </b>
                          titles
                        </span>
                      </div>
                      <p>
                        {state.history[0]
                          ? `Last season: ${state.history[0].outcome}, ${ordinal(state.history[0].position)} place.`
                          : 'The first chapter is still being written.'}
                      </p>
                    </section>
                  </div>
                  <section className="card full-table">
                    <SectionTitle
                      eyebrow="EVERY POINT MATTERS"
                      title={leagueName(tableDiv ?? team.division)}
                      action={
                        <span className="tag">MATCHWEEK {state.week + 1}</span>
                      }
                    />
                    <select className="league-select" value={tableDiv ?? team.division} onChange={(e) => setTableDiv(+e.target.value)}>
                      {LEAGUES.filter((l) => state.clubs.some((c) => c.division === l.division)).map((l) => (
                        <option key={l.division} value={l.division}>{l.flag} {l.name} ({l.country})</option>
                      ))}
                    </select>
                    <Table state={state} full division={tableDiv ?? team.division} />
                    <p className="table-note">
                      England: top three of the Championship go up, bottom three of the Premier Division go down. Top finishers in the big leagues qualify for the Champions Cup. Points: 3 for a win, 1 for a draw.
                    </p>
                  </section>
                  {state.history.length > 0 && (
                    <section className="card history">
                      <SectionTitle
                        eyebrow="THE STORY SO FAR"
                        title="Season archive"
                      />
                      {state.history.map((h) => (
                        <div key={h.season}>
                          <b>Season {h.season}</b>
                          <span>
                            {leagueDef(h.division).name} ·{' '}
                            {ordinal(h.position)} · {h.points} pts
                          </span>
                          <strong>{h.outcome}</strong>
                        </div>
                      ))}
                    </section>
                  )}
                  <section className="card save-panel">
                    <div>
                      <span className="eyebrow">KEEP YOUR STORY SAFE</span>
                      <h2>Your career, everywhere.</h2>
                      <p>
                        Autosaved in this browser. Export a backup before
                        changing phones, clearing browser data or moving to
                        another game URL.
                      </p>
                    </div>
                    <div className="save-buttons">
                      <button className="secondary" onClick={exportGame}>
                        <Download size={16} /> Export save
                      </button>
                      <button
                        className="secondary"
                        onClick={() => file.current?.click()}
                      >
                        <Upload size={16} /> Import save
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() => setConfirmReset(true)}
                      >
                        New career
                      </button>
                    </div>
                  </section>
                  {hiddenFile}
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              TOUCHLINE <b>CLUB ARCHITECT</b>
            </span>
            <small>
              Fictional clubs. Your story. ·{' '}
              {saveOk
                ? 'Career autosaved'
                : 'Export your career to keep it safe'}
            </small>
          </footer>
        </main>
        <nav className="mobile-nav" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              <Icon size={21} />
              <span>{label === 'Recruitment' ? 'Scouting' : label}</span>
            </button>
          ))}
        </nav>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="How to play"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              aria-label="Close help"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <span className="eyebrow">WELCOME TO THE DUGOUT</span>
            <h2>One week. Big decisions.</h2>
            <p>
              Handle the story on your desk, set your lineup, choose training,
              then go to matchday. Play each 15-minute passage and change your
              approach when needed.
            </p>
            <ol>
              <li>
                <b>Build your team.</b> In Squad, start a reserve to replace a
                player in the same position.
              </li>
              <li>
                <b>Find a balance.</b> High pressing and quick play improve
                chance creation but cost energy. Attack leaves space behind you.
              </li>
              <li>
                <b>Think long term.</b> Recruit within your funds, sell
                reserves, improve facilities and develop youth. At least three
                academy players arrive every season.
              </li>
              <li>
                <b>Climb the pyramid.</b> Each season has 18 fixtures. The top
                two National League clubs go up; the bottom two Premier League
                clubs come down.
              </li>
              <li>
                <b>Keep your career.</b> Everything is saved here. Use Club →
                Export save for a backup.
              </li>
            </ol>
            <p className="fine">
              This is a seeded decision simulation with simplified opponents,
              not a 3D match engine. No time passes while the game is closed.
            </p>
            <button className="primary wide" onClick={() => setHelp(false)}>
              Back to the club <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
      <SackedModal state={state} onUpdate={update} onNewCareer={() => setConfirmReset(true)} />
      {deal && (() => {
        const t = state.market.find((p) => p.id === deal.id) ?? state.rivals?.find((p) => p.id === deal.id);
        if (!t) return null;
        const ask = askingPrice(t);
        return (
          <div className="modal-backdrop" onClick={() => setDeal(null)}>
            <section className="help-modal" role="dialog" aria-label="Negotiate" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" aria-label="Close" onClick={() => setDeal(null)}><X /></button>
              <span className="eyebrow">NEGOTIATION</span>
              <h2>{t.name}</h2>
              <p>
                {t.clubId === 'market' ? 'Free agent' : state.clubs.find((c) => c.id === t.clubId)?.name}{t.listed ? ' (listed)' : ''} · asking {money(ask)}{t.counter ? ` · they ask ${money(t.counter)}` : ''} · wants about {money(t.wage)}/wk · {t.personality}
              </p>
              <label className="deal-field">Fee offer: <b>{money(deal.fee)}</b>
                <input type="range" min={Math.round(ask * 0.5)} max={Math.round(ask * 1.3)} value={deal.fee} onChange={(e) => setDeal({ ...deal, fee: +e.target.value })} />
              </label>
              <label className="deal-field">Weekly wage: <b>{money(deal.wage)}</b>
                <input type="range" min={Math.max(1, Math.round(t.wage * 0.6))} max={Math.round(t.wage * 1.6) + 2} value={deal.wage} onChange={(e) => setDeal({ ...deal, wage: +e.target.value })} />
              </label>
              <label className="deal-field">Contract: <b>{deal.years} years</b>
                <input type="range" min={1} max={5} value={deal.years} onChange={(e) => setDeal({ ...deal, years: +e.target.value })} />
              </label>
              <label className="deal-check">
                <input type="checkbox" checked={deal.instalments} onChange={(e) => setDeal({ ...deal, instalments: e.target.checked })} /> Pay in instalments (40% now, rest over 6 weeks, +5% cost)
              </label>
              <label className="deal-field">Swap a reserve (counts 80% of value)
                <select value={deal.swapId} onChange={(e) => setDeal({ ...deal, swapId: e.target.value })}>
                  <option value="">No swap</option>
                  {roster.filter((p) => !p.starting).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.position} {p.rating}, {money(Math.round(p.price * 0.8))})</option>
                  ))}
                </select>
              </label>
              <button className="primary wide" onClick={() => {
                const [next, msg] = negotiate(state, deal.id, { ...deal, swapId: deal.swapId || undefined });
                if (next !== state) setState(next);
                setToast(msg);
                const still = next.market.find((p) => p.id === deal.id) ?? next.rivals?.find((p) => p.id === deal.id);
                if (!still) setDeal(null);
                else { const c = still.counter; if (c) setDeal({ ...deal, fee: c }); }
              }}>Submit offer <ArrowRight size={17} /></button>
            </section>
          </div>
        );
      })()}
      {confirmReset && (
        <div className="modal-backdrop">
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Start a new career"
          >
            <h2>A new chapter?</h2>
            <p>
              This replaces the career in this browser. Export a save first if
              you want to keep it.
            </p>
            <button className="secondary wide" onClick={exportGame}>
              <Download size={16} /> Export this career
            </button>
            <button
              className="primary wide"
              onClick={() => {
                setState(null);
                setTab('home');
                setConfirmReset(false);
              }}
            >
              Choose a new club
            </button>
            <button
              className="text-button wide"
              onClick={() => setConfirmReset(false)}
            >
              Keep playing
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
