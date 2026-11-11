import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Capacitor 真机结论：
 * - 多 chunk type=module 经常根本不挂载（壳停在 data-ok）
 * - 单文件 IIFE 可以挂载，但绝不能把 pinyin-pro 打进去
 */
function capacitorHtmlFix() {
  return {
    name: 'capacitor-html-fix',
    enforce: 'post',
    transformIndexHtml(html) {
      let out = html.replace(/\s+crossorigin(?:=["']anonymous["'])?/g, '')
      // 入口改为经典 defer 脚本，不用 type=module
      let entrySrc = ''
      out = out.replace(/<script[^>]*src="(\.\/assets\/[^"]+\.js)"[^>]*><\/script>\s*/g, (_, src) => {
        entrySrc = src
        return ''
      })
      if (entrySrc) {
        const tag = `<script src="${entrySrc}" defer></script>\n`
        out = out.includes('</body>') ? out.replace('</body>', `${tag}</body>`) : out + tag
      }
      return out
    }
  }
}

export default defineConfig(({ mode }) => {
  const capBuild = mode === 'capacitor' || process.env.CAP_BUILD === '1'

  const pwaPlugin = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
    manifest: {
      name: '方剂学',
      short_name: '方剂学',
      description: '方剂学学习平台：学—记—测—复',
      theme_color: '#b03a2e',
      background_color: '#f4eee1',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'zh-CN',
      start_url: './',
      scope: './',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      // 含 json：formulas.json；含 embed.js 时一并预缓存，断网可学
      globPatterns: ['**/*.{js,css,html,png,json,svg,ico}'],
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api\//]
    }
  })


  return {
    base: './',
    plugins: [
      vue(),
      ...(capBuild ? [capacitorHtmlFix()] : [pwaPlugin])
    ],
    build: capBuild
      ? {
          cssCodeSplit: false,
          modulePreload: false,
          target: 'es2015',
          rollupOptions: {
            // 确保拼音库进不了图
            external: ['pinyin-pro'],
            output: {
              format: 'iife',
              name: 'FangjiApp',
              inlineDynamicImports: true,
              entryFileNames: 'assets/app.js',
              assetFileNames: 'assets/[name]-[hash][extname]',
              globals: { 'pinyin-pro': 'PinyinPro' }
            }
          }
        }
      : {
          target: 'es2018'
        },
    server: { host: true }
  }
})
