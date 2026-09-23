'use client';

import { useEffect, useState, useRef } from 'react';

interface Group { _id: string; name: string; enabled: boolean; mediaFolder: string; creatorNiche?: string }
interface Template { _id: string; name: string; mediaUrl?: string }
interface Schedule {
  _id: string;
  name: string;
  postType: 'promo' | 'media' | 'creator';
  templateId: any;
  groupIds: any[];
  time: string;
  times: string[];
  timezone: string;
  frequency: string;
  intervalHours: number;
  weekDay: number;
  enabled: boolean;
  lastFiredAt: string | null;
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_n_hours', label: 'Every N hours' },
  { value: 'every_48h', label: 'Every 48h' },
  { value: 'every_72h', label: 'Every 72h' },
  { value: 'weekly', label: 'Weekly' },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [upcomingByGroup, setUpcomingByGroup] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState<Partial<Schedule> | null>(null);
  const [loading, setLoading] = useState(true);
  const [firingId, setFiringId] = useState<string | null>(null);
  const [fireResult, setFireResult] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  async function loadData() {
    const data = await fetch('/api/schedules-page-data').then(r => r.json());
    setSchedules(data.schedules || []);
    setGroups(data.groups || []);
    setTemplates(data.templates || []);
    setUpcomingByGroup(data.upcomingByGroup || {});
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openNew(postType: 'promo' | 'media' | 'creator') {
    setEditing({
      name: '',
      postType,
      templateId: '',
      groupIds: [],
      time: '10:00',
      times: ['10:00'],
      timezone: 'America/Sao_Paulo',
      frequency: 'daily',
      intervalHours: 4,
      weekDay: 0,
      enabled: true,
    });
  }

  function openEdit(s: Schedule) {
    setEditing({
      ...s,
      templateId: s.templateId?._id || s.templateId || '',
      groupIds: s.groupIds.map((g: any) => g._id || g),
      times: s.times?.length ? s.times : [s.time],
    });
  }

  async function handleSave() {
    if (!editing) return;
    const method = editing._id ? 'PUT' : 'POST';
    const times = (editing.times || []).filter(Boolean);
    const payload = {
      ...editing,
      templateId: editing.templateId || null,
      times,
      time: times[0] || editing.time || '10:00',
    };
    await fetch('/api/schedules', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditing(null);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule?')) return;
    await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
    loadData();
  }

  async function handleToggle(s: Schedule) {
    await fetch('/api/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: s._id, enabled: !s.enabled }),
    });
    loadData();
  }

  async function handleFireNow(s: Schedule, markAsFired: boolean) {
    setFiringId(s._id);
    setFireResult(null);
    const res = await fetch('/api/schedules/fire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId: s._id, markAsFired }),
    });
    const data = await res.json();
    setFiringId(null);
    const parts: string[] = [];
    parts.push(`${data.success} posted`);
    if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
    if (data.errors > 0) parts.push(`${data.errors} failed`);
    const extra = markAsFired ? ' · auto-post skipped today' : '';
    const msg = data.errors > 0
      ? `${parts.join(', ')}${extra}`
      : `✓ ${parts.join(', ')}${extra}`;
    setFireResult({ id: s._id, msg, ok: data.errors === 0 });
    setTimeout(() => setFireResult(null), 7000);
  }

  function toggleGroup(groupId: string) {
    if (!editing) return;
    const current = editing.groupIds || [];
    setEditing({
      ...editing,
      groupIds: current.includes(groupId) ? current.filter(id => id !== groupId) : [...current, groupId],
    });
  }

  function selectAllGroups() {
    if (!editing) return;
    const allIds = groups.map(g => g._id);
    const allSelected = allIds.every(id => (editing.groupIds || []).includes(id));
    setEditing({ ...editing, groupIds: allSelected ? [] : allIds });
  }

  const promoSchedules = schedules.filter(s => s.postType === 'promo');
  const mediaSchedules = schedules.filter(s => s.postType === 'media');
  const creatorSchedules = schedules.filter(s => s.postType === 'creator');

  if (loading) return <p className="text-[#888]">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Schedules</h2>
          <p className="text-xs sm:text-sm text-[#888] mt-1">Automate your channel posts</p>
        </div>
      </div>

      {/* Upcoming creator posts */}
      {creatorSchedules.some(s => s.enabled) && (
        <section className="mb-6 bg-[#111] border border-pink-500/20 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-400" />
            Next creators in queue
          </h3>
          <div className="space-y-1.5 text-sm">
            {creatorSchedules.filter(s => s.enabled).map(s => {
              const grps = (s.groupIds || []) as any[];
              return (
                <div key={s._id} className="flex flex-wrap gap-2 items-center text-[#ccc]">
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-xs text-[#666]">
                    {(s.times?.length ? s.times : [s.time]).join(', ')} · {s.frequency}
                  </span>
                  {grps.map((g: any) => {
                    const id = g._id || g;
                    const name = g.name || groups.find(x => x._id === id)?.name || id;
                    const next = upcomingByGroup[id];
                    return (
                      <span key={id} className="text-xs bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded">
                        {name}: {next?.username ? `@${next.username}` : next?.source === 'random' ? `random (${next.queueTotal || '?'})` : 'empty'}
                        {g.creatorNiche || groups.find(x => x._id === id)?.creatorNiche
                          ? ` · ${g.creatorNiche || groups.find(x => x._id === id)?.creatorNiche}`
                          : ''}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Three sections */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">

        {/* PROMO POSTS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Promo / Affiliate
              </h3>
              <p className="text-xs text-[#888] mt-0.5">Template + affiliate buttons</p>
            </div>
            <button onClick={() => openNew('promo')} className="px-3 py-1.5 bg-[#b31b1b] text-white rounded-lg text-xs font-medium hover:bg-[#d42020] transition">
              + New
            </button>
          </div>

          {promoSchedules.length === 0 ? (
            <div className="bg-[#111] border border-dashed border-white/10 rounded-xl p-6 text-center text-[#666] text-sm">
              No promo schedules yet
            </div>
          ) : (
            <div className="space-y-2">
              {promoSchedules.map(s => <ScheduleCard key={s._id} s={s} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} onFireNow={handleFireNow} firingId={firingId} fireResult={fireResult} upcomingByGroup={upcomingByGroup} />)}
            </div>
          )}
        </section>

        {/* MEDIA POSTS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Media Posts
              </h3>
              <p className="text-xs text-[#888] mt-0.5">Image/video from folder</p>
            </div>
            <button onClick={() => openNew('media')} className="px-3 py-1.5 bg-[#b31b1b] text-white rounded-lg text-xs font-medium hover:bg-[#d42020] transition">
              + New
            </button>
          </div>

          {mediaSchedules.length === 0 ? (
            <div className="bg-[#111] border border-dashed border-white/10 rounded-xl p-6 text-center text-[#666] text-sm">
              No media schedules yet
            </div>
          ) : (
            <div className="space-y-2">
              {mediaSchedules.map(s => <ScheduleCard key={s._id} s={s} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} onFireNow={handleFireNow} firingId={firingId} fireResult={fireResult} upcomingByGroup={upcomingByGroup} />)}
            </div>
          )}
        </section>

        {/* CREATOR POSTS */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                Creator Posts
              </h3>
              <p className="text-xs text-[#888] mt-0.5">OF creators from Erogram DB</p>
            </div>
            <button onClick={() => openNew('creator')} className="px-3 py-1.5 bg-[#b31b1b] text-white rounded-lg text-xs font-medium hover:bg-[#d42020] transition">
              + New
            </button>
          </div>

          {creatorSchedules.length === 0 ? (
            <div className="bg-[#111] border border-dashed border-white/10 rounded-xl p-6 text-center text-[#666] text-sm">
              No creator schedules yet
            </div>
          ) : (
            <div className="space-y-2">
              {creatorSchedules.map(s => <ScheduleCard key={s._id} s={s} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} onFireNow={handleFireNow} firingId={firingId} fireResult={fireResult} upcomingByGroup={upcomingByGroup} />)}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 sm:p-6 w-full max-w-lg my-4 sm:my-8">
            <div className="flex items-center gap-3 mb-5">
              <span className={`w-3 h-3 rounded-full ${
                editing.postType === 'promo' ? 'bg-orange-400' :
                editing.postType === 'creator' ? 'bg-pink-400' : 'bg-blue-400'
              }`} />
              <h3 className="text-lg font-semibold">
                {editing._id ? 'Edit' : 'New'}{' '}
                {editing.postType === 'promo' ? 'Promo' : editing.postType === 'creator' ? 'Creator' : 'Media'} Schedule
              </h3>
            </div>

            {editing.postType === 'media' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 text-xs text-blue-300">
                Each group gets its next image from its media folder.
              </div>
            )}

            {editing.postType === 'promo' && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4 text-xs text-orange-300">
                Posts template text + affiliate buttons. Use for partner ads (daily or every 72h).
              </div>
            )}

            {editing.postType === 'creator' && (
              <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 mb-4 text-xs text-pink-300">
                Posts 2+ photos of an OF creator from the Erogram DB for each group&apos;s niche.
                Optional template adds affiliate buttons. Manage curated lists on the Creators page.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Schedule Name</label>
                <input
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder={
                    editing.postType === 'promo' ? 'e.g. Affiliate every 72h' :
                    editing.postType === 'creator' ? 'e.g. Daily Asian creator' :
                    'e.g. Daily Content'
                  }
                />
              </div>

              {(editing.postType === 'promo' || editing.postType === 'creator') && (
                <div>
                  <label className="block text-xs text-[#888] mb-1">
                    Template {editing.postType === 'promo' ? <span className="text-red-400">*</span> : <span className="text-[#555]">(optional affiliate buttons)</span>}
                  </label>
                  <select
                    className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                    value={editing.templateId || ''}
                    onChange={e => setEditing({ ...editing, templateId: e.target.value })}
                  >
                    <option value="">{editing.postType === 'creator' ? 'None (Erogram + IG buttons only)' : 'Select a template'}</option>
                    {templates.map(t => (
                      <option key={t._id} value={t._id}>{t.name} {t.mediaUrl ? '(has media)' : ''}</option>
                    ))}
                  </select>
                  {editing.postType === 'creator' && (
                    <p className="text-xs text-[#555] mt-1">
                      Caption placeholders: {'{{name}}'} {'{{username}}'} {'{{erogram_url}}'} {'{{niche}}'}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-[#888] mb-1">Frequency</label>
                <div className="flex gap-2">
                  {FREQUENCIES.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setEditing({ ...editing, frequency: f.value })}
                      className={`flex-1 py-2 rounded-lg text-sm transition border ${
                        editing.frequency === f.value
                          ? 'bg-[#b31b1b] border-[#b31b1b] text-white font-medium'
                          : 'bg-[#111] border-white/10 text-[#999] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {editing.frequency === 'every_n_hours' ? (
                <div>
                  <label className="block text-xs text-[#888] mb-1">Post every</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                      value={editing.intervalHours || 4}
                      onChange={e => setEditing({ ...editing, intervalHours: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 6, 8, 12].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="text-sm text-[#888]">hours</span>
                  </div>
                  <p className="text-xs text-[#555] mt-1">First post fires immediately, then repeats on interval</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[#888]">Times</label>
                    {(editing.times || []).length < 8 && (
                      <button type="button" onClick={() => setEditing({ ...editing, times: [...(editing.times || []), '12:00'] })}
                        className="text-xs text-[#b31b1b] hover:text-[#d42020]">+ Add time</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(editing.times || ['10:00']).map((t, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="time"
                          className="flex-1 p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                          value={t}
                          onChange={e => {
                            const next = [...(editing.times || [])];
                            next[i] = e.target.value;
                            setEditing({ ...editing, times: next });
                          }}
                        />
                        {(editing.times || []).length > 1 && (
                          <button type="button" onClick={() => {
                            const next = (editing.times || []).filter((_, j) => j !== i);
                            setEditing({ ...editing, times: next });
                          }} className="text-xs text-red-400 hover:text-red-300 px-2">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(editing.times || []).length > 1 && (
                    <p className="text-xs text-emerald-400/70 mt-1">Posts {(editing.times || []).length}x per day</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-[#888] mb-1">Timezone</label>
                <select
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.timezone || 'America/Sao_Paulo'}
                  onChange={e => setEditing({ ...editing, timezone: e.target.value })}
                >
                  {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>

              {editing.frequency === 'weekly' && (
                <div>
                  <label className="block text-xs text-[#888] mb-1">Day of the week</label>
                  <select
                    className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                    value={editing.weekDay ?? 0}
                    onChange={e => setEditing({ ...editing, weekDay: parseInt(e.target.value) })}
                  >
                    {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#888]">Groups</label>
                  <button onClick={selectAllGroups} className="text-xs text-[#b31b1b] hover:text-[#d42020]">
                    {groups.every(g => (editing.groupIds || []).includes(g._id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="bg-[#111] border border-white/10 rounded-lg p-3 max-h-44 overflow-y-auto space-y-1">
                  {groups.map(g => {
                    const missingFolder = editing.postType === 'media' && !g.mediaFolder;
                    const missingNiche = editing.postType === 'creator' && !g.creatorNiche;
                    const blocked = missingFolder || missingNiche;
                    return (
                      <label key={g._id} className={`flex items-center gap-2.5 rounded p-1.5 transition cursor-pointer ${blocked ? 'opacity-50' : 'hover:bg-white/5'}`}>
                        <input
                          type="checkbox"
                          checked={(editing.groupIds || []).includes(g._id)}
                          onChange={() => !blocked && toggleGroup(g._id)}
                          className="accent-[#b31b1b]"
                          disabled={blocked}
                        />
                        <span className="text-sm flex-1">{g.name}</span>
                        {editing.postType === 'creator' && (
                          g.creatorNiche
                            ? <span className="text-xs text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded">{g.creatorNiche}</span>
                            : <span className="text-xs text-red-400">no niche</span>
                        )}
                        {editing.postType === 'media' && (
                          g.mediaFolder
                            ? <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{g.mediaFolder}/</span>
                            : <span className="text-xs text-red-400">no folder</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {editing.postType === 'media' && groups.some(g => !g.mediaFolder) && (
                  <p className="text-xs text-[#666] mt-1">Greyed-out groups have no media folder</p>
                )}
                {editing.postType === 'creator' && groups.some(g => !g.creatorNiche) && (
                  <p className="text-xs text-[#666] mt-1">Greyed-out groups have no creator niche. Set it on the Groups page.</p>
                )}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.enabled !== false}
                  onChange={e => setEditing({ ...editing, enabled: e.target.checked })}
                  className="accent-[#b31b1b]"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-[#b31b1b] rounded-lg text-sm font-medium hover:bg-[#d42020] transition">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleCard({ s, onEdit, onDelete, onToggle, onFireNow, firingId, fireResult, upcomingByGroup }: {
  s: Schedule;
  onEdit: (s: Schedule) => void;
  onDelete: (id: string) => void;
  onToggle: (s: Schedule) => void;
  onFireNow: (s: Schedule, markAsFired: boolean) => void;
  firingId: string | null;
  fireResult: { id: string; msg: string; ok: boolean } | null;
  upcomingByGroup?: Record<string, any>;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tpl = s.templateId as any;
  const grps = s.groupIds as any[];
  const freqLabel = {
    daily: 'Daily',
    every_48h: 'Every 48h',
    every_72h: 'Every 72h',
    weekly: 'Weekly',
    every_n_hours: `Every ${s.intervalHours || 4}h`,
  }[s.frequency] || s.frequency;
  const displayTimes = s.times?.length ? s.times : [s.time];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const isFiring = firingId === s._id;
  const result = fireResult?.id === s._id ? fireResult : null;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function fire(markAsFired: boolean) {
    setShowMenu(false);
    onFireNow(s, markAsFired);
  }

  return (
    <div className={`bg-[#111] border rounded-xl p-3 sm:p-4 transition ${result ? (result.ok ? 'border-emerald-500/40' : 'border-red-500/40') : 'border-white/10'}`}>
      <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggle(s)}
            className={`w-8 h-4 rounded-full transition relative shrink-0 ${s.enabled ? 'bg-green-600' : 'bg-[#333]'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${s.enabled ? 'left-4' : 'left-0.5'}`} />
          </button>
          <span className="font-medium text-sm truncate">{s.name}</span>
        </div>

        <div className="flex gap-1 sm:gap-1.5 items-center shrink-0">
          {/* Post Now with dropdown */}
          <div className="relative" ref={menuRef}>
            {isFiring ? (
              <span className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 bg-emerald-500/10 rounded">
                <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Posting...</span>
              </span>
            ) : (
              <button
                onClick={() => setShowMenu(v => !v)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition font-medium"
              >
                ▶ <span className="hidden sm:inline">Post Now</span>
                <span className="text-[10px] opacity-60">▾</span>
              </button>
            )}

            {showMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-30 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl overflow-hidden w-56 sm:w-64">
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-[11px] text-[#888] font-medium uppercase tracking-wide">How should this count?</p>
                </div>
                <button
                  onClick={() => fire(false)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition"
                >
                  <p className="text-sm text-white font-medium">Post only</p>
                  <p className="text-xs text-[#666] mt-0.5">Auto-post still fires as scheduled</p>
                </button>
                <div className="h-px bg-white/5 mx-3" />
                <button
                  onClick={() => fire(true)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition"
                >
                  <p className="text-sm text-white font-medium">Post + skip auto-post</p>
                  <p className="text-xs text-[#666] mt-0.5">Cron won't post again today</p>
                </button>
              </div>
            )}
          </div>

          <button onClick={() => onEdit(s)} className="px-2 sm:px-2.5 py-1 text-xs bg-white/5 rounded hover:bg-white/10 transition">Edit</button>
          <button onClick={() => onDelete(s._id)} className="px-2 sm:px-2.5 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition hidden sm:block">Delete</button>
        </div>
      </div>

      <div className="flex gap-2 text-xs flex-wrap">
        <span className="bg-[#0a0a0a] px-2 py-0.5 rounded font-medium">
          {s.frequency === 'every_n_hours' ? `Every ${s.intervalHours || 4}h` : displayTimes.join(', ')} {s.timezone.split('/').pop()}
        </span>
        <span className="bg-[#0a0a0a] px-2 py-0.5 rounded">
          {freqLabel}{s.frequency === 'weekly' ? ` · ${WEEKDAYS[s.weekDay ?? 0]}` : ''}{displayTimes.length > 1 ? ` · ${displayTimes.length}x/day` : ''}
        </span>
        {tpl && <span className="text-[#888]">📝 {tpl.name}</span>}
        <span className="text-[#888]">{grps?.length || 0} group{grps?.length !== 1 ? 's' : ''}</span>
      </div>

      {result && (
        <p className={`text-xs mt-2 font-medium ${result.ok ? 'text-emerald-400' : 'text-orange-400'}`}>
          {result.msg}
        </p>
      )}
      {!result && s.lastFiredAt && (
        <p className="text-xs text-[#555] mt-1.5">Last posted: {new Date(s.lastFiredAt).toLocaleString()}</p>
      )}
      {s.postType === 'creator' && upcomingByGroup && (
        <p className="text-xs text-pink-400/80 mt-1">
          Next:{' '}
          {(grps || []).map((g: any) => {
            const id = g._id || g;
            const next = upcomingByGroup[id];
            return next?.username ? `@${next.username}` : (next?.source === 'random' ? 'random' : '-');
          }).join(', ') || '-'}
        </p>
      )}
    </div>
  );
}

