const { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } = require('node:fs')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const appDirectory = path.join(projectRoot, 'dist-desktop', 'win-unpacked')
const outputDirectory = path.join(projectRoot, 'release-store')
const packageDirectory = path.join(outputDirectory, 'pre-appx')
const assetsDirectory = path.join(packageDirectory, 'assets')
// Carregar informações do package.json
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
const packageVersion = `${packageJson.version}.0`

// Carregar variáveis do .env.local se existir
const dotenvPath = path.join(projectRoot, '.env.local')
let env = {}
if (existsSync(dotenvPath)) {
  const dotenvContent = readFileSync(dotenvPath, 'utf8')
  for (const line of dotenvContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const indexOfEquals = trimmed.indexOf('=')
      if (indexOfEquals !== -1) {
        const key = trimmed.substring(0, indexOfEquals).trim()
        let value = trimmed.substring(indexOfEquals + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1)
        }
        env[key] = value
      }
    }
  }
}

const publisher = env.MS_STORE_PUBLISHER || 'CN=0E985F11-74C3-4CB8-B232-9BDFC00A4719'
const identityName = env.MS_STORE_IDENTITY_NAME || 'EchoLobby.EchoLobby'
const packageName = env.MS_STORE_PACKAGE_NAME || 'EchoLobby'
const packageDisplayName = env.MS_STORE_DISPLAY_NAME || 'Echo Lobby'
const packageFile = path.join(outputDirectory, `${packageName}-${packageVersion}.appx`)

const makeAppx = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\makeappx.exe'
const templateRoot = path.join(projectRoot, 'node_modules', 'electron-windows-store', 'template')
const echoAssets = path.join(projectRoot, 'assets', 'store')

if (!existsSync(appDirectory)) throw new Error('O aplicativo Windows ainda não foi empacotado.')
if (!existsSync(makeAppx)) throw new Error('O Windows SDK (MakeAppx.exe) não foi encontrado.')

function cleanDirectoryRecursive(dirPath) {
  if (!existsSync(dirPath)) return
  try {
    const items = readdirSync(dirPath, { withFileTypes: true })
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)
      if (item.isDirectory()) {
        cleanDirectoryRecursive(fullPath)
        try {
          rmSync(fullPath, { recursive: true, force: true })
        } catch (err) {
          // ignore or warn
        }
      } else {
        try {
          rmSync(fullPath, { force: true })
        } catch (err) {
          console.warn(`Aviso: Não foi possível remover o arquivo ${fullPath}: ${err.message}`)
        }
      }
    }
  } catch (err) {
    console.warn(`Aviso ao ler diretório ${dirPath}: ${err.message}`)
  }
}

if (existsSync(outputDirectory)) {
  cleanDirectoryRecursive(packageDirectory)
  try {
    rmSync(packageDirectory, { recursive: true, force: true })
  } catch (err) {
    // Ignore error if root pre-appx folder is locked but empty/partially cleaned
  }
  try {
    const files = readdirSync(outputDirectory)
    for (const file of files) {
      if (file.endsWith('.appx')) {
        rmSync(path.join(outputDirectory, file), { force: true })
      }
    }
  } catch (err) {
    console.warn(`Aviso: Não foi possível limpar os arquivos .appx antigos na pasta release-store: ${err.message}`)
  }
} else {
  mkdirSync(outputDirectory, { recursive: true })
}
mkdirSync(assetsDirectory, { recursive: true })
cpSync(appDirectory, path.join(packageDirectory, 'app'), { recursive: true })
cpSync(echoAssets, assetsDirectory, { recursive: true })

let manifest = readFileSync(path.join(templateRoot, 'appxmanifest.xml'), 'utf8')
const values = {
  publisherName: publisher,
  publisherDisplayName: packageDisplayName,
  identityName,
  packageVersion,
  packageName,
  packageExecutable: 'app\\Echo.exe',
  packageDisplayName,
  packageDescription: 'Comunidades e conversas em tempo real.',
  packageBackgroundColor: '#df6d5d',
}
for (const [key, value] of Object.entries(values)) {
  manifest = manifest.replaceAll('${' + key + '}', value)
}
manifest = manifest.replace('<Description>No description entered</Description>', '<Description>Comunidades e conversas em tempo real.</Description>')
manifest = manifest.replace('Language="en-us"', 'Language="pt-br"')
writeFileSync(path.join(packageDirectory, 'AppXManifest.xml'), manifest)

execFileSync(makeAppx, ['pack', '/d', packageDirectory, '/p', packageFile, '/o'], { stdio: 'inherit' })
console.log(`Pacote para envio à Microsoft Store criado em: ${packageFile}`)
