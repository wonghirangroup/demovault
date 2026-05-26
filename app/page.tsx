'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Project, ProjectUrl, ProjectAccount, ProjectStatus } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  LIVE: { label: 'LIVE', color: '#4ade80', bg: 'rgba(22,163,74,0.15)',  border: 'rgba(22,163,74,0.3)'  },
  DEMO: { label: 'DEMO', color: '#fbbf24', bg: 'rgba(217,119,6,0.15)', border: 'rgba(217,119,6,0.3)'  },
  DEV:  { label: 'DEV',  color: '#60a5fa', bg: 'rgba(37,99,235,0.15)', border: 'rgba(37,99,235,0.3)'  },
  DOWN: { label: 'DOWN', color: '#f87171', bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.3)'  },
}
const EMOJIS  = ['📅','🚀','💼','🏢','🛒','📦','💰','🔐','📊','🎯','🌐','📱','⚙️','🗂️','📋','🏪','🎪','🏆','💡','🔧']
const COLORS  = [
  'linear-gradient(135deg,#f97316,#ea580c)',
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#0891b2,#0e7490)',
  'linear-gradient(135deg,#16a34a,#15803d)',
  'linear-gradient(135deg,#a21caf,#86198f)',
  'linear-gradient(135deg,#d97706,#b45309)',
  'linear-gradient(135deg,#dc2626,#b91c1c)',
  'linear-gradient(135deg,#0f766e,#0d9488)',
]
const COLOR_HEX = ['#f97316','#6366f1','#0891b2','#16a34a','#a21caf','#d97706','#dc2626','#0f766e']

// ── Empty form state ───────────────────────────────────────────────────────────
function emptyForm() {
  return {
    name: '', desc: '', emoji: '📅', color: COLORS[0],
    status: 'LIVE' as ProjectStatus, note: '', line_oa: '',
    urls: [{ id: '', label: '', url: '', sort: 0 }] as (ProjectUrl & { sort: number })[],
    accounts: [] as (ProjectAccount & { sort: number })[],
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  let timer: ReturnType<typeof setTimeout>
  const toast = (m: string) => {
    setMsg(m); setShow(true)
    clearTimeout(timer)
    timer = setTimeout(() => setShow(false), 2200)
  }
  return { msg, show, toast }
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Page() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const { msg: toastMsg, show: toastShow, toast } = useToast()

  // ── Who am I ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<string>('')
  const [userInput,   setUserInput]   = useState<string>('')
  const [userOpen,    setUserOpen]    = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dv_username') || ''
    setCurrentUser(saved)
    setUserInput(saved)
  }, [])

  function saveUser(name: string) {
    const trimmed = name.trim()
    localStorage.setItem('dv_username', trimmed)
    setCurrentUser(trimmed)
    setUserOpen(false)
    if (trimmed) toast(`👤 สวัสดี ${trimmed}!`)
    else toast('👁️ โหมดดูทั้งหมด')
  }

  // modal state
  const [formOpen,   setFormOpen]   = useState(false)
  const [delOpen,    setDelOpen]    = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState(emptyForm())

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      const j   = await res.json()
      if (j.ok) setProjects(j.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
               (p.desc||'').toLowerCase().includes(search.toLowerCase())
  )

  // ── Open Add ───────────────────────────────────────────────────────────────
  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  // ── Open Edit ──────────────────────────────────────────────────────────────
  function openEdit(p: Project) {
    setEditId(p.id)
    setForm({
      name:     p.name,
      desc:     p.desc || '',
      emoji:    p.emoji || '📁',
      color:    p.color || COLORS[0],
      status:   p.status,
      note:     p.note || '',
      line_oa:  p.line_oa || '',
      urls:     p.urls.length ? p.urls.map((u,i) => ({ ...u, sort: i })) : [{ id:'', label:'', url:'', sort:0 }],
      accounts: p.accounts.map((a,i) => ({ ...a, sort: i })),
    })
    setFormOpen(true)
  }

  // ── URL helpers ────────────────────────────────────────────────────────────
  function setUrl(i: number, field: 'label' | 'url', val: string) {
    setForm(f => {
      const urls = [...f.urls]; urls[i] = { ...urls[i], [field]: val }; return { ...f, urls }
    })
  }
  function addUrl() {
    setForm(f => ({ ...f, urls: [...f.urls, { id:'', label:'', url:'', sort: f.urls.length }] }))
  }
  function removeUrl(i: number) {
    setForm(f => ({ ...f, urls: f.urls.filter((_,idx) => idx !== i) }))
  }

  // ── Account helpers ────────────────────────────────────────────────────────
  function setAcct(i: number, field: 'role' | 'email' | 'pass' | 'assigned_to', val: string) {
    setForm(f => {
      const accounts = [...f.accounts]; accounts[i] = { ...accounts[i], [field]: val }; return { ...f, accounts }
    })
  }
  function addAcct() {
    setForm(f => ({ ...f, accounts: [...f.accounts, { id:'', role:'', email:'', pass:'', assigned_to:'', sort: f.accounts.length }] }))
  }
  function removeAcct(i: number) {
    setForm(f => ({ ...f, accounts: f.accounts.filter((_,idx) => idx !== i) }))
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    if (!form.name.trim()) { alert('กรุณาใส่ชื่อโปรเจค'); return }
    setSaving(true)
    try {
      const body = {
        ...form,
        urls:     form.urls.filter(u => u.url.trim()),
        accounts: form.accounts.filter(a => a.email.trim() || a.role.trim()),
      }
      const url    = editId ? `/api/projects/${editId}` : '/api/projects'
      const method = editId ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j      = await res.json()
      if (!j.ok) throw new Error(j.error)
      await fetchProjects()
      setFormOpen(false)
      toast(editId ? '✅ บันทึกการแก้ไขแล้ว' : '✅ เพิ่มโปรเจคสำเร็จ')
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function askDelete(p: Project) { setDeleteId(p.id); setDelOpen(true) }
  async function confirmDelete() {
    if (!deleteId) return
    await fetch(`/api/projects/${deleteId}`, { method: 'DELETE' })
    await fetchProjects()
    setDelOpen(false)
    toast('🗑️ ลบโปรเจคแล้ว')
  }

  // ── Copy ───────────────────────────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState('')
  function copy(text: string, uid: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(uid)
    setTimeout(() => setCopiedId(''), 1600)
    toast('📋 Copied!')
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ══════════════════════════════════════════════════════════════════════════
  const S = {
    body:    { background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight:'100vh', padding:'32px 16px 80px' } as React.CSSProperties,
    card:    { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, overflow:'hidden', backdropFilter:'blur(12px)', transition:'transform .15s,box-shadow .15s' } as React.CSSProperties,
    input:   { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.07)', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const },
    select:  { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'#1e293b', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit' },
    label:   { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' as const, letterSpacing:'.05em', display:'block', marginBottom:5 },
    btnPrim: { padding:'9px 20px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' },
    btnSec:  { padding:'8px 16px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#94a3b8', fontSize:13, cursor:'pointer', fontFamily:'inherit' },
    overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
    modal:   { background:'#1e293b', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:28, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' as const },
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.body}>

      {/* ── Header ── */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'12px 24px', marginBottom:12, backdropFilter:'blur(8px)' }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:20 }}>WH</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#fff' }}>Demo Vault</div>
            <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>WH Group — Project Credentials</div>
          </div>
        </div>
        <p style={{ fontSize:'.75rem', color:'#475569' }}>🔒 เก็บใน DB · ใช้งานได้ทุกเครื่อง</p>

        {/* ── Who am I ── */}
        <div style={{ marginTop:8 }}>
          {currentUser ? (
            <button onClick={()=>{ setUserInput(currentUser); setUserOpen(true) }}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:20, border:'1px solid rgba(99,102,241,0.4)', background:'rgba(99,102,241,0.12)', color:'#a5b4fc', fontSize:'.78rem', cursor:'pointer', fontFamily:'inherit' }}>
              👤 {currentUser}
              <span style={{ fontSize:'.68rem', color:'#64748b' }}>เปลี่ยน</span>
            </button>
          ) : (
            <button onClick={()=>{ setUserInput(''); setUserOpen(true) }}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 14px', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#64748b', fontSize:'.78rem', cursor:'pointer', fontFamily:'inherit' }}>
              👁️ ดูทั้งหมด · <span style={{ color:'#6366f1' }}>ตั้งชื่อตัวเอง</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ maxWidth:1100, margin:'0 auto 24px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาโปรเจค..."
            style={{ ...S.input, paddingLeft:36, borderRadius:10 }} />
        </div>
        <button onClick={openAdd} style={S.btnPrim}>＋ เพิ่มโปรเจค</button>
      </div>

      {/* ── Grid ── */}
      <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:18 }}>
        {loading ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#475569', padding:60 }}>⏳ กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#334155', padding:60 }}>
            <div style={{ fontSize:'3rem', marginBottom:10 }}>🔍</div>
            <div>ไม่พบโปรเจค</div>
          </div>
        ) : filtered.map(p => (
          <ProjectCard
            key={p.id} p={p}
            onEdit={()=>openEdit(p)}
            onDelete={()=>askDelete(p)}
            copy={copy} copiedId={copiedId}
            currentUser={currentUser}
          />
        ))}
      </div>

      {/* ════════════════════════════════════════
          WHO AM I MODAL
      ════════════════════════════════════════ */}
      {userOpen && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setUserOpen(false) }}>
          <div style={{ ...S.modal, maxWidth:360 }}>
            <h2 style={{ fontWeight:800, fontSize:'1rem', color:'#f1f5f9', marginBottom:6 }}>👤 ฉันคือใคร?</h2>
            <p style={{ fontSize:'.8rem', color:'#64748b', marginBottom:16 }}>
              ใส่ชื่อของคุณเพื่อแสดงเฉพาะบัญชีที่เป็นของคุณ<br/>
              ปล่อยว่างไว้เพื่อดูทุกบัญชี (แต่รหัสของคนอื่นจะถูกซ่อน)
            </p>
            <input
              style={S.input}
              value={userInput}
              onChange={e=>setUserInput(e.target.value)}
              placeholder="เช่น Arm, Net, Ploy..."
              onKeyDown={e => e.key === 'Enter' && saveUser(userInput)}
              autoFocus
            />
            <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
              {currentUser && (
                <button onClick={()=>saveUser('')} style={{ ...S.btnSec, color:'#f87171', borderColor:'rgba(220,38,38,0.3)' }}>
                  ออกจากโหมดผู้ใช้
                </button>
              )}
              <button onClick={()=>setUserOpen(false)} style={S.btnSec}>ยกเลิก</button>
              <button onClick={()=>saveUser(userInput)} style={S.btnPrim}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════ */}
      {formOpen && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setFormOpen(false) }}>
          <div style={S.modal}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:'1rem', color:'#f1f5f9', margin:0 }}>
                {editId ? '✎ แก้ไขโปรเจค' : '＋ เพิ่มโปรเจคใหม่'}
              </h2>
              <button onClick={()=>setFormOpen(false)} style={{ ...S.btnSec, marginLeft:'auto', padding:'5px 12px' }}>✕</button>
            </div>

            {/* Name + Desc */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={S.label}>ชื่อโปรเจค *</label>
                <input style={S.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="เช่น TimeLine HR" />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={S.label}>คำอธิบาย</label>
                <input style={S.input} value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="เช่น HR SaaS · Attendance" />
              </div>
            </div>

            {/* Emoji + Status */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, marginBottom:14 }}>
              <div>
                <label style={S.label}>ไอคอน</label>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))}
                      style={{ width:32, height:32, borderRadius:7, border:`1px solid ${form.emoji===e ? '#f97316':'rgba(255,255,255,0.1)'}`, background:form.emoji===e ? 'rgba(249,115,22,0.15)':'rgba(255,255,255,0.05)', fontSize:15, cursor:'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <select style={S.select} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as ProjectStatus}))}>
                  <option value="LIVE">🟢 LIVE</option>
                  <option value="DEMO">🟡 DEMO</option>
                  <option value="DEV">🔵 DEV</option>
                  <option value="DOWN">🔴 DOWN</option>
                </select>
              </div>
            </div>

            {/* Color */}
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>สีการ์ด</label>
              <div style={{ display:'flex', gap:7, marginTop:4 }}>
                {COLORS.map((c,i) => (
                  <div key={i} onClick={()=>setForm(f=>({...f,color:c}))}
                    style={{ width:26, height:26, borderRadius:6, background:COLOR_HEX[i], cursor:'pointer', border:`2px solid ${form.color===c ? '#fff':'transparent'}`, transform:form.color===c ? 'scale(1.2)':'scale(1)', transition:'all .15s' }} />
                ))}
              </div>
            </div>

            {/* Line OA */}
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>💚 Line OA URL</label>
              <input style={S.input} value={form.line_oa} onChange={e=>setForm(f=>({...f,line_oa:e.target.value}))}
                placeholder="https://lin.ee/xxxxxxx หรือ https://page.line.me/..." />
            </div>

            {/* ── URLs ── */}
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:12, padding:14, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ ...S.label, margin:0 }}>🌐 URLs ({form.urls.length})</span>
                <button onClick={addUrl} style={{ ...S.btnSec, padding:'4px 10px', fontSize:12, color:'#f97316', borderColor:'rgba(249,115,22,0.3)' }}>＋ เพิ่ม URL</button>
              </div>
              {form.urls.map((u,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 2fr auto', gap:6, marginBottom:8, alignItems:'center' }}>
                  <input style={{ ...S.input, fontSize:12 }} value={u.label} onChange={e=>setUrl(i,'label',e.target.value)}
                    placeholder={i===0 ? 'เช่น Admin Portal' : i===1 ? 'Employee LIFF' : 'Backend API'} />
                  <input style={{ ...S.input, fontSize:12 }} value={u.url} onChange={e=>setUrl(i,'url',e.target.value)}
                    placeholder="https://..." />
                  <button onClick={()=>removeUrl(i)}
                    style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.1)', color:'#f87171', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* ── Accounts ── */}
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:12, padding:14, marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ ...S.label, margin:0 }}>👤 บัญชีทดสอบ ({form.accounts.length})</span>
                <button onClick={addAcct} style={{ ...S.btnSec, padding:'4px 10px', fontSize:12, color:'#60a5fa', borderColor:'rgba(96,165,250,0.3)' }}>＋ เพิ่มบัญชี</button>
              </div>
              {form.accounts.length === 0 && (
                <div style={{ textAlign:'center', color:'#475569', fontSize:12, padding:'8px 0' }}>กด "+ เพิ่มบัญชี" เพื่อเพิ่ม Username/Password</div>
              )}
              {form.accounts.map((a,i) => (
                <div key={i} style={{ background:'rgba(0,0,0,0.15)', borderRadius:9, padding:10, marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                    <input style={{ ...S.input, fontSize:12, flex:1, marginRight:8 }} value={a.role} onChange={e=>setAcct(i,'role',e.target.value)}
                      placeholder="Role เช่น Admin, Manager, HR" />
                    <button onClick={()=>removeAcct(i)}
                      style={{ width:26, height:26, borderRadius:6, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.1)', color:'#f87171', cursor:'pointer', fontSize:12, flexShrink:0 }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <input style={{ ...S.input, fontSize:12 }} value={a.email} onChange={e=>setAcct(i,'email',e.target.value)} placeholder="Username / Email" />
                    <input style={{ ...S.input, fontSize:12 }} value={a.pass}  onChange={e=>setAcct(i,'pass', e.target.value)} placeholder="Password" />
                  </div>
                  <div>
                    <input style={{ ...S.input, fontSize:11, background:'rgba(99,102,241,0.06)', borderColor:'rgba(99,102,241,0.2)' }}
                      value={a.assigned_to} onChange={e=>setAcct(i,'assigned_to',e.target.value)}
                      placeholder="🔒 เห็นได้โดย (ชื่อ): เช่น Net, Arm — ว่าง = ทุกคนเห็น" />
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>หมายเหตุ</label>
              <textarea style={{ ...S.input, resize:'vertical', minHeight:56 }} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="เช่น ต้อง VPN ก่อนเปิด, demo mode ไม่บันทึก DB..." />
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setFormOpen(false)} style={S.btnSec}>ยกเลิก</button>
              <button onClick={save} disabled={saving} style={{ ...S.btnPrim, opacity:saving ? .6:1 }}>
                {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delOpen && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setDelOpen(false) }}>
          <div style={{ ...S.modal, maxWidth:360, textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🗑️</div>
            <h3 style={{ color:'#f1f5f9', marginBottom:8 }}>ยืนยันการลบ?</h3>
            <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:20 }}>
              ต้องการลบโปรเจคนี้ออกจาก Vault?
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setDelOpen(false)} style={S.btnSec}>ยกเลิก</button>
              <button onClick={confirmDelete} style={{ ...S.btnPrim, background:'#dc2626' }}>ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <div style={{
        position:'fixed', bottom:24, right:24, zIndex:9999,
        background:'#1e293b', border:'1px solid rgba(255,255,255,0.12)',
        color:'#f1f5f9', padding:'10px 18px', borderRadius:10,
        fontSize:'.82rem', fontWeight:600,
        opacity: toastShow ? 1 : 0,
        transform: toastShow ? 'translateY(0)' : 'translateY(8px)',
        transition:'all .2s', pointerEvents:'none',
      }}>
        {toastMsg}
      </div>

    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Project Card Component
// ══════════════════════════════════════════════════════════════════════════════
function ProjectCard({ p, onEdit, onDelete, copy, copiedId, currentUser }: {
  p: Project
  onEdit: () => void
  onDelete: () => void
  copy: (text: string, uid: string) => void
  copiedId: string
  currentUser: string
}) {
  const s = STATUS_CFG[p.status] || STATUS_CFG.LIVE

  // ── password reveal state ──────────────────────────────────────────────────
  const [revealPass, setRevealPass] = useState<Record<string, boolean>>({})
  function toggleReveal(id: string) {
    setRevealPass(r => ({ ...r, [id]: !r[id] }))
  }

  // ── ตรรกะการแสดงบัญชี ─────────────────────────────────────────────────────
  // assigned_to ว่าง = ทุกคนเห็นได้
  // assigned_to มีชื่อ = เห็นเฉพาะคนนั้น (คนอื่นเห็นแค่ role ไม่เห็น pass)
  function canSeePass(a: { assigned_to: string }) {
    if (!a.assigned_to) return true                        // ว่าง = ทุกคนเห็น
    if (!currentUser)   return false                       // ยังไม่ได้ตั้งชื่อ → ซ่อน
    return a.assigned_to.trim().toLowerCase() === currentUser.trim().toLowerCase()
  }

  return (
    <div style={{
      background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
      borderRadius:18, overflow:'hidden', backdropFilter:'blur(12px)',
      transition:'transform .15s,box-shadow .15s',
    }}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='';(e.currentTarget as HTMLDivElement).style.boxShadow=''}}
    >
      {/* Header */}
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width:40, height:40, borderRadius:11, background:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
          {p.emoji||'📁'}
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontWeight:700, fontSize:'.92rem', color:'#f1f5f9' }}>{p.name}</div>
          {p.desc && <div style={{ fontSize:'.72rem', color:'#64748b', marginTop:2 }}>{p.desc}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Line OA Button */}
          {p.line_oa && (
            <a href={p.line_oa} target="_blank" rel="noreferrer" title="เปิด Line OA"
              style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:8, background:'rgba(0,185,0,0.15)', border:'1px solid rgba(0,185,0,0.35)', color:'#4ade80', fontSize:'.72rem', fontWeight:700, textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
              💚 LINE OA
            </a>
          )}
          <span style={{ padding:'3px 9px', borderRadius:20, fontSize:'.67rem', fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
            {s.label}
          </span>
          <button onClick={onEdit} title="แก้ไข"
            style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#94a3b8', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✎
          </button>
          <button onClick={onDelete} title="ลบ"
            style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(220,38,38,0.2)', background:'rgba(220,38,38,0.08)', color:'#f87171', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            🗑
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>

        {/* URLs */}
        {p.urls.length > 0 && (
          <div style={{ background:'rgba(0,0,0,0.25)', borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'6px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'.67rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em' }}>
              🌐 URLs ({p.urls.length})
            </div>
            {p.urls.map((u) => (
              <div key={u.id} style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:'.68rem', color:'#64748b', fontWeight:600, marginBottom:1 }}>{u.label}</div>
                  <a href={u.url} target="_blank" rel="noreferrer"
                    style={{ fontSize:'.78rem', color:'#60a5fa', textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    🔗 {u.url}
                  </a>
                </div>
                <button onClick={()=>copy(u.url, `url-${u.id}`)}
                  style={{ padding:'2px 7px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:copiedId===`url-${u.id}` ? 'rgba(22,163,74,0.2)':'rgba(255,255,255,0.05)', color:copiedId===`url-${u.id}` ? '#4ade80':'#64748b', fontSize:'.67rem', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                  {copiedId===`url-${u.id}` ? '✓' : 'copy'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Accounts */}
        {p.accounts.length > 0 && (
          <div>
            <div style={{ fontSize:'.67rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>
              👤 บัญชีทดสอบ
            </div>
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' }}>
              {p.accounts.map((a) => {
                const uid     = `acct-${a.id}`
                const canSee  = canSeePass(a)
                const text    = `${a.email} | ${a.pass}`
                const isRevealed = revealPass[a.id]

                return (
                  <div key={a.id} style={{ padding:'8px 11px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:7 }}>
                    {a.role && (
                      <span style={{ padding:'2px 7px', borderRadius:6, fontSize:'.67rem', fontWeight:700, background:'rgba(249,115,22,0.12)', color:'#fb923c', border:'1px solid rgba(249,115,22,0.25)', flexShrink:0, whiteSpace:'nowrap' }}>
                        {a.role}
                      </span>
                    )}

                    {canSee ? (
                      // เห็นได้เต็ม
                      <>
                        <span style={{ fontSize:'.77rem', color:'#94a3b8', fontFamily:'monospace', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {a.email}
                        </span>
                        <span style={{ fontSize:'.77rem', color: isRevealed ? '#cbd5e1':'transparent', fontFamily:'monospace', flexShrink:0, background: isRevealed ? 'transparent':'rgba(255,255,255,0.08)', borderRadius:4, padding:'0 4px', userSelect: isRevealed ? 'auto':'none', filter: isRevealed ? 'none':'blur(4px)', transition:'filter .2s', cursor:'pointer', minWidth:60, textAlign:'center' }}
                          onClick={()=>toggleReveal(a.id)} title={isRevealed ? 'คลิกซ่อน':'คลิกดูรหัส'}>
                          {isRevealed ? a.pass : '••••••••'}
                        </span>
                        <button onClick={()=>copy(text, uid)}
                          style={{ padding:'2px 7px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:copiedId===uid ? 'rgba(22,163,74,0.2)':'rgba(255,255,255,0.05)', color:copiedId===uid ? '#4ade80':'#64748b', fontSize:'.67rem', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                          {copiedId===uid ? '✓' : 'copy'}
                        </button>
                      </>
                    ) : (
                      // ซ่อน — เป็นบัญชีของคนอื่น
                      <>
                        <span style={{ fontSize:'.75rem', color:'#475569', flex:1, fontStyle:'italic' }}>
                          🔒 บัญชีของ {a.assigned_to || 'ผู้อื่น'}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Note */}
        {p.note && (
          <div style={{ fontSize:'.73rem', color:'#64748b', padding:'8px 11px', background:'rgba(0,0,0,0.15)', borderRadius:8, borderLeft:'3px solid rgba(249,115,22,0.4)', lineHeight:1.5 }}>
            {p.note.split('\n').map((line, i) => <span key={i}>{line}{i < p.note.split('\n').length-1 && <br/>}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}
