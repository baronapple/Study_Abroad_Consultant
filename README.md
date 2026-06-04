# Study_Abroad_Consultant

### init_db.sql
used to create SQL table in Superbase


### Key connected to Superbase
anon public key 
and project URL Key

### Render 部署

去 render.com 免费注册，点 New → Web Service
连接你的 GitHub 仓库
设置如下：

Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: python server.py


点 Environment 添加两个环境变量：

SUPABASE_URL = 你刚才复制的 URL
SUPABASE_KEY = 你刚才复制的 key
