import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// ── GET /api/claim — ดึงรายชื่อที่ยังไม่มี LINE UID (unclaimed) ────────────
export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_admin FROM dv_users WHERE line_uid IS NULL ORDER BY name ASC'
    ) as any[]
    return NextResponse.json({ ok: true, data: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// ── POST /api/claim — ผูก LINE UID กับชื่อที่เลือก ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { user_id, line_uid } = await req.json()
    if (!user_id || !line_uid) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
    }

    // ตรวจว่า UID นี้ถูกใช้ไปแล้วไหม
    const [existing] = await pool.query(
      'SELECT id FROM dv_users WHERE line_uid = ? LIMIT 1', [line_uid]
    ) as any[]
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ ok: false, error: 'uid_taken' }, { status: 409 })
    }

    // ตรวจว่า user_id นี้ยังไม่มี UID (ป้องกันการ claim ซ้ำ)
    const [target] = await pool.query(
      'SELECT id, line_uid FROM dv_users WHERE id = ? LIMIT 1', [user_id]
    ) as any[]
    if (!(target as any[]).length) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 })
    }
    if ((target as any[])[0].line_uid) {
      return NextResponse.json({ ok: false, error: 'already_claimed' }, { status: 409 })
    }

    // ผูก UID
    await pool.query('UPDATE dv_users SET line_uid = ? WHERE id = ?', [line_uid, user_id])

    // ดึง user ที่ updated มาส่งกลับ
    const [updated] = await pool.query(
      'SELECT id, line_uid, name, is_admin FROM dv_users WHERE id = ? LIMIT 1', [user_id]
    ) as any[]

    return NextResponse.json({ ok: true, user: (updated as any[])[0] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
