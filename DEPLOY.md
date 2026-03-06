# 部署指南

## 快速部署到 GitHub Pages

### 1. 创建 GitHub 仓库
1. 访问 [GitHub](https://github.com) 并登录
2. 点击右上角 `+` → `New repository`
3. 仓库名建议：`tech-blog` 或 `personal-blog`
4. 设为 `Public`（公开）
5. 不要初始化 README、.gitignore 等

### 2. 推送代码到 GitHub
```bash
# 在项目根目录执行
git init
git add .
git commit -m "初始化技术博客"

# 添加远程仓库（替换为你的信息）
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

### 3. 开启 GitHub Pages
1. 进入 GitHub 仓库
2. 点击 `Settings` 标签
3. 左侧菜单找到 `Pages`
4. 在 `Build and deployment` 中选择 `Source: GitHub Actions`
5. 等待部署完成

### 4. 访问你的博客
部署成功后，访问：
```
https://你的用户名.github.io/你的仓库名
```

## 自定义域名配置

### 购买域名
推荐平台：
- 阿里云：[wanwang.aliyun.com](https://wanwang.aliyun.com)
- 腾讯云：[cloud.tencent.com/domain](https://cloud.tencent.com/domain)
- Namecheap：[namecheap.com](https://namecheap.com)

### DNS 配置
在你的域名提供商添加 DNS 记录：

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| CNAME | www | 你的用户名.github.io |
| CNAME | @ | 你的用户名.github.io |

### GitHub 配置
1. 仓库 `Settings` → `Pages`
2. `Custom domain` 输入你的域名
3. 勾选 `Enforce HTTPS`
4. 保存设置

## 常见问题

### Q: 部署失败怎么办？
A: 检查 GitHub Actions 的错误日志，常见问题：
- 文件路径错误
- 依赖安装失败
- 构建超时

### Q: 自定义域名不生效？
A: DNS 生效需要时间（5分钟-24小时），可以：
- 使用 `nslookup` 检查 DNS 解析
- 确认 CNAME 记录配置正确
- 等待更长时间再试

### Q: 如何更新博客？
A: 直接推送代码到 GitHub 即自动更新：
```bash
git add .
git commit -m "更新内容"
git push origin main
```

## 域名推荐

### 免费方案
- GitHub Pages 默认域名（推荐新手）
- 格式：`用户名.github.io/仓库名`

### 付费方案
- `.com` 域名：约 60-100 元/年
- `.cn` 域名：约 30-50 元/年
- `.dev` 域名：约 20-40 元/年（开发者专属）

## 维护建议

1. **定期备份**：重要内容建议备份到本地
2. **HTTPS 证书**：GitHub 会自动管理，无需担心
3. **访问统计**：可以使用 Google Analytics
4. **SEO 优化**：在 config.js 中配置站点描述
