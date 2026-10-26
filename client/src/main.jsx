import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, LayoutDashboard, MessageSquareText, LogOut, Search, Plus,
  ArrowUpRight, Clock3, CheckCircle2, AlertCircle, Send, RefreshCw,
  UserRound, Filter, FileText, ChevronRight, Sparkles, Paperclip,
  ShieldCheck, LibraryBig
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const CATS = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

async function request(path, { token, ...opts } = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    }
  });
  const d = await r.json().catch(() => ({
    error: 'Server returned an invalid response'
  }));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

const money = n =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(n);

const date = s =>
  s
    ? new Date(s).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—';

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bl-session'));
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState('overview');
  const [toast, setToast] = useState('');

  const notify = m => {
    setToast(m);
    setTimeout(() => setToast(''), 3200);
  };

  const logout = () => {
    localStorage.removeItem('bl-session');
    setSession(null);
    setPage('overview');
  };

  if (!session) {
    return (
      <Login
        onLogin={s => {
          localStorage.setItem('bl-session', JSON.stringify(s));
          setSession(s);
          setPage('overview');
        }}
      />
    );
  }

  return (
    <Shell
      session={session}
      page={page}
      setPage={setPage}
      logout={logout}
      notify={notify}
      toast={toast}
    />
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('priya.sharma@email.com');
  const [password, setPassword] = useState('Author123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      onLogin(
        await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-art">
        <div className="brand brand-light">
          <span className="brand-mark"><BookOpen size={21} /></span>
          <span>bookleaf<span className="brand-dot">.</span></span>
        </div>

        <div className="art-copy">
          <span className="eyebrow">AUTHOR CARE, REIMAGINED</span>
          <h1>Every story<br />deserves a voice.</h1>
          <p>
            Your publishing journey, book performance, and support—all in one
            thoughtful place.
          </p>
          <div className="book-stack">
            <div className="book b1"><span>STORIES<br />THAT STAY</span></div>
            <div className="book b2"><span>THE ART OF<br />BEGINNING</span></div>
            <div className="book b3"><span>WORDS<br />MATTER</span></div>
          </div>
        </div>

        <div className="art-foot">
          A little more clarity for every chapter.
        </div>
      </div>

      <div className="login-panel">
        <div className="login-inner">
          <span className="eyebrow muted">WELCOME TO BOOKLEAF</span>
          <h2>Sign in to your portal</h2>
          <p className="subtext">
            Access your books, royalties, and support conversations.
          </p>

          <form onSubmit={submit} className="login-form">
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button className="btn primary full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              <ArrowUpRight size={17} />
            </button>
          </form>

          <div className="demo-box">
            <div className="demo-title">
              <ShieldCheck size={16} /> Demo access
            </div>
            <button onClick={() => {
              setEmail('priya.sharma@email.com');
              setPassword('Author123!');
            }}>
              Author demo <span>priya.sharma@email.com</span>
            </button>
            <button onClick={() => {
              setEmail('admin@bookleaf.test');
              setPassword('Admin123!');
            }}>
              Admin demo <span>admin@bookleaf.test</span>
            </button>
            <small>Demo passwords are prefilled when selected.</small>
          </div>

          <p className="login-legal">
            By signing in, you agree to use this evaluation demo responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}

function Shell({ session, page, setPage, logout, notify, toast }) {
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: '',
    from: '',
    to: ''
  });
  const [createOpen, setCreateOpen] = useState(false);

  const isAdmin = session.user.role === 'admin';

  const refresh = useCallback(async () => {
    try {
      const [t, b, a] = await Promise.all([
        request('/tickets', { token: session.token }),
        isAdmin
          ? Promise.resolve({ books: [] })
          : request('/books', { token: session.token }),
        isAdmin
          ? request('/authors', { token: session.token })
          : Promise.resolve({ authors: [] })
      ]);

      setTickets(t.tickets);
      setBooks(b.books);
      setAuthors(a.authors);
      setSelected(old =>
        old ? t.tickets.find(x => x.id === old.id) || null : null
      );
    } catch (e) {
      if (/expired|Authentication/.test(e.message)) logout();
      else notify(e.message);
    }
  }, [session.token, isAdmin]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const filtered = useMemo(
    () =>
      tickets.filter(t =>
        (!filters.status || t.status === filters.status) &&
        (!filters.category || t.category === filters.category) &&
        (!filters.priority || t.priority === filters.priority) &&
        (!filters.from || t.createdAt.slice(0, 10) >= filters.from) &&
        (!filters.to || t.createdAt.slice(0, 10) <= filters.to) &&
        (!filters.search ||
          (
            t.subject + ' ' +
            t.description + ' ' +
            (t.author?.name || '')
          ).toLowerCase().includes(filters.search.toLowerCase()))
      ),
    [tickets, filters]
  );

  const totals = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter(
      t => !['Resolved', 'Closed'].includes(t.status)
    ).length,
    critical: tickets.filter(
      t =>
        t.priority === 'Critical' &&
        !['Resolved', 'Closed'].includes(t.status)
    ).length
  }), [tickets]);

  const nav = isAdmin
    ? [
        ['overview', 'Overview', LayoutDashboard],
        ['queue', 'Ticket queue', MessageSquareText],
        ['authors', 'Authors', UserRound]
      ]
    : [
        ['overview', 'Overview', LayoutDashboard],
        ['books', 'My books', LibraryBig],
        ['tickets', 'My tickets', MessageSquareText]
      ];

  const choose = t => {
    setSelected(t);
    if (t) setPage(isAdmin ? 'queue' : 'tickets');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><BookOpen size={20} /></span>
          <span>bookleaf<span className="brand-dot">.</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace">
          <div className="workspace-icon">{isAdmin ? 'B' : '✦'}</div>
          <div>
            <b>{isAdmin ? 'BookLeaf Support' : 'Author studio'}</b>
            <small>{isAdmin ? 'Operations team' : 'Your publishing space'}</small>
          </div>
          <ChevronRight size={15} />
        </div>

        <div className="nav-label">MENU</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => {
                setPage(id);
                setSelected(null);
              }}
            >
              <Icon size={18} />
              {label}
              {id === 'queue' && isAdmin && totals.open > 0 &&
                <span className="nav-count">{totals.open}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><MessageSquareText size={18} /></div>
            <b>Need a hand?</b>
            <p>We're here to help with your publishing journey.</p>
            <button onClick={() => {
              if (!isAdmin) setCreateOpen(true);
              else setPage('queue');
            }}>
              {isAdmin ? 'View ticket queue' : 'Contact support'}
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="profile">
            <div className="avatar">
              {session.user.name.split(' ').map(x => x[0]).slice(0, 2).join('')}
            </div>
            <div className="profile-copy">
              <b>{session.user.name}</b>
              <small>{isAdmin ? 'Administrator' : 'Author account'}</small>
            </div>
            <button className="icon-btn" title="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>
              {page === 'overview' ? 'Overview'
                : page === 'books' ? 'My books'
                : page === 'tickets' ? 'My tickets'
                : page === 'queue' ? 'Ticket queue'
                : 'Authors'}
            </b>
          </div>
          <div className="top-actions">
            <span className="live-dot" />
            <span className="live-label">Synced just now</span>
            <div className="top-avatar">{session.user.name[0]}</div>
          </div>
        </header>

        <div className="content">
          {page === 'overview' &&
            <Overview
              session={session}
              books={books}
              tickets={tickets}
              authors={authors}
              setPage={setPage}
              choose={choose}
              onNew={() => setCreateOpen(true)}
            />}
          {page === 'books' && <Books books={books} />}
          {(page === 'tickets' || page === 'queue') &&
            <TicketPage
              isAdmin={isAdmin}
              tickets={filtered}
              selected={selected}
              choose={choose}
              filters={filters}
              setFilters={setFilters}
              refresh={refresh}
              session={session}
              notify={notify}
            />}
          {page === 'authors' && <Authors authors={authors} />}
        </div>

        {createOpen &&
          <CreateTicket
            books={books}
            token={session.token}
            onClose={() => setCreateOpen(false)}
            onCreated={async () => {
              setCreateOpen(false);
              await refresh();
              setPage('tickets');
              notify('Support ticket submitted successfully.');
            }}
          />}

        {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
      </main>
    </div>
  );
}

function Overview({ session, books, tickets, authors, setPage, choose, onNew }) {
  const admin = session.user.role === 'admin';
  const open = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const earned = books.reduce((s, b) => s + (b.total_royalty_earned || 0), 0);
  const paid = books.reduce((s, b) => s + (b.royalty_paid || 0), 0);
  const pending = books.reduce((s, b) => s + (b.royalty_pending || 0), 0);

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow muted">
            {admin ? 'OPERATIONS DASHBOARD' : 'YOUR AUTHOR DASHBOARD'}
          </div>
          <h1>
            {admin ? 'Good to see you, team.' :
              'Hello, ' + session.user.name.split(' ')[0] + '.'}
            {' '}<span className="wave">✳</span>
          </h1>
          <p>
            {admin
              ? 'Here’s what needs your team’s attention today.'
              : 'Here’s a little snapshot of your publishing journey.'}
          </p>
        </div>
        <div className="welcome-actions">
          <span className="date-chip">
            <Clock3 size={15} />
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short'
            })}
          </span>
          {!admin &&
            <button className="btn primary" onClick={onNew}>
              <Plus size={17} /> New support ticket
            </button>}
        </div>
      </div>

      <div className="stats-grid">
        {(admin
          ? [
              { label: 'Total tickets', value: tickets.length, sub: 'Across all authors', icon: MessageSquareText, tint: 'lavender' },
              { label: 'Needs attention', value: open.length, sub: 'Open or in progress', icon: Clock3, tint: 'peach' },
              { label: 'Critical priority', value: tickets.filter(t => t.priority === 'Critical' && !['Resolved', 'Closed'].includes(t.status)).length, sub: 'Requires urgent review', icon: AlertCircle, tint: 'rose' },
              { label: 'Authors', value: authors.length, sub: 'In the sample workspace', icon: UserRound, tint: 'mint' }
            ]
          : [
              { label: 'My books', value: books.length, sub: 'Across all production stages', icon: BookOpen, tint: 'lavender' },
              { label: 'Royalty earned', value: money(earned), sub: 'Total recorded earnings', icon: ArrowUpRight, tint: 'mint' },
              { label: 'Royalty paid', value: money(paid), sub: 'Payments recorded', icon: CheckCircle2, tint: 'peach' },
              { label: 'Royalty pending', value: money(pending), sub: 'Pending across your books', icon: Clock3, tint: 'rose' }
            ]
        ).map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className={`stat-icon ${s.tint}`}><s.icon size={18} /></span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="section-grid">
        <section className="panel wide-panel">
          <div className="panel-head">
            <div>
              <h3>{admin ? 'Priority inbox' : 'Recent support tickets'}</h3>
              <p>
                {admin
                  ? 'The tickets that could use a closer look.'
                  : 'Keep track of your conversations with our team.'}
              </p>
            </div>
            <button className="text-btn" onClick={() => setPage(admin ? 'queue' : 'tickets')}>
              View all <ArrowUpRight size={15} />
            </button>
          </div>

          {(admin ? open : tickets).slice(0, 5).length === 0
            ? <Empty
                title="A clear desk. A good sign."
                text={admin
                  ? 'No tickets need attention right now.'
                  : 'You haven’t raised a support ticket yet.'}
                action={!admin ? 'Raise a ticket' : null}
                onAction={onNew}
              />
            : <div className="ticket-list">
                {(admin ? open : tickets).slice(0, 5).map(t => (
                  <TicketRow key={t.id} ticket={t} admin={admin} onClick={() => choose(t)} />
                ))}
              </div>}
        </section>

        <section className="panel side-panel">
          <div className="panel-head">
            <div>
              <h3>{admin ? 'Support pulse' : 'Publishing at a glance'}</h3>
              <p>{admin ? 'A quick read of the queue.' : 'A snapshot of your catalogue.'}</p>
            </div>
            <span className="sparkle"><Sparkles size={17} /></span>
          </div>

          {admin
            ? <>
                <div className="pulse-row">
                  <span className="pulse-dot open-dot" /><span>Open</span>
                  <b>{tickets.filter(t => t.status === 'Open').length}</b>
                </div>
                <div className="pulse-row">
                  <span className="pulse-dot progress-dot" /><span>In progress</span>
                  <b>{tickets.filter(t => t.status === 'In Progress').length}</b>
                </div>
                <div className="pulse-row">
                  <span className="pulse-dot resolved-dot" /><span>Resolved / closed</span>
                  <b>{tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length}</b>
                </div>
                <div className="mini-callout">
                  <b>Good support starts here.</b>
                  <p>
                    Prioritise urgent tickets, keep authors informed, and leave
                    internal notes for your teammates.
                  </p>
                </div>
              </>
            : <>
                <div className="royalty-hero">
                  <span>Total royalty pending</span>
                  <strong>{money(pending)}</strong>
                  <small>Based on provided sample records</small>
                </div>
                <div className="mini-metrics">
                  <div>
                    <span>Books live</span>
                    <b>{books.filter(b => b.status === 'Published & Live').length}</b>
                  </div>
                  <div>
                    <span>In production</span>
                    <b>{books.filter(b => b.status !== 'Published & Live').length}</b>
                  </div>
                </div>
                <button className="outline-btn full" onClick={() => setPage('books')}>
                  Explore my books <ChevronRight size={16} />
                </button>
              </>}
        </section>
      </div>

      <div className="bottom-note">
        <span className="note-mark"><ShieldCheck size={17} /></span>
        <div>
          <b>{admin
            ? 'Author-first support, every time.'
            : 'Your stories are in good hands.'}</b>
          <p>{admin
            ? 'AI drafts are suggestions only. Review every response before sending it to an author.'
            : 'Have a question about royalties, ISBNs, or production? Raise a ticket and our team will take it from there.'}</p>
        </div>
        {!admin && <button className="text-btn" onClick={onNew}>
          Get support <ArrowUpRight size={15} />
        </button>}
      </div>
    </>
  );
}

function TicketRow({ ticket: t, admin, onClick }) {
  return (
    <button className="ticket-row" onClick={onClick}>
      <div className="ticket-row-main">
        <div className="ticket-subject">
          <span className={`priority-mark ${t.priority.toLowerCase()}`} />
          <b>{t.subject}</b>
          {t.aiMode && <span className="ai-mini"><Sparkles size={11} /></span>}
        </div>
        <div className="ticket-meta">
          <span>{t.id}</span><span className="meta-sep">·</span>
          {admin && <>
            <span>{t.author?.name}</span><span className="meta-sep">·</span>
          </>}
          <span>{date(t.createdAt)}</span>
        </div>
      </div>
      <div className="ticket-row-tags">
        <span className={`status-pill ${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
        <span className={`priority-pill ${t.priority.toLowerCase()}`}>{t.priority}</span>
        <ChevronRight size={16} className="row-chevron" />
      </div>
    </button>
  );
}

function Books({ books }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const filtered = books.filter(b =>
    (b.title + ' ' + b.genre + ' ' + b.isbn).toLowerCase().includes(search.toLowerCase()) &&
    (!status || b.status === status)
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">YOUR CATALOGUE</div>
          <h1>My books</h1>
          <p>All your titles and their latest recorded performance.</p>
        </div>
        <span className="count-chip"><BookOpen size={15} />{books.length} titles</span>
      </div>

      <div className="filterbar">
        <div className="searchbox">
          <Search size={17} />
          <input
            placeholder="Search title, genre, ISBN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option>Published &amp; Live</option>
          {[...new Set(books.map(b => b.status).filter(s => s !== 'Published & Live'))].map(s =>
            <option key={s}>{s}</option>
          )}
        </select>
      </div>

      <div className="book-grid">
        {filtered.map(b => (
          <article className="book-card" key={b.book_id}>
            <div className="book-cover">
              <div className="cover-top">BOOKLEAF EDITIONS</div>
              <div className="cover-title">{b.title}</div>
              <div className="cover-line" />
              <div className="cover-author">{b.genre}</div>
              <span className="cover-number">{b.book_id}</span>
            </div>
            <div className="book-card-content">
              <div className="book-card-title">
                <div><h3>{b.title}</h3><span>{b.genre}</span></div>
                <span className={`status-pill ${b.status === 'Published & Live' ? 'resolved' : 'in-progress'}`}>{b.status}</span>
              </div>
              <div className="book-detail"><span>ISBN</span><b>{b.isbn}</b></div>
              <div className="book-detail"><span>Publication date</span><b>{date(b.publication_date)}</b></div>
              <div className="book-detail"><span>MRP</span><b>{money(b.mrp)}</b></div>
              <div className="book-stats">
                <div><span>Copies sold</span><b>{(b.total_copies_sold || 0).toLocaleString('en-IN')}</b></div>
                <div><span>Earned</span><b>{money(b.total_royalty_earned)}</b></div>
              </div>
              <div className="royalty-line">
                <div><span>Paid</span><b>{money(b.royalty_paid)}</b></div>
                <div><span>Pending</span><b className={b.royalty_pending ? 'pending-amount' : ''}>{money(b.royalty_pending)}</b></div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && <Empty title="No matching books" text="Try changing your search or status filter." />}
    </>
  );
}

function TicketPage({ isAdmin, tickets, selected, choose, filters, setFilters, refresh, session, notify }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (selected) setDetail(selected);
    else setDetail(null);
  }, [selected?.id]);

  const current = tickets.find(t => t.id === selected?.id) || detail;
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft('');
    setReply('');
    setNote('');
    setError('');
  }, [current?.id]);

  async function action(fn, success) {
    setSaving(true);
    setError('');
    try {
      await fn();
      await refresh();
      notify(success);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function getDraft() {
    if (!current) return;
    setSaving(true);
    setError('');
    try {
      const r = await request(`/tickets/${current.id}/ai-draft`, {
        token: session.token,
        method: 'POST',
        body: '{}'
      });
      setDraft(r.draft);
      if (r.aiWarning) notify(r.aiWarning);
      else notify(`Draft generated (${r.aiMode === 'openai' ? 'AI' : 'fallback'}). Review before sending.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function update(p) {
    if (!current) return;
    await action(
      () => request(`/tickets/${current.id}`, {
        token: session.token,
        method: 'PATCH',
        body: JSON.stringify(p)
      }),
      'Ticket updated.'
    );
  }

  async function send() {
    if (!current || !reply.trim()) return;
    await action(
      () => request(`/tickets/${current.id}/messages`, {
        token: session.token,
        method: 'POST',
        body: JSON.stringify({ body: reply })
      }).then(() => setReply('')),
      'Response sent to author.'
    );
  }

  async function addNote() {
    if (!current || !note.trim()) return;
    await action(
      () => request(`/tickets/${current.id}/notes`, {
        token: session.token,
        method: 'POST',
        body: JSON.stringify({ body: note })
      }).then(() => setNote('')),
      'Internal note added.'
    );
  }

  useEffect(() => {
    if (isAdmin && current?.id) {
      let cancelled = false;
      request(`/tickets/${current.id}/ai-draft`, {
        token: session.token,
        method: 'POST',
        body: '{}'
      })
        .then(r => {
          if (!cancelled) setDraft(r.draft);
        })
        .catch(e => {
          if (!cancelled) setError(e.message);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [current?.id, isAdmin, session.token]);

  const patchFilter = (k, v) =>
    setFilters(o => ({ ...o, [k]: v }));

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">
            {isAdmin ? 'AUTHOR CARE OPERATIONS' : 'YOUR CONVERSATIONS'}
          </div>
          <h1>{isAdmin ? 'Ticket queue' : 'My tickets'}</h1>
          <p>
            {isAdmin
              ? 'Triage, respond, and keep every author in the loop.'
              : 'Follow up on your questions and see responses from the support team.'}
          </p>
        </div>
        {!isAdmin &&
          <span className="count-chip"><MessageSquareText size={15} />{tickets.length} tickets</span>}
      </div>

      <div className={`ticket-workspace ${current ? 'has-detail' : ''}`}>
        <section className="queue-panel">
          <div className="queue-top">
            <div className="searchbox">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={e => patchFilter('search', e.target.value)}
                placeholder="Search tickets…"
              />
            </div>
            <button className="icon-btn" title="Refresh" onClick={refresh}>
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="queue-filters">
            <select
              value={filters.status}
              onChange={e => patchFilter('status', e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>

            {isAdmin && (
              <>
                <select
                  value={filters.priority}
                  onChange={e => patchFilter('priority', e.target.value)}
                >
                  <option value="">All priorities</option>
                  {PRIORITIES.map(s => <option key={s}>{s}</option>)}
                </select>

                <select
                  value={filters.category}
                  onChange={e => patchFilter('category', e.target.value)}
                >
                  <option value="">All categories</option>
                  {CATS.map(s => <option key={s}>{s}</option>)}
                </select>

                {/* Updated date filters: From and To on one row */}
                <div className="date-range-filters">
                  <div className="date-filter">
                    <label htmlFor="filter-from">From</label>
                    <input
                      id="filter-from"
                      aria-label="From date"
                      title="From date"
                      type="date"
                      value={filters.from || ''}
                      onChange={e => patchFilter('from', e.target.value)}
                    />
                  </div>

                  <div className="date-filter">
                    <label htmlFor="filter-to">To</label>
                    <input
                      id="filter-to"
                      aria-label="To date"
                      title="To date"
                      type="date"
                      value={filters.to || ''}
                      onChange={e => patchFilter('to', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="queue-count">
            <span>{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</span>
            <span><span className="live-dot" /> Live updates</span>
          </div>

          <div className="queue-list">
            {tickets.map(t => (
              <button
                key={t.id}
                className={`queue-item ${current?.id === t.id ? 'selected' : ''}`}
                onClick={() => choose(t)}
              >
                <div className="queue-item-top">
                  <span className="ticket-id">{t.id}</span>
                  <span className={`priority-pill ${t.priority.toLowerCase()}`}>{t.priority}</span>
                </div>
                <h4>{t.subject}</h4>
                <p>{isAdmin ? t.author?.name : 'BookLeaf Support'} · {date(t.createdAt)}</p>
                <div className="queue-item-bottom">
                  <span className={`status-pill ${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
                  <span className="queue-category">{t.category}</span>
                </div>
              </button>
            ))}
            {!tickets.length &&
              <Empty title="No tickets found" text="There are no tickets matching these filters." />}
          </div>
        </section>

        {current
          ? <section className="detail-panel">
              <div className="detail-head">
                <button className="back-mobile" onClick={() => choose(null)}>← Back</button>
                <div>
                  <div className="ticket-id">{current.id} <span>·</span> {date(current.createdAt)}</div>
                  <h2>{current.subject}</h2>
                </div>
                <div className="detail-tags">
                  <span className={`status-pill ${current.status.toLowerCase().replace(' ', '-')}`}>{current.status}</span>
                  <span className={`priority-pill ${current.priority.toLowerCase()}`}>{current.priority}</span>
                </div>
              </div>

              <div className="detail-scroll">
                <div className="author-summary">
                  <div className="avatar small-avatar">
                    {(current.author?.name || 'A').split(' ').map(x => x[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <b>{current.author?.name || 'Author'}</b>
                    <span>{current.author?.email || ''}</span>
                  </div>
                  <span className="book-ref">{current.book?.title || 'General / Account Level'}</span>
                </div>

                <div className="query-block">
                  <div className="block-label"><FileText size={15} /> AUTHOR QUERY</div>
                  <p>{current.description}</p>
                </div>

                {isAdmin && (
                  <div className="admin-controls">
                    <div className="control-field">
                      <label>Category</label>
                      <select value={current.category} onChange={e => update({ category: e.target.value })}>
                        {CATS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="control-field">
                      <label>Priority</label>
                      <select value={current.priority} onChange={e => update({ priority: e.target.value })}>
                        {PRIORITIES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="control-field">
                      <label>Status</label>
                      <select value={current.status} onChange={e => update({ status: e.target.value })}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <button
                      className="outline-btn assign-btn"
                      onClick={() => update({ assignToMe: true })}
                    >
                      <UserRound size={14} />
                      {current.assignedTo === session.user.id ? 'Assigned to you' : 'Assign to me'}
                    </button>
                  </div>
                )}

                <div className="conversation">
                  <div className="block-label"><MessageSquareText size={15} /> CONVERSATION</div>
                  {current.messages?.length
                    ? current.messages.map(m => (
                        <div
                          key={m.id}
                          className={`message ${m.senderRole === 'admin' ? 'staff-message' : 'author-message'}`}
                        >
                          <div className="message-meta">
                            <b>{m.senderName}</b><span>{date(m.createdAt)}</span>
                          </div>
                          <p>{m.body}</p>
                        </div>
                      ))
                    : <div className="no-replies">
                        No responses yet. {isAdmin
                          ? 'You can draft a reply below.'
                          : 'Our team will respond here.'}
                      </div>}
                </div>

                {isAdmin && (
                  <>
                    <div className="reply-composer">
                      <div className="composer-heading">
                        <div className="block-label"><Send size={15} /> REPLY TO AUTHOR</div>
                        <button className="ai-button" onClick={getDraft} disabled={saving}>
                          <Sparkles size={14} />
                          {saving ? 'Working…' : 'Generate AI draft'}
                        </button>
                      </div>

                      <textarea
                        value={draft || reply}
                        onChange={e => {
                          if (draft) setDraft(e.target.value);
                          else setReply(e.target.value);
                        }}
                        placeholder="Write a thoughtful response…"
                        rows={5}
                      />

                      <div className="composer-foot">
                        <span>Review the draft before sending.</span>
                        <button
                          className="btn primary"
                          disabled={saving || !(draft || reply).trim()}
                          onClick={async () => {
                            const text = draft || reply;
                            if (!text.trim()) return;

                            await action(
                              () => request(`/tickets/${current.id}/messages`, {
                                token: session.token,
                                method: 'POST',
                                body: JSON.stringify({ body: text })
                              }).then(() => {
                                setDraft('');
                                setReply('');
                              }),
                              'Response sent to author.'
                            );
                          }}
                        >
                          <Send size={15} /> Send response
                        </button>
                      </div>
                    </div>

                    <div className="internal-notes">
                      <div className="block-label">
                        <ShieldCheck size={15} /> INTERNAL NOTES
                        <span>Only visible to your team</span>
                      </div>

                      {(current.internalNotes || []).map(n => (
                        <div className="note-item" key={n.id}>
                          <b>{n.authorName}</b>
                          <p>{n.body}</p>
                        </div>
                      ))}

                      <div className="note-compose">
                        <input
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          placeholder="Add an internal note…"
                        />
                        <button
                          className="outline-btn"
                          disabled={!note.trim() || saving}
                          onClick={addNote}
                        >
                          Add note
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {error && <div className="inline-error">{error}</div>}
              </div>
            </section>
          : <section className="detail-empty">
              <div className="empty-illustration"><MessageSquareText size={28} /></div>
              <h3>Select a ticket</h3>
              <p>Choose a conversation from the list to see its details.</p>
            </section>}
      </div>
    </>
  );
}

function Authors({ authors }) {
  const [q, setQ] = useState('');
  const rows = authors.filter(a =>
    (a.name + ' ' + a.email + ' ' + a.city).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">AUTHOR DIRECTORY</div>
          <h1>Authors</h1>
          <p>Authors and catalogue records in the seeded workspace.</p>
        </div>
        <span className="count-chip"><UserRound size={15} />{authors.length} authors</span>
      </div>

      <div className="filterbar">
        <div className="searchbox">
          <Search size={17} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, email, city…"
          />
        </div>
      </div>

      <div className="panel authors-panel">
        <table>
          <thead>
            <tr>
              <th>AUTHOR</th><th>LOCATION</th><th>JOINED</th><th>BOOKS</th><th>AUTHOR ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.author_id}>
                <td>
                  <div className="table-person">
                    <div className="avatar mini-avatar">
                      {a.name.split(' ').map(x => x[0]).slice(0, 2).join('')}
                    </div>
                    <div><b>{a.name}</b><span>{a.email}</span></div>
                  </div>
                </td>
                <td>{a.city}</td>
                <td>{date(a.joined_date)}</td>
                <td><span className="count-chip tiny">{a.bookCount}</span></td>
                <td className="ticket-id">{a.author_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CreateTicket({ books, token, onClose, onCreated }) {
  const [bookId, setBookId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await request('/tickets', {
        token,
        method: 'POST',
        body: JSON.stringify({
          bookId: bookId || null,
          subject,
          description
        })
      });
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow muted">WE'RE HERE TO HELP</span>
            <h2>Raise a support ticket</h2>
            <p>Tell us a little about what you need. We'll take it from there.</p>
          </div>
          <button className="icon-btn close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit} className="ticket-form">
          <label>
            What is this about?
            <select value={bookId} onChange={e => setBookId(e.target.value)}>
              <option value="">General / Account Level</option>
              {books.map(b =>
                <option key={b.book_id} value={b.book_id}>
                  {b.title} · {b.book_id}
                </option>
              )}
            </select>
          </label>

          <label>
            Subject
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              minLength={4}
              maxLength={160}
              required
              placeholder="A short summary of your question"
            />
          </label>

          <label>
            Tell us more
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              minLength={10}
              maxLength={5000}
              required
              rows={5}
              placeholder="Share details that will help us resolve your query…"
            />
            <span className="field-hint">
              At least 10 characters. Please avoid including sensitive bank details.
            </span>
          </label>

          <label>
            Attachment <span className="optional">OPTIONAL</span>
            <div className="upload-fake">
              <Paperclip size={16} />
              <span>{file || 'Attach a screenshot or document'}</span>
              <input
                type="file"
                onChange={e => setFile(e.target.files?.[0]?.name || '')}
                accept="image/*,.pdf"
              />
              <small>UI demo only</small>
            </div>
          </label>

          {error && <div className="error-box">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="outline-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit ticket'}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Empty({ title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><MessageSquareText size={21} /></div>
      <b>{title}</b>
      <p>{text}</p>
      {action &&
        <button className="text-btn" onClick={onAction}>
          {action} <ArrowUpRight size={14} />
        </button>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);