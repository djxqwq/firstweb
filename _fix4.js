const fs = require('fs');
const p = 'frontend/app/tools/qiuzhao/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// ============ 第 1 处：form.applied_at（投递日期） ============
s = s.replace(
  /type="date" readOnly(\s*\n\s*className="admin-input"\s*\n\s*value=\{form\.applied_at\}\s*\n\s*onChange=\{\(e\) => setForm\(\{\s*\.\.\.form,\s*applied_at: e\.target\.value \}\)\s*\})/,
  `type="text"
                  className="admin-input"
                  placeholder="如 2026-08-18 / 2026/08/18 / 8-18"
                  value={form.applied_at}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      applied_at: normalizeDateInput(e.target.value),
                    })
                  }`
);

// ============ 第 2 处：rd.exam_at（笔试日期） ============
s = s.replace(
  /type="date" readOnly(\s*\n\s*className="admin-input"\s*\n\s*value=\{rd\.exam_at\}\s*\n\s*onChange=\{\(e\) =>\s*updateRoleEntry\(idx, \{ exam_at: e\.target\.value \}\)\s*\})/,
  `type="text"
                            className="admin-input"
                            placeholder="2026-08-18 / 2026/08/18"
                            value={rd.exam_at}
                            onChange={(e) =>
                              updateRoleEntry(idx, {
                                exam_at: normalizeDateInput(e.target.value),
                              })
                            }`
);

// ============ 第 3 处：r.at（面试轮次日期） ============
s = s.replace(
  /type="date" readOnly(\s*\n\s*className="admin-input"\s*\n\s*value=\{r\.at\}\s*\n\s*onChange=\{\(e\) =>\s*updateRound\(idx, r\.id, \{ at: e\.target\.value \}\)\s*\})/,
  `type="text"
                                  className="admin-input"
                                  placeholder="2026-08-18 / 2026/08/18"
                                  value={r.at}
                                  onChange={(e) =>
                                    updateRound(idx, r.id, {
                                      at: normalizeDateInput(e.target.value),
                                    })
                                  }`
);

fs.writeFileSync(p, s, 'utf8');

// 验证：应该没有 type="date" 了
const remaining = (s.match(/type="date"/g) || []).length;
console.log('type="date" 剩余数量（期望 0）:', remaining);
console.log('文件总行数:', s.split('\n').length);
