// 打包packages下的模块，最终打包出js文件
// node dev.js 要打包的名字 -f 打包的格式

import esbuild from 'esbuild'
import minimist from 'minimist'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url);

// 获取参数
const args = minimist(process.argv.slice(2))
const format = args.f || 'iife' // cjs iife esm
const target = args._[0] || 'reactivity'
/**
 * import.meta.url
 * 当前文件所在的路径,但是是file开头的 file:\\\C:User......
 * 需要处理成路径,使用url模块的fileURLToPath C:User...
 * 路径是包括了文件名
 */
// 当前文件所在的目录，如果是node，直接使用__dirname
const __dirname = dirname(fileURLToPath(import.meta.url))

// const IIFENamesMap = {
//   'reactivity': 'VueReactivity'
// }
// 包的packageJSON
// const { default: pkg } = await import(`../packages/${target}/package.json`,{ with: { type: 'json' }});
const pkg = require(`../packages/${target}/package.json`)

esbuild.context({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`),
  bundle: true, // 是否打包依赖的模块,所有的打包在一起
  sourcemap: true,
  format,
  platform: 'browser', // 打包后的使用平台
  globalName: pkg.buildOptions?.name, // 打包后的全局变量名
}).then(ctx => {
  console.log('watching ~~~')
  ctx.watch()
})