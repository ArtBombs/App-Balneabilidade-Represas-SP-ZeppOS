// Gera o .zab em modo "preview" para TODOS os aparelhos (mesma seleção do "zeus build"),
// sem enviar nada à Zepp. Uso: cd <projeto> && node build_preview.js
// Caminho da CLI global do Zeus (ajuste se for outro: "npm root -g" + /@zeppos/zeus-cli)
const Z = process.env.ZEUS_CLI || require('path').join(require('child_process').execSync('npm root -g').toString().trim(), '@zeppos', 'zeus-cli')
require(Z + '/node_modules/module-alias')({ base: Z }) // mesmo aliasing do binário zeus
const b = require(Z + '/modules/build.js')
const u = require('zeppos-app-utils')
;(async () => {
  const appId = require(require('path').resolve('./app.json')).app.appId
  const args = { _: ['build'], $0: 'zeus' }
  Object.assign(args, await b.chooseBuildPackages(b.BuildMode.PROD, args))
  const info = await u.modules.buildSupportV3Config(process.cwd(), b.BuildMode.PREVIEW, { ...args, renameWithAppId: appId })
  console.log('ok', info)
})().catch((e) => { console.error('ERRO', e); process.exit(1) })
