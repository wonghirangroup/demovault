import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// ── helper: ตรวจสอบว่าผู้ร้องขอเป็น Admin ──────────────────────────────────
async function isAdmin(req: NextRequest): Promise<boolean> {
  const uid = req.headers.get('x-line-uid') || ''
  if (!uid) return false
  // dev mode
  if (uid === 'dev') return true
  const [rows] = await pool.query(
    'SELECT is_admin FROM dv_users WHERE line_uid = ? LIMIT 1', [uid]
  ) as any[]
  return (rows as any[]).length > 0 && (rows as any[])[0].is_admin === 1
}

// ── GET all projects (ทุกคนที่ login แล้วดูได้) ────────────────────────────
export async function GET() {
  try {
    const [projects] = await pool.query(
      'SELECT * FROM dv_projects ORDER BY sort_order ASC, created_at DESC'
    ) as any[]

    const [urls]     = await pool.query('SELECT * FROM dv_urls ORDER BY sort_order ASC') as any[]
    const [accounts] = await pool.query('SELECT * FROM dv_accounts ORDER BY sort_order ASC') as any[]

    const result = (projects as any[]).map((p: any) => ({
      ...p,
      desc:     p.description,
      line_oa:  p.line_oa || '',
      urls:     (urls     as any[]).filter((u: any) => u.project_id === p.id),
      accounts: (accounts as any[]).filter((a: any) => a.project_id === p.id),
    }))

    return NextResponse.json({ ok: true, data: result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── POST create project (Admin เท่านั้น) ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const id = uuidv4()

    await pool.query(
      `INSERT INTO dv_projects (id, name, description, emoji, color, status, note, line_oa, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.name, body.desc||'', body.emoji||'📁', body.color||'', body.status||'LIVE', body.note||'', body.line_oa||'', body.sort||0]
    )

    for (let i = 0; i < (body.urls||[]).length; i++) {
      const u = body.urls[i]
      await pool.query(
        'INSERT INTO dv_urls (id, project_id, label, url, sort_order) VALUES (?,?,?,?,?)',
        [uuidv4(), id, u.label, u.url, i]
      )
    }

    for (let i = 0; i < (body.accounts||[]).length; i++) {
      const a = body.accounts[i]
      await pool.query(
        'INSERT INTO dv_accounts (id, project_id, role, email, pass, assigned_to, sort_order) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), id, a.role||'', a.email||'', a.pass||'', a.assigned_to||'', i]
      )
    }

    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
