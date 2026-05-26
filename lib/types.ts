export interface ProjectUrl {
  id:    string
  label: string
  url:   string
  sort:  number
}

export interface ProjectAccount {
  id:          string
  role:        string
  email:       string
  pass:        string
  assigned_to: string   // LINE UID ของเจ้าของบัญชี (ว่าง = ทุกคนเห็น)
  sort:        number
}

export type ProjectStatus = 'LIVE' | 'DEMO' | 'DEV' | 'DOWN'

export interface Project {
  id:         string
  name:       string
  desc:       string
  emoji:      string
  color:      string
  status:     ProjectStatus
  note:       string
  line_oa:    string
  urls:       ProjectUrl[]
  accounts:   ProjectAccount[]
  sort:       number
  created_at: string
}

export interface DvUser {
  id:       string
  line_uid: string
  name:     string
  is_admin: number   // 0 | 1
}
