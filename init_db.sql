-- 在 Supabase SQL Editor 里运行这个文件，一次性建好两张表

-- 大学表
CREATE TABLE IF NOT EXISTS unis (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  abbr  TEXT,
  state TEXT NOT NULL,
  city  TEXT
);

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
  id       SERIAL PRIMARY KEY,
  uni_id   TEXT NOT NULL REFERENCES unis(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  code     TEXT,
  atar     TEXT,
  eng      INT,
  eal      INT,
  maths    TEXT,
  duration TEXT,
  intake   TEXT,
  fees     TEXT,
  notes    TEXT,
  url      TEXT
);

-- 初始数据：RMIT
INSERT INTO unis VALUES ('rmit','RMIT University','RMIT','VIC','墨尔本')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (uni_id,name,code,atar,eng,eal,maths,duration,intake,fees,notes,url) VALUES
  ('rmit','Bachelor of Construction Management (Honours)','BH114','65.15',25,27,'任意数学 ≥20分','全日制 4 年','2月、7月','CSP 补贴学位','女性申请人额外加分；CIOB RICS AIQS AIB 认证','https://www.rmit.edu.au/study-with-us/levels-of-study/undergraduate-study/honours-degrees/bachelor-of-construction-management-honours-bh114'),
  ('rmit','Bachelor of Engineering (Civil and Infrastructure) (Honours)','BH077','80.00',25,27,'数学方法 ≥25分','全日制 4 年','2月','CSP 补贴学位','',''),
  ('rmit','Bachelor of Computer Science (Honours)','BH013','78.00',25,27,'任意数学 ≥20分','全日制 4 年','2月、7月','CSP 补贴学位','','');

-- 初始数据：UniMelb
INSERT INTO unis VALUES ('unimelb','University of Melbourne','UniMelb','VIC','墨尔本')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (uni_id,name,code,atar,eng,eal,maths,duration,intake,fees,notes,url) VALUES
  ('unimelb','Bachelor of Commerce','B-COM','96.00',30,33,'','全日制 3 年','3月','CSP 补贴学位','',''),
  ('unimelb','Bachelor of Science','B-SCI','90.00',30,33,'数学方法 ≥25分','全日制 3 年','3月','CSP 补贴学位','','');
