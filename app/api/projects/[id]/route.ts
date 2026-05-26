import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// ── PUT update project ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()

    await pool.query(
      `UPDATE dv_projects SET name=?, description=?, emoji=?, color=?, status=?, note=?, sort_order=? WHERE id=?`,
      [body.name, body.desc||'', body.emoji||'📁', body.color||'', body.status||'LIVE', body.note||'', body.sort||0, id]
    )

    // replace urls
    await pool.query('DELETE FROM dv_urls WHERE project_id=?', [id])
    for (let i = 0; i < (body.urls||[]).length; i++) {
      const u = body.urls[i]
      await pool.query(
        'INSERT INTO dv_urls (id, project_id, label, url, sort_order) VALUES (?,?,?,?,?)',
        [uuidv4(), id, u.label, u.url, i]
      )
    }

    // replace accounts
    await pool.query('DELETE FROM dv_accounts WHERE project_id=?', [id])
    for (let i = 0; i < (body.accounts||[]).length; i++) {
      const a = body.accounts[i]
      await pool.query(
        'INSERT INTO dv_accounts (id, project_id, role, email, pass, sort_order) VALUES (?,?,?,?,?,?)',
        [uuidv4(), id, a.role||'', a.email||'', a.pass||'', i]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── DELETE project ────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await pool.query('DELETE FROM dv_projects WHERE id=?', [params.id])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
