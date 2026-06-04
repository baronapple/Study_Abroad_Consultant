"""
VCE Advisor - Flask 后端（Supabase 版）
本地开发：
  pip install -r requirements.txt
  python server.py

部署到 Render：
  - 把整个文件夹推到 GitHub
  - Render 会自动读取 requirements.txt 并运行 server.py
"""

import os
from flask import Flask, jsonify, request, send_from_directory 
from flask_cors import CORS
from supabase import create_client, Client
# from flask.cli import load_dotenv

# load_dotenv() 
# # 本地开发时从 .env 文件加载环境变量，部署后 Render 会自动设置环境变量

app = Flask(__name__, static_folder='.')
CORS(app)

# ── Supabase 连接（从环境变量读取，本地开发用 .env）
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─────────────────────────────────────────────
# 数据结构说明（Supabase 里两张表）：
#
# unis 表：
#   id        text  PRIMARY KEY  (如 "rmit", "u_1234")
#   name      text
#   abbr      text
#   state     text
#   city      text
#
# courses 表：
#   id        serial PRIMARY KEY
#   uni_id    text   REFERENCES unis(id)
#   name      text
#   code      text
#   atar      text
#   eng       int
#   eal       int
#   maths     text
#   duration  text
#   intake    text
#   fees      text
#   notes     text
#   url       text
# ─────────────────────────────────────────────

def load_all():
    """读取所有大学和课程，带有地毯式排查打印"""
    print("\n[STEP 1] 🚀 开始进入 load_all() 函数...")
    
    # ── 1. 测试 unis 表查询
    try:
        print("[STEP 2] 正在尝试读取 Supabase 的 'unis' 表...")
        unis_res = supabase.table('unis').select('*').execute()
        print(f"[STEP 3] ✅ 'unis' 表读取成功！拿到 {len(unis_res.data)} 条大学数据。")
        unis = unis_res.data
    except Exception as e:
        print(f"❌ [ERROR] 在读取 'unis' 表时崩溃了！具体错误是: {str(e)}")
        return [{"id": "error", "name": f"数据库unis表读取失败: {str(e)}", "courses": []}]

    # ── 2. 测试 courses 表查询
    try:
        print("[STEP 4] 正在尝试读取 Supabase 的 'courses' 表...")
        courses_res = supabase.table('courses').select('*').execute()
        print(f"[STEP 5] ✅ 'courses' 表读取成功！拿到 {len(courses_res.data)} 条课程数据。")
        courses = courses_res.data
    except Exception as e:
        print(f"❌ [ERROR] 在读取 'courses' 表时崩溃了！具体错误是: {str(e)}")
        return [{"id": "error", "name": f"数据库courses表读取失败: {str(e)}", "courses": []}]

    # ── 3. 测试内存拼装逻辑
    try:
        print("[STEP 6] 正在尝试在内存中循环拼装大学和课程的嵌套结构...")
        for uni in unis:
            # 检查 uni 字典里有没有 'id'
            if 'id' not in uni:
                print(f"⚠️ 警告: 这条大学数据里居然没有 'id' 键! 数据内容: {uni}")
            
            # 过滤课程
            uni['courses'] = [c for c in courses if c.get('uni_id') == uni.get('id')]
            
            # 安全移除 uni_id
            for c in uni['courses']:
                c.pop('uni_id', None)
                
        print("[STEP 7] 🎉 所有数据拼装成功！准备返回给前端。")
        return unis
    except Exception as e:
        print(f"❌ [ERROR] 数据在内存循环拼装、清洗时崩溃了！具体错误是: {str(e)}")
        return [{"id": "error", "name": f"内存拼装失败: {str(e)}", "courses": []}]

# ── 静态文件
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# ── GET /api/unis — 读取所有数据
@app.get('/api/unis')
def get_unis():
    try:
        return jsonify(load_all())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── POST /api/courses — 添加课程（自动创建大学）
@app.post('/api/courses')
def add_course():
    body = request.json
    uni_name = body.get('uni_name', '').strip()
    state    = body.get('state', '').strip()
    course   = body.get('course', {})

    if not uni_name or not course.get('name') or not state:
        return jsonify({'error': '大学名称、课程名称和州为必填项'}), 400

    try:
        # 找或创建大学
        existing = supabase.table('unis').select('id').ilike('name', uni_name).execute()
        if existing.data:
            uni_id = existing.data[0]['id']
        else:
            uni_id = 'u_' + uni_name.lower().replace(' ', '_')[:20]
            supabase.table('unis').insert({
                'id':    uni_id,
                'name':  uni_name,
                'abbr':  body.get('uni_abbr', ''),
                'state': state,
                'city':  body.get('city', ''),
            }).execute()

        # 插入课程
        course['uni_id'] = uni_id
        result = supabase.table('courses').insert(course).execute()
        new_id = result.data[0]['id']

        # 返回新课程在大学中的 index（前端用）
        all_courses = supabase.table('courses').select('id').eq('uni_id', uni_id).execute()
        idx = next((i for i, c in enumerate(all_courses.data) if c['id'] == new_id), 0)

        return jsonify({'ok': True, 'uni_id': uni_id, 'course_idx': idx})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── PUT /api/courses/<uni_id>/<course_idx> — 编辑课程
@app.put('/api/courses/<uni_id>/<int:course_idx>')
def update_course(uni_id, course_idx):
    body = request.json
    try:
        courses = supabase.table('courses').select('id').eq('uni_id', uni_id).execute().data
        if course_idx >= len(courses):
            return jsonify({'error': '课程不存在'}), 404
        course_id = courses[course_idx]['id']

        # 只更新传入的字段，过滤掉不属于表的 key
        allowed = {'name','code','atar','eng','eal','maths','duration','intake','fees','notes','url'}
        fields = {k: v for k, v in body.items() if k in allowed}
        supabase.table('courses').update(fields).eq('id', course_id).execute()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── DELETE /api/courses/<uni_id>/<course_idx> — 删除课程
@app.delete('/api/courses/<uni_id>/<int:course_idx>')
def delete_course(uni_id, course_idx):
    try:
        courses = supabase.table('courses').select('id').eq('uni_id', uni_id).execute().data
        if course_idx >= len(courses):
            return jsonify({'error': '课程不存在'}), 404
        course_id = courses[course_idx]['id']
        supabase.table('courses').delete().eq('id', course_id).execute()

        # 如果大学没课程了，删大学
        remaining = supabase.table('courses').select('id').eq('uni_id', uni_id).execute().data
        if not remaining:
            supabase.table('unis').delete().eq('id', uni_id).execute()

        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"✅ 启动中... http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
