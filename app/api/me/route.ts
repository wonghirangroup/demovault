import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/me?uid=Uxxxxxxxx
// ตรวจสอบว่า LINE UID นี้มีสิทธิ์เข้าระบบไหม
export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid')
    if (!uid) return NextResponse.json({ ok: false, error: 'missing uid' }, { status: 400 })

    const [rows] = await pool.query(
      'SELECT id, line_uid, name, is_admin FROM dv_users WHERE line_uid = ? LIMIT 1',
      [uid]
    ) as any[]

    if (!(rows as any[]).length) {
      return NextResponse.json({ ok: false, error: 'not_registered' }, { status: 403 })
    }

    return NextResponse.json({ ok: true, user: (rows as any[])[0] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
