-- Run this in phpMyAdmin → database: Demoweb

CREATE TABLE IF NOT EXISTS dv_projects (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  emoji       VARCHAR(10)  DEFAULT '📁',
  color       VARCHAR(255) DEFAULT 'linear-gradient(135deg,#f97316,#ea580c)',
  status      ENUM('LIVE','DEMO','DEV','DOWN') DEFAULT 'LIVE',
  note        TEXT,
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dv_urls (
  id         VARCHAR(36)  PRIMARY KEY,
  project_id VARCHAR(36)  NOT NULL,
  label      VARCHAR(100) NOT NULL,
  url        VARCHAR(1000) NOT NULL,
  sort_order INT          DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES dv_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dv_accounts (
  id         VARCHAR(36)  PRIMARY KEY,
  project_id VARCHAR(36)  NOT NULL,
  role       VARCHAR(100) DEFAULT '',
  email      VARCHAR(255) DEFAULT '',
  pass       VARCHAR(255) DEFAULT '',
  sort_order INT          DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES dv_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed: TimeLine HR
INSERT IGNORE INTO dv_projects (id, name, description, emoji, color, status, note) VALUES
('proj-timeline','TimeLine HR','HR SaaS · Attendance & Leave · Multi-tenant','📅','linear-gradient(135deg,#f97316,#ea580c)','LIVE','Demo mode: ข้อมูลเก็บใน localStorage ไม่กระทบ production');

INSERT IGNORE INTO dv_urls (id, project_id, label, url, sort_order) VALUES
('url-tl-1','proj-timeline','Admin Portal',            'https://timeline-admin.vercel.app',                             1),
('url-tl-2','proj-timeline','Super Admin Dashboard',   'https://timeline-admin.vercel.app/superadmin/dashboard',        2),
('url-tl-3','proj-timeline','Employee LIFF',           'https://timeline-employee.vercel.app',                          3),
('url-tl-4','proj-timeline','Backend API',             'https://timeline-52hp.onrender.com',                            4);

INSERT IGNORE INTO dv_accounts (id, project_id, role, email, pass, sort_order) VALUES
('acc-tl-1','proj-timeline','🏢 Admin',       'admin@wonghiran.com',  'Password123!', 1),
('acc-tl-2','proj-timeline','🔐 Super Admin', 'admin@timeline.local', 'Password123!', 2),
('acc-tl-3','proj-timeline','📱 Employee LIFF','(Line Login)',         '— ผ่าน Line เท่านั้น', 3);
