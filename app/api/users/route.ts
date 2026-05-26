import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// ── helper: ตรวจสอบว่าผู้ร้องขอเป็น Admin ──────────────────────────────────
async function isAdmin(req: NextRequest): Promise<boolean> {
  const uid = req.headers.get('x-line-uid') || ''
  if (!uid) return false
  const [rows] = await pool.query(
    'SELECT is_admin FROM dv_users WHERE line_uid = ? LIMIT 1', [uid]
  ) as any[]
  return (rows as any[]).length > 0 && (rows as any[])[0].is_admin === 1
}

// ── GET /api/users — ดึงรายชื่อทั้งหมด (Admin เท่านั้น) ──────────────────
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }
    const [rows] = await pool.query(
      'SELECT id, line_uid, name, is_admin, created_at FROM dv_users ORDER BY created_at ASC'
    ) as any[]
    return NextResponse.json({ ok: true, data: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── POST /api/users — เพิ่มผู้ใช้ใหม่ (Admin เท่านั้น) ──────────────────
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const { line_uid, name, is_admin = 0 } = body
    if (!line_uid || !name) {
      return NextResponse.json({ ok: false, error: 'line_uid and name required' }, { status: 400 })
    }
    const id = uuidv4()
    await pool.query(
      'INSERT INTO dv_users (id, line_uid, name, is_admin) VALUES (?,?,?,?)',
      [id, line_uid.trim(), name.trim(), is_admin ? 1 : 0]
    )
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ ok: false, error: 'LINE UID นี้มีอยู่แล้ว' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── DELETE /api/users — ลบผู้ใช้ (Admin เท่านั้น) ─────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })
    await pool.query('DELETE FROM dv_users WHERE id = ?', [id])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
