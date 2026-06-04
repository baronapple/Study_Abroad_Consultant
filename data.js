/**
 * data.js — API 层
 * 本地开发：API_BASE = 'http://localhost:5000/api'
 * 部署后：  API_BASE = '' （同域，不需要写域名）
 */

const API_BASE = '/api';   // ← 部署到 Render 后这行不用改

let UNIS = [];

async function loadUnisFromServer() {
  const res = await fetch(`${API_BASE}/unis`);
  if (!res.ok) throw new Error('无法连接服务器');
  UNIS = await res.json();
}

async function apiAddCourse(uniName, uniAbbr, state, city, course) {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uni_name: uniName, uni_abbr: uniAbbr, state, city, course })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || '添加失败'); }
  return res.json();
}

async function apiUpdateCourse(uniId, courseIdx, fields) {
  const res = await fetch(`${API_BASE}/courses/${uniId}/${courseIdx}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
  if (!res.ok) throw new Error('更新失败');
  return res.json();
}

async function apiDeleteCourse(uniId, courseIdx) {
  const res = await fetch(`${API_BASE}/courses/${uniId}/${courseIdx}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('删除失败');
  return res.json();
}
