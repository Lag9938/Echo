// Confere se o livekit-server local aceita um token gerado com as chaves de desenvolvimento.
import { AccessToken } from 'livekit-server-sdk'

const t = new AccessToken('devkey', 'secret', { identity: 'teste', ttl: 600 })
t.addGrant({ roomJoin: true, room: 'echo-check', canPublish: true, canSubscribe: true })
const jwt = await t.toJwt()
for (const path of ['/rtc/validate', '/rtc/v1/validate']) {
  try {
    const res = await fetch(`http://127.0.0.1:7890${path}?access_token=${jwt}`)
    console.log(path, res.status, (await res.text()).slice(0, 120))
  } catch (err) {
    console.log(path, 'falhou:', err.message)
  }
}

