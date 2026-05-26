import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// ── helper: ตรวจสอบว่าผู้ร้องขอเป็น Admin ──────────────────────────────────
async function isAdmin(req: NextRequest): Promise<boolean> {
  const uid = req.headers.get('x-line-uid') || ''
  if (!uid) return false
  if (uid === 'dev') return true
  const [rows] = await pool.query(
    'SELECT is_admin FROM dv_users WHERE line_uid = ? LIMIT 1', [uid]
  ) as any[]
  return (rows as any[]).length > 0 && (rows as any[])[0].is_admin === 1
}

// ── PUT update project (Admin เท่านั้น) ────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()

    await pool.query(
      `UPDATE dv_projects SET name=?, description=?, emoji=?, color=?, status=?, note=?, line_oa=?, sort_order=? WHERE id=?`,
      [body.name, body.desc||'', body.emoji||'📁', body.color||'', body.status||'LIVE', body.note||'', body.line_oa||'', body.sort||0, id]
    )

    await pool.query('DELETE FROM dv_urls WHERE project_id=?', [id])
    for (let i = 0; i < (body.urls||[]).length; i++) {
      const u = body.urls[i]
      await pool.query(
        'INSERT INTO dv_urls (id, project_id, label, url, sort_order) VALUES (?,?,?,?,?)',
        [uuidv4(), id, u.label, u.url, i]
      )
    }

    await pool.query('DELETE FROM dv_accounts WHERE project_id=?', [id])
    for (let i = 0; i < (body.accounts||[]).length; i++) {
      const a = body.accounts[i]
      await pool.query(
        'INSERT INTO dv_accounts (id, project_id, role, email, pass, assigned_to, sort_order) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), id, a.role||'', a.email||'', a.pass||'', a.assigned_to||'', i]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── DELETE project (Admin เท่านั้น) ────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }
    await pool.query('DELETE FROM dv_projects WHERE id=?', [params.id])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
