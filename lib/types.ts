export interface ProjectUrl {
  id:    string
  label: string   // "Admin Portal", "Employee LIFF", "Backend API"
  url:   string
  sort:  number
}

export interface ProjectAccount {
  id:          string
  role:        string   // "Admin", "Super Admin", "HR Manager"
  email:       string
  pass:        string
  assigned_to: string   // ชื่อคนที่บัญชีนี้เป็นของ (ว่าง = ทุกคนเห็น)
  sort:        number
}

export type ProjectStatus = 'LIVE' | 'DEMO' | 'DEV' | 'DOWN'

export interface Project {
  id:       string
  name:     string
  desc:     string
  emoji:    string
  color:    string
  status:   ProjectStatus
  note:     string
  line_oa:  string      // Line OA URL
  urls:     ProjectUrl[]
  accounts: ProjectAccount[]
  sort:     number
  created_at: string
}
