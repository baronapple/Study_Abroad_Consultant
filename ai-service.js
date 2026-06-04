// 处理所有与大语言模型 API 交互的逻辑
let chatHistory = [];
let isLoading = false;

function getSystemPrompt(selectedUni, selectedCourse) {
  const isRMIT_CM = selectedUni && selectedUni.id === 'rmit' && selectedCourse && selectedCourse.code === 'BH114';

  let context = `你是一位澳大利亚留学顾问的 AI 助手，专门帮助顾问查询 VCE（Victorian Certificate of Education）学生的大学入学要求。只针对本地学生（domestic students），不考虑国际学生。用简洁的中文回答，如有关键数字请突出显示。`;

  if (selectedUni) context += `\n\n当前大学：${selectedUni.name}（${selectedUni.abbr}）位于 ${selectedUni.city}, ${selectedUni.state}。`;
  if (selectedCourse) context += `\n当前课程：${selectedCourse.name}（代码：${selectedCourse.code}），参考 ATAR：${selectedCourse.atar}。`;

  if (isRMIT_CM) {
    context += `\n\n以下是关于该课程的详细官方信息：\n- 课程：Bachelor of Construction Management (Honours) BH114\n- ATAR: 65.15\n- VCE 英语要求：Units 3&4，English ≥25分，或 EAL ≥27分\n- VCE 数学要求：Units 3&4，任意数学 ≥20分`;
  } else if (selectedCourse && selectedCourse.customRequirements) {
    context += `\n\n【重要】当前课程由顾问手工录入配置。请基于以下最新录入的数据回答顾问：
- VCE 英语门槛要求：${selectedCourse.customRequirements.english}
- 其他特殊/选科门槛：${selectedCourse.customRequirements.math}
- 如果顾问问起该课程的录取几率，请围绕上述英语和特殊资格条件给出判断。`;
  }

  return context;
}

async function requestAiReply(userText, selectedUni, selectedCourse) {
  chatHistory.push({ role: 'user', content: userText });

  // ⚠️ 后端切换提示：如果未来你朋友写好了 Python 后端 API，只需修改这里的 URL 即可一键转换
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: getSystemPrompt(selectedUni, selectedCourse),
      messages: chatHistory
    })
  });
  
  const data = await res.json();
  const reply = data.content?.[0]?.text || '抱歉，暂时无法获取回复，请稍后再试。';
  chatHistory.push({ role: 'assistant', content: reply });
  return reply;
}