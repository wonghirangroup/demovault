'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Project, ProjectUrl, ProjectAccount, ProjectStatus, DvUser } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  LIVE: { label: 'LIVE', color: '#4ade80', bg: 'rgba(22,163,74,0.15)',  border: 'rgba(22,163,74,0.3)'  },
  DEMO: { label: 'DEMO', color: '#fbbf24', bg: 'rgba(217,119,6,0.15)', border: 'rgba(217,119,6,0.3)'  },
  DEV:  { label: 'DEV',  color: '#60a5fa', bg: 'rgba(37,99,235,0.15)', border: 'rgba(37,99,235,0.3)'  },
  DOWN: { label: 'DOWN', color: '#f87171', bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.3)'  },
}
const EMOJIS = ['📅','🚀','💼','🏢','🛒','📦','💰','🔐','📊','🎯','🌐','📱','⚙️','🗂️','📋','🏪','🎪','🏆','💡','🔧']
const COLORS = [
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

function emptyForm() {
  return {
    name: '', desc: '', emoji: '📅', color: COLORS[0],
    status: 'LIVE' as ProjectStatus, note: '', line_oa: '',
    urls:     [{ id:'', label:'', url:'', sort:0 }] as (ProjectUrl & { sort:number })[],
    accounts: [] as (ProjectAccount & { sort:number })[],
  }
}

function useToast() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  let timer: ReturnType<typeof setTimeout>
  const toast = (m: string) => {
    setMsg(m); setShow(true)
    clearTimeout(timer)
    timer = setTimeout(() => setShow(false), 2500)
  }
  return { msg, show, toast }
}

type AuthState = 'loading' | 'ok' | 'select_name' | 'no_slots' | 'error'

// ══════════════════════════════════════════════════════════════════════════════
export default function Page() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const [authState,     setAuthState]     = useState<AuthState>('loading')
  const [currentUser,   setCurrentUser]   = useState<DvUser | null>(null)
  const [lineUid,       setLineUid]       = useState('')
  const [lineAvatar,    setLineAvatar]    = useState('')
  const [unclaimedList, setUnclaimedList] = useState<DvUser[]>([])
  const [selectedId,    setSelectedId]    = useState('')
  const [claiming,      setClaiming]      = useState(false)

  // ── Data ───────────────────────────────────────────────────────────────────
  const [projects,  setProjects]  = useState<Project[]>([])
  const [dvUsers,   setDvUsers]   = useState<DvUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const { msg: toastMsg, show: toastShow, toast } = useToast()

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [formOpen,  setFormOpen]  = useState(false)
  const [delOpen,   setDelOpen]   = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState(emptyForm())

  // ── Add user form ──────────────────────────────────────────────────────────
  const [newUid,     setNewUid]     = useState('')
  const [newName,    setNewName]    = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [addingUser, setAddingUser] = useState(false)

  // ══════════════════════════════════════════════════════════════════════════
  // LIFF INIT
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID

    if (!liffId) {
      // Dev mode — ไม่มี LIFF ID ข้าม auth ไปเลย (admin mode)
      setAuthState('ok')
      setCurrentUser({ id:'dev', line_uid:'dev', name:'Dev Mode', is_admin:1 })
      return
    }

    import('@line/liff').then(({ default: liff }) => {
      liff.init({ liffId })
        .then(() => {
          if (!liff.isLoggedIn()) {
            liff.login()
            return
          }
          liff.getProfile().then(async profile => {
            const uid = profile.userId
            setLineUid(uid)
            setLineAvatar(profile.pictureUrl || '')

            // ตรวจว่า UID นี้ผูกกับชื่อใครแล้วไหม
            const res = await fetch(`/api/me?uid=${uid}`)
            const j   = await res.json()
            if (j.ok) {
              setCurrentUser(j.user)
              setAuthState('ok')
            } else {
              // ยังไม่ได้ผูกชื่อ — ดึงรายชื่อที่ว่างอยู่
              const r2 = await fetch('/api/claim')
              const j2 = await r2.json()
              if (j2.ok && j2.data.length > 0) {
                setUnclaimedList(j2.data)
                setAuthState('select_name')
              } else {
                setAuthState('no_slots')
              }
            }
          })
        })
        .catch(() => setAuthState('error'))
    })
  }, [])

  // ── Claim name ────────────────────────────────────────────────────────────
  async function claimName() {
    if (!selectedId || !lineUid) return
    setClaiming(true)
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedId, line_uid: lineUid }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setCurrentUser(j.user)
      setAuthState('ok')
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + e.message)
    } finally {
      setClaiming(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ══════════════════════════════════════════════════════════════════════════
  const fetchProjects = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/projects')
      const j   = await res.json()
      if (j.ok) setProjects(j.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [currentUser])

  const fetchUsers = useCallback(async () => {
    if (!currentUser?.is_admin) return
    const uid = currentUser.line_uid
    if (!uid) return
    try {
      const res = await fetch('/api/users', { headers:{ 'x-line-uid': uid } })
      const j   = await res.json()
      if (j.ok) setDvUsers(j.data)
    } catch { /* ignore */ }
  }, [currentUser])

  useEffect(() => {
    if (authState === 'ok') { fetchProjects(); fetchUsers() }
  }, [authState, fetchProjects, fetchUsers])

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════
  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
               (p.desc||'').toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setEditId(null); setForm(emptyForm()); setFormOpen(true) }
  function openEdit(p: Project) {
    setEditId(p.id)
    setForm({
      name: p.name, desc: p.desc||'', emoji: p.emoji||'📁', color: p.color||COLORS[0],
      status: p.status, note: p.note||'', line_oa: p.line_oa||'',
      urls:     p.urls.length ? p.urls.map((u,i) => ({ ...u, sort:i })) : [{ id:'', label:'', url:'', sort:0 }],
      accounts: p.accounts.map((a,i) => ({ ...a, sort:i })),
    })
    setFormOpen(true)
  }

  // URL helpers
  function setUrl(i: number, f: 'label'|'url', v: string) {
    setForm(fm => { const urls=[...fm.urls]; urls[i]={...urls[i],[f]:v}; return {...fm,urls} })
  }
  function addUrl()      { setForm(f => ({ ...f, urls:[...f.urls,{id:'',label:'',url:'',sort:f.urls.length}] })) }
  function removeUrl(i: number) { setForm(f => ({ ...f, urls:f.urls.filter((_,idx)=>idx!==i) })) }

  // Account helpers
  function setAcct(i: number, f: 'role'|'email'|'pass'|'assigned_to', v: string) {
    setForm(fm => { const accounts=[...fm.accounts]; accounts[i]={...accounts[i],[f]:v}; return {...fm,accounts} })
  }
  function addAcct()     { setForm(f => ({ ...f, accounts:[...f.accounts,{id:'',role:'',email:'',pass:'',assigned_to:'',sort:f.accounts.length}] })) }
  function removeAcct(i: number) { setForm(f => ({ ...f, accounts:f.accounts.filter((_,idx)=>idx!==i) })) }

  // Save project
  async function save() {
    if (!form.name.trim()) { alert('กรุณาใส่ชื่อโปรเจค'); return }
    setSaving(true)
    try {
      const body = { ...form, urls:form.urls.filter(u=>u.url.trim()), accounts:form.accounts.filter(a=>a.email.trim()||a.role.trim()) }
      const url    = editId ? `/api/projects/${editId}` : '/api/projects'
      const method = editId ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers:{'Content-Type':'application/json','x-line-uid':currentUser?.line_uid||''}, body:JSON.stringify(body) })
      const j      = await res.json()
      if (!j.ok) throw new Error(j.error)
      await fetchProjects()
      setFormOpen(false)
      toast(editId ? '✅ บันทึกการแก้ไขแล้ว' : '✅ เพิ่มโปรเจคสำเร็จ')
    } catch (e: any) { alert('Error: '+e.message) }
    finally { setSaving(false) }
  }

  // Delete project
  function askDelete(p: Project) { setDeleteId(p.id); setDelOpen(true) }
  async function confirmDelete() {
    if (!deleteId) return
    await fetch(`/api/projects/${deleteId}`, { method:'DELETE', headers:{'x-line-uid':currentUser?.line_uid||''} })
    await fetchProjects()
    setDelOpen(false)
    toast('🗑️ ลบโปรเจคแล้ว')
  }

  // Add user
  async function addUser() {
    if (!newUid.trim() || !newName.trim()) { alert('กรุณาใส่ LINE UID และชื่อ'); return }
    setAddingUser(true)
    try {
      const res = await fetch('/api/users', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-line-uid': currentUser?.line_uid||'' },
        body: JSON.stringify({ line_uid:newUid.trim(), name:newName.trim(), is_admin:newIsAdmin?1:0 })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      await fetchUsers()
      setNewUid(''); setNewName(''); setNewIsAdmin(false)
      toast('✅ เพิ่มผู้ใช้แล้ว')
    } catch (e: any) { alert('Error: '+e.message) }
    finally { setAddingUser(false) }
  }

  // Delete user
  async function deleteUser(id: string) {
    if (!confirm('ลบผู้ใช้นี้?')) return
    await fetch('/api/users', { method:'DELETE', headers:{'Content-Type':'application/json','x-line-uid':currentUser?.line_uid||''}, body:JSON.stringify({id}) })
    await fetchUsers()
    toast('🗑️ ลบผู้ใช้แล้ว')
  }

  // Copy
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
    input:   { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.07)', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const },
    select:  { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'#1e293b', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'inherit' },
    label:   { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase' as const, letterSpacing:'.05em', display:'block', marginBottom:5 },
    btnPrim: { padding:'9px 20px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' },
    btnSec:  { padding:'8px 16px', borderRadius:9, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#94a3b8', fontSize:13, cursor:'pointer', fontFamily:'inherit' },
    overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
    modal:   { background:'#1e293b', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:28, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' as const },
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH SCREENS
  // ══════════════════════════════════════════════════════════════════════════
  if (authState === 'loading') return (
    <div style={{ ...S.body, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:16 }}>⏳</div>
        <div style={{ color:'#94a3b8', fontSize:'1rem' }}>กำลังยืนยันตัวตนผ่าน LINE...</div>
      </div>
    </div>
  )

  // ── หน้าเลือกชื่อ (ครั้งแรกที่เข้า) ─────────────────────────────────────
  if (authState === 'select_name') return (
    <div style={{ ...S.body, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:400, padding:'0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'12px 20px', marginBottom:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:18 }}>WH</div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:'1rem', fontWeight:800, color:'#fff' }}>Demo Vault</div>
              <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>WH Group</div>
            </div>
          </div>
          <div style={{ fontSize:'1.1rem', fontWeight:800, color:'#f1f5f9', marginBottom:6 }}>ยินดีต้อนรับ! 👋</div>
          <div style={{ fontSize:'.82rem', color:'#64748b' }}>เลือกชื่อของคุณเพื่อเข้าใช้งาน</div>
        </div>

        {/* Name grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {unclaimedList.map(u => (
            <button key={u.id}
              onClick={() => setSelectedId(u.id)}
              style={{
                padding:'16px 12px', borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                border: selectedId === u.id
                  ? '2px solid #6366f1'
                  : '1px solid rgba(255,255,255,0.08)',
                background: selectedId === u.id
                  ? 'rgba(99,102,241,0.18)'
                  : 'rgba(255,255,255,0.04)',
                color: selectedId === u.id ? '#a5b4fc' : '#94a3b8',
                fontSize:'1rem', fontWeight: selectedId === u.id ? 700 : 500,
                transition:'all .15s',
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
              }}>
              <span style={{ fontSize:'1.6rem' }}>
                {u.name === 'เน็ต'  ? '🧑‍💻' :
                 u.name === 'ตอง'   ? '👨' :
                 u.name === 'จิ๋ว'  ? '👩' :
                 u.name === 'ปิ๋ว'  ? '👩' :
                 u.name === 'อุ๋ม'  ? '🧑' :
                 u.name === 'มอส'   ? '👦' :
                 u.name === 'แพรว'  ? '👧' : '🙂'}
              </span>
              <span>{u.name}</span>
              {u.is_admin === 1 && (
                <span style={{ fontSize:'.6rem', color:'#f97316', fontWeight:700 }}>⚡ Admin</span>
              )}
            </button>
          ))}
        </div>

        {/* Confirm button */}
        <button
          onClick={claimName}
          disabled={!selectedId || claiming}
          style={{
            width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:'inherit',
            background: selectedId ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.06)',
            color: selectedId ? '#fff' : '#475569',
            fontWeight:700, fontSize:'1rem', cursor: selectedId ? 'pointer' : 'not-allowed',
            transition:'all .15s', opacity: claiming ? .7 : 1,
          }}>
          {claiming ? '⏳ กำลังยืนยัน...' : selectedId ? `✅ ยืนยัน — นี่คือฉัน "${unclaimedList.find(u=>u.id===selectedId)?.name}"` : 'เลือกชื่อของคุณก่อน'}
        </button>

        <p style={{ textAlign:'center', fontSize:'.72rem', color:'#334155', marginTop:12 }}>
          หลังจากยืนยันแล้ว LINE ของคุณจะถูกผูกกับชื่อนี้ถาวร
        </p>
      </div>
    </div>
  )

  if (authState === 'no_slots') return (
    <div style={{ ...S.body, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:'3rem', marginBottom:16 }}>🔒</div>
        <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>ไม่มีชื่อว่าง</div>
        <div style={{ color:'#64748b', fontSize:'.85rem' }}>
          ทุกชื่อถูกผูกไปแล้ว<br/>ติดต่อ Admin เพื่อเพิ่มชื่อใหม่
        </div>
      </div>
    </div>
  )

  if (authState === 'error') return (
    <div style={{ ...S.body, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:16 }}>❌</div>
        <div style={{ color:'#f87171' }}>เกิดข้อผิดพลาด กรุณาลองใหม่</div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN APP
  // ══════════════════════════════════════════════════════════════════════════
  const isAdmin = currentUser?.is_admin === 1

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
          {/* User badge */}
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:12, borderLeft:'1px solid rgba(255,255,255,0.1)' }}>
            {lineAvatar && <img src={lineAvatar} style={{ width:32, height:32, borderRadius:'50%' }} alt="" />}
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:'.8rem', fontWeight:700, color:'#e2e8f0' }}>{currentUser?.name}</div>
              {isAdmin && <div style={{ fontSize:'.65rem', color:'#f97316', fontWeight:700 }}>⚡ Admin</div>}
            </div>
          </div>
        </div>
        <p style={{ fontSize:'.75rem', color:'#475569' }}>🔒 ยืนยันตัวตนผ่าน LINE · เห็นเฉพาะข้อมูลของตัวเอง</p>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ maxWidth:1100, margin:'0 auto 24px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาโปรเจค..."
            style={{ ...S.input, paddingLeft:36, borderRadius:10 }} />
        </div>
        {isAdmin && <>
          <button onClick={()=>{ fetchUsers(); setUsersOpen(true) }}
            style={{ ...S.btnSec, color:'#a5b4fc', borderColor:'rgba(99,102,241,0.4)' }}>
            👥 จัดการผู้ใช้
          </button>
          <button onClick={openAdd} style={S.btnPrim}>＋ เพิ่มโปรเจค</button>
        </>}
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
          <ProjectCard key={p.id} p={p}
            onEdit={isAdmin ? ()=>openEdit(p) : undefined}
            onDelete={isAdmin ? ()=>askDelete(p) : undefined}
            copy={copy} copiedId={copiedId}
            currentLineUid={currentUser?.line_uid || ''}
            isAdmin={isAdmin}
            dvUsers={dvUsers}
          />
        ))}
      </div>

      {/* ════════════════════════════════════════
          USER MANAGEMENT MODAL (Admin only)
      ════════════════════════════════════════ */}
      {usersOpen && isAdmin && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setUsersOpen(false) }}>
          <div style={{ ...S.modal, maxWidth:560 }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:'1rem', color:'#f1f5f9', margin:0 }}>👥 จัดการผู้ใช้</h2>
              <button onClick={()=>setUsersOpen(false)} style={{ ...S.btnSec, marginLeft:'auto', padding:'5px 12px' }}>✕</button>
            </div>

            {/* รายชื่อผู้ใช้ */}
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
              {dvUsers.length === 0 ? (
                <div style={{ padding:20, textAlign:'center', color:'#475569', fontSize:13 }}>ยังไม่มีผู้ใช้</div>
              ) : dvUsers.map(u => (
                <div key={u.id} style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:'.85rem', color:'#f1f5f9' }}>{u.name}</span>
                      {u.is_admin === 1 && <span style={{ fontSize:'.65rem', color:'#f97316', fontWeight:700, padding:'1px 6px', borderRadius:4, background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)' }}>Admin</span>}
                    </div>
                    <div style={{ fontSize:'.72rem', color:'#475569', fontFamily:'monospace' }}>{u.line_uid}</div>
                  </div>
                  {u.line_uid !== currentUser?.line_uid && (
                    <button onClick={()=>deleteUser(u.id)}
                      style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.1)', color:'#f87171', cursor:'pointer', fontSize:13 }}>
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* เพิ่มผู้ใช้ใหม่ */}
            <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>＋ เพิ่มผู้ใช้ใหม่</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                <input style={{ ...S.input, fontSize:12 }} value={newUid} onChange={e=>setNewUid(e.target.value)}
                  placeholder="LINE UID (Uxxxxxxxx)" />
                <input style={{ ...S.input, fontSize:12 }} value={newName} onChange={e=>setNewName(e.target.value)}
                  placeholder="ชื่อ เช่น Net, Arm, Ploy" />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#94a3b8', cursor:'pointer' }}>
                  <input type="checkbox" checked={newIsAdmin} onChange={e=>setNewIsAdmin(e.target.checked)} />
                  เป็น Admin
                </label>
                <button onClick={addUser} disabled={addingUser} style={{ ...S.btnPrim, marginLeft:'auto', padding:'7px 16px', fontSize:12, opacity:addingUser?.6:1 }}>
                  {addingUser ? '⏳...' : '＋ เพิ่ม'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ADD / EDIT MODAL (Admin only)
      ════════════════════════════════════════ */}
      {formOpen && isAdmin && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setFormOpen(false) }}>
          <div style={S.modal}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:'1rem', color:'#f1f5f9', margin:0 }}>
                {editId ? '✎ แก้ไขโปรเจค' : '＋ เพิ่มโปรเจคใหม่'}
              </h2>
              <button onClick={()=>setFormOpen(false)} style={{ ...S.btnSec, marginLeft:'auto', padding:'5px 12px' }}>✕</button>
            </div>

            {/* Name + Desc */}
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>ชื่อโปรเจค *</label>
              <input style={S.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="เช่น TimeLine HR" />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>คำอธิบาย</label>
              <input style={S.input} value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="เช่น HR SaaS · Attendance" />
            </div>

            {/* Emoji + Status */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, marginBottom:12 }}>
              <div>
                <label style={S.label}>ไอคอน</label>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))}
                      style={{ width:32, height:32, borderRadius:7, border:`1px solid ${form.emoji===e?'#f97316':'rgba(255,255,255,0.1)'}`, background:form.emoji===e?'rgba(249,115,22,0.15)':'rgba(255,255,255,0.05)', fontSize:15, cursor:'pointer' }}>
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
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>สีการ์ด</label>
              <div style={{ display:'flex', gap:7, marginTop:4 }}>
                {COLORS.map((c,i) => (
                  <div key={i} onClick={()=>setForm(f=>({...f,color:c}))}
                    style={{ width:26, height:26, borderRadius:6, background:COLOR_HEX[i], cursor:'pointer', border:`2px solid ${form.color===c?'#fff':'transparent'}`, transform:form.color===c?'scale(1.2)':'scale(1)', transition:'all .15s' }} />
                ))}
              </div>
            </div>

            {/* Line OA */}
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>💚 Line OA URL</label>
              <input style={S.input} value={form.line_oa} onChange={e=>setForm(f=>({...f,line_oa:e.target.value}))}
                placeholder="https://lin.ee/xxxxxxx" />
            </div>

            {/* URLs */}
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ ...S.label, margin:0 }}>🌐 URLs ({form.urls.length})</span>
                <button onClick={addUrl} style={{ ...S.btnSec, padding:'4px 10px', fontSize:12, color:'#f97316', borderColor:'rgba(249,115,22,0.3)' }}>＋ เพิ่ม</button>
              </div>
              {form.urls.map((u,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 2fr auto', gap:6, marginBottom:7, alignItems:'center' }}>
                  <input style={{ ...S.input, fontSize:12 }} value={u.label} onChange={e=>setUrl(i,'label',e.target.value)} placeholder="Label" />
                  <input style={{ ...S.input, fontSize:12 }} value={u.url}   onChange={e=>setUrl(i,'url',e.target.value)}   placeholder="https://..." />
                  <button onClick={()=>removeUrl(i)} style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.1)', color:'#f87171', cursor:'pointer', fontSize:13 }}>✕</button>
                </div>
              ))}
            </div>

            {/* Accounts */}
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ ...S.label, margin:0 }}>👤 บัญชีทดสอบ ({form.accounts.length})</span>
                <button onClick={addAcct} style={{ ...S.btnSec, padding:'4px 10px', fontSize:12, color:'#60a5fa', borderColor:'rgba(96,165,250,0.3)' }}>＋ เพิ่ม</button>
              </div>
              {form.accounts.length === 0 && (
                <div style={{ textAlign:'center', color:'#475569', fontSize:12, padding:'8px 0' }}>กด "+ เพิ่ม" เพื่อเพิ่ม Username/Password</div>
              )}
              {form.accounts.map((a,i) => (
                <div key={i} style={{ background:'rgba(0,0,0,0.15)', borderRadius:9, padding:10, marginBottom:8 }}>
                  <div style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
                    <input style={{ ...S.input, fontSize:12, flex:1 }} value={a.role} onChange={e=>setAcct(i,'role',e.target.value)} placeholder="Role เช่น Admin, Manager" />
                    <button onClick={()=>removeAcct(i)} style={{ width:26, height:26, borderRadius:6, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.1)', color:'#f87171', cursor:'pointer', fontSize:12, flexShrink:0 }}>✕</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <input style={{ ...S.input, fontSize:12 }} value={a.email} onChange={e=>setAcct(i,'email',e.target.value)} placeholder="Username / Email" />
                    <input style={{ ...S.input, fontSize:12 }} value={a.pass}  onChange={e=>setAcct(i,'pass',e.target.value)}  placeholder="Password" />
                  </div>
                  {/* Assign to users — Multi-select checkboxes */}
                  <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:10, color:'#6366f1', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em', marginBottom:6 }}>🔒 เห็นได้โดย</div>
                    {/* ทุกคน */}
                    <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color: !a.assigned_to ? '#4ade80':'#94a3b8', cursor:'pointer', marginBottom:5 }}>
                      <input type="checkbox"
                        checked={!a.assigned_to}
                        onChange={() => setAcct(i,'assigned_to','')}
                        style={{ accentColor:'#4ade80', width:14, height:14 }}
                      />
                      🌐 ทุกคนเห็นได้ (Shared)
                    </label>
                    {/* แต่ละคน */}
                    <div style={{ display:'flex', flexWrap:'wrap' as const, gap:'4px 16px' }}>
                      {dvUsers.map(u => {
                        const uids    = a.assigned_to ? a.assigned_to.split(',').filter(Boolean) : []
                        const checked = uids.includes(u.line_uid)
                        return (
                          <label key={u.line_uid} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color: checked ? '#a5b4fc':'#94a3b8', cursor:'pointer', padding:'2px 0' }}>
                            <input type="checkbox"
                              checked={checked}
                              onChange={e => {
                                const cur = a.assigned_to ? a.assigned_to.split(',').filter(Boolean) : []
                                const next = e.target.checked
                                  ? [...cur, u.line_uid]
                                  : cur.filter(id => id !== u.line_uid)
                                setAcct(i,'assigned_to', next.join(','))
                              }}
                              style={{ accentColor:'#6366f1', width:14, height:14 }}
                            />
                            {u.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>หมายเหตุ</label>
              <textarea style={{ ...S.input, resize:'vertical', minHeight:56 }} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="เช่น ต้อง VPN ก่อนเปิด..." />
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setFormOpen(false)} style={S.btnSec}>ยกเลิก</button>
              <button onClick={save} disabled={saving} style={{ ...S.btnPrim, opacity:saving?.6:1 }}>
                {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delOpen && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setDelOpen(false) }}>
          <div style={{ ...S.modal, maxWidth:360, textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🗑️</div>
            <h3 style={{ color:'#f1f5f9', marginBottom:8 }}>ยืนยันการลบ?</h3>
            <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:20 }}>ต้องการลบโปรเจคนี้ออกจาก Vault?</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={()=>setDelOpen(false)} style={S.btnSec}>ยกเลิก</button>
              <button onClick={confirmDelete} style={{ ...S.btnPrim, background:'#dc2626' }}>ลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={{
        position:'fixed', bottom:24, right:24, zIndex:9999,
        background:'#1e293b', border:'1px solid rgba(255,255,255,0.12)',
        color:'#f1f5f9', padding:'10px 18px', borderRadius:10,
        fontSize:'.82rem', fontWeight:600,
        opacity:toastShow?1:0, transform:toastShow?'translateY(0)':'translateY(8px)',
        transition:'all .2s', pointerEvents:'none',
      }}>
        {toastMsg}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Project Card
// ══════════════════════════════════════════════════════════════════════════════
function ProjectCard({ p, onEdit, onDelete, copy, copiedId, currentLineUid, isAdmin, dvUsers }: {
  p: Project
  onEdit?: () => void
  onDelete?: () => void
  copy: (t: string, id: string) => void
  copiedId: string
  currentLineUid: string
  isAdmin: boolean
  dvUsers: DvUser[]
}) {
  const s = STATUS_CFG[p.status] || STATUS_CFG.LIVE
  const [revealPass, setRevealPass] = useState<Record<string,boolean>>({})

  // เห็น pass ได้ถ้า: assigned_to ว่าง (shared) หรือ UID อยู่ในลิสต์ หรือ เป็น admin
  function canSee(a: ProjectAccount) {
    if (!a.assigned_to) return true
    if (isAdmin)        return true
    const uids = a.assigned_to.split(',').map(s => s.trim()).filter(Boolean)
    return uids.includes(currentLineUid)
  }

  // หาชื่อจาก LINE UID
  function userName(uid: string) {
    return dvUsers.find(u => u.line_uid === uid.trim())?.name || uid.slice(0,8)+'...'
  }

  // แสดงชื่อเจ้าของหลายคน
  function ownerNames(assigned_to: string) {
    return assigned_to.split(',').filter(Boolean).map(uid => userName(uid)).join(', ')
  }

  return (
    <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, overflow:'hidden', backdropFilter:'blur(12px)', transition:'transform .15s,box-shadow .15s' }}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='';(e.currentTarget as HTMLDivElement).style.boxShadow=''}}>

      {/* Header */}
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width:40, height:40, borderRadius:11, background:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
          {p.emoji||'📁'}
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontWeight:700, fontSize:'.92rem', color:'#f1f5f9' }}>{p.name}</div>
          {p.desc && <div style={{ fontSize:'.72rem', color:'#64748b', marginTop:2 }}>{p.desc}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {p.line_oa && (
            <a href={p.line_oa} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:8, background:'rgba(0,185,0,0.15)', border:'1px solid rgba(0,185,0,0.35)', color:'#4ade80', fontSize:'.72rem', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
              💚 LINE OA
            </a>
          )}
          <span style={{ padding:'3px 9px', borderRadius:20, fontSize:'.67rem', fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
            {s.label}
          </span>
          {onEdit && (
            <button onClick={onEdit} style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#94a3b8', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✎</button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{ width:28, height:28, borderRadius:7, border:'1px solid rgba(220,38,38,0.2)', background:'rgba(220,38,38,0.08)', color:'#f87171', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>🗑</button>
          )}
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
            {p.urls.map(u => (
              <div key={u.id} style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:'.68rem', color:'#64748b', fontWeight:600, marginBottom:1 }}>{u.label}</div>
                  <a href={u.url} target="_blank" rel="noreferrer"
                    style={{ fontSize:'.78rem', color:'#60a5fa', textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    🔗 {u.url}
                  </a>
                </div>
                <button onClick={()=>copy(u.url,`url-${u.id}`)}
                  style={{ padding:'2px 7px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:copiedId===`url-${u.id}`?'rgba(22,163,74,0.2)':'rgba(255,255,255,0.05)', color:copiedId===`url-${u.id}`?'#4ade80':'#64748b', fontSize:'.67rem', cursor:'pointer', transition:'all .15s' }}>
                  {copiedId===`url-${u.id}`?'✓':'copy'}
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
              {p.accounts.map(a => {
                const uid      = `acct-${a.id}`
                const visible  = canSee(a)
                const revealed = revealPass[a.id]
                const text     = `${a.email} | ${a.pass}`

                return (
                  <div key={a.id} style={{ padding:'8px 11px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:7 }}>
                    {a.role && (
                      <span style={{ padding:'2px 7px', borderRadius:6, fontSize:'.67rem', fontWeight:700, background:'rgba(249,115,22,0.12)', color:'#fb923c', border:'1px solid rgba(249,115,22,0.25)', flexShrink:0, whiteSpace:'nowrap' }}>
                        {a.role}
                      </span>
                    )}
                    {visible ? (
                      <>
                        <span style={{ fontSize:'.77rem', color:'#94a3b8', fontFamily:'monospace', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {a.email}
                        </span>
                        {/* Password — blur จนกว่าจะกด */}
                        <span
                          onClick={()=>setRevealPass(r=>({...r,[a.id]:!r[a.id]}))}
                          title={revealed?'คลิกซ่อน':'คลิกดูรหัสผ่าน'}
                          style={{ fontSize:'.77rem', fontFamily:'monospace', flexShrink:0, cursor:'pointer', minWidth:70, textAlign:'center', padding:'1px 5px', borderRadius:5, transition:'all .2s',
                            color: revealed?'#cbd5e1':'transparent',
                            background: revealed?'transparent':'rgba(255,255,255,0.07)',
                            filter: revealed?'none':'blur(5px)',
                            userSelect: revealed?'auto':'none',
                          }}>
                          {revealed ? a.pass : '••••••••'}
                        </span>
                        <button onClick={()=>copy(text,uid)}
                          style={{ padding:'2px 7px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:copiedId===uid?'rgba(22,163,74,0.2)':'rgba(255,255,255,0.05)', color:copiedId===uid?'#4ade80':'#64748b', fontSize:'.67rem', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                          {copiedId===uid?'✓':'copy'}
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize:'.75rem', color:'#334155', flex:1, fontStyle:'italic' }}>
                        🔒 บัญชีของ {ownerNames(a.assigned_to)}
                      </span>
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
            {p.note.split('\n').map((line,i) => <span key={i}>{line}{i<p.note.split('\n').length-1&&<br/>}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}
