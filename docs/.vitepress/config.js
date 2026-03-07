import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: '个人技术博客',
  description: '全栈开发者 | 开源爱好者',
  base: '/firstweb/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '项目', link: '/projects/' },
      { text: '教育', link: '/education' },
      { text: '荣誉', link: '/honors' },
      { text: '技能', link: '/skills' },
      { text: '联系', link: '/contact' }
    ],

    sidebar: {
      '/projects/': [
        {
          text: '项目作品集',
          items: [
            { text: '项目总览', link: '/projects/' },
            { text: '项目 A', link: '/projects/project-a' },
            { text: '项目 B', link: '/projects/project-b' },
            { text: '项目 C', link: '/projects/project-c' },
            { text: '项目 D', link: '/projects/project-d' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/占位' }
    ],
    footer: {
      message: '用心构建，用爱分享',
      copyright: 'Copyright © 20XX Your Name'
    }
  }
})
