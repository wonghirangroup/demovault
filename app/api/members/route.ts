import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET /api/members — ดึง id + name ของทุกคน (ไม่มี sensitive data)
// ใช้สำหรับ canSee logic และ ownerNames display
export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_admin FROM dv_users ORDER BY name ASC'
    ) as any[]
    return NextResponse.json({ ok: true, data: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
