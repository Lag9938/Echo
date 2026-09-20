import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'

let livekitProcess = null

export function getLivekitProcess() {
  return livekitProcess
}

export function ensureLocalLivekitServer(rootDir) {
  const binaryPath = path.join(rootDir, 'tools', 'livekit', 'livekit-server.exe')
  if (fs.existsSync(binaryPath)) {
    const tester = net.createConnection({ port: 7880, host: '127.0.0.1' }, () => {
      tester.destroy()
      console.log('[LiveKit] Local server is already running on port 7880.')
    })
    tester.on('error', () => {
      console.log('[LiveKit] Starting local livekit-server.exe --dev...')
      try {
        livekitProcess = spawn(binaryPath, ['--dev'], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        })
        livekitProcess.on('error', (err) => console.warn('[LiveKit] Failed to spawn livekit-server:', err))
        livekitProcess.on('exit', (code) => console.log(`[LiveKit] Server exited with code ${code}`))
      } catch (err) {
        console.warn('[LiveKit] Error launching livekit-server:', err)
      }
    })
  }
}

export function setupLivekitIpc(safeHandle) {
  safeHandle('get-livekit-connection', async (_event, params = {}) => {
    try {
      const { room, identity, name, avatarUrl } = params || {}
      const isLocalDev = Boolean(livekitProcess) || process.env.NODE_ENV === 'development'
      let livekitUrl = process.env.LIVEKIT_URL || (isLocalDev ? 'ws://127.0.0.1:7880' : 'wss://137-131-144-255.sslip.io')
      if (livekitUrl.includes('136-248-75-151')) {
        livekitUrl = 'wss://137-131-144-255.sslip.io'
      }

      // Em produção, os tokens são emitidos exclusivamente pela Edge Function do Supabase.
      // O processo Electron só gera tokens localmente se credenciais forem fornecidas via ENV ou se estiver rodando o livekit-server local (--dev).
      const apiKey = process.env.LIVEKIT_API_KEY || (livekitProcess ? 'devkey' : '')
      const apiSecret = process.env.LIVEKIT_API_SECRET || (livekitProcess ? 'secret' : '')

      if (!apiKey || !apiSecret) {
        return { 
          success: false, 
          error: 'Credenciais locais não configuradas. Use a Edge Function do Supabase para conexão de produção.' 
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        exp: now + 24 * 3600,
        iss: apiKey,
        nbf: now - 3600, // Margem de 1 hora para relógios de usuários adiantados (evita "token is not valid yet")
        sub: identity || 'anonymous',
        name: name || 'Membro',
        metadata: JSON.stringify({ avatarUrl: avatarUrl || '' }),
        video: {
          room: room || 'general',
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        }
      }

      const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
      const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const toSign = `${encHeader}.${encPayload}`
      const signature = crypto.createHmac('sha256', apiSecret).update(toSign).digest('base64url')
      const token = `${toSign}.${signature}`

      return { success: true, url: livekitUrl, token }
    } catch (err) {
      console.error('[LiveKit] Failed to generate token:', err)
      return { success: false, error: err.message }
    }
  })
}
