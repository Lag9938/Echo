# Echo Music Bot

Worker Node.js separado do app principal que entra nos canais de voz do
Echo como um participante do LiveKit e publica áudio (música). Roda
isolado do processo do `livekit-server`, com limite de CPU/memória próprio
via systemd, pra nunca disputar recursos com a SFU que atende voz/vídeo/
tela de todo mundo.

## Como funciona (resumo)

1. Fica escutando `INSERT` em `messages` via Supabase Realtime.
2. Quando alguém posta `!play <música>` num canal de **voz**, entra na sala
   LiveKit correspondente (`room = channel_id`, mesma convenção que o
   Electron/Edge Function já usam) e publica uma faixa de áudio.
3. `yt-dlp` extrai o áudio, `ffmpeg` decodifica/reamostra pra PCM cru, e o
   `@livekit/rtc-node` publica isso frame a frame na sala.
4. Um contador global (`MAX_CONCURRENT_SESSIONS`) limita quantos canais
   podem ter música tocando ao mesmo tempo — isso é o que garante que o
   pior caso de uso continua previsível em CPU.

## Comandos de chat (dentro de um canal de voz)

| Comando | Efeito |
|---|---|
| `!play <link ou busca>` | Toca agora ou adiciona na fila |
| `!skip` | Pula a faixa atual |
| `!stop` | Limpa a fila e desconecta o bot do canal |
| `!pause` / `!resume` | Pausa/retoma a faixa atual |
| `!volume <0-200>` | Ajusta o volume (100 = normal) |
| `!queue` | Mostra a fila atual |

## Pré-requisitos no servidor (Oracle)

- Node.js 20+
- `ffmpeg` no PATH (`apt install ffmpeg` / `dnf install ffmpeg`)
- `yt-dlp` no PATH (baixe o binário standalone: https://github.com/yt-dlp/yt-dlp — recomendo o binário, não o pacote da distro, que costuma ficar desatualizado e quebrar com mudanças do YouTube)
- Acesso de saída à internet (pra baixar áudio) e ao seu próprio LiveKit

> **Nota sobre `@livekit/rtc-node` em ARM**: o pacote publica binários
> pré-compilados pra `linux-arm64`, então deve funcionar na Ampere A1 sem
> precisar compilar nada — mas vale conferir na primeira instalação
> (`npm install` deve baixar o binário certo sozinho; se der erro de
> binário ausente, é o primeiro lugar a olhar).

## Setup (primeira vez)

```bash
cd music-bot
cp .env.example .env
# preencha LIVEKIT_API_KEY / LIVEKIT_API_SECRET (as mesmas do seu livekit-server
# em produção — não as devkey/secret do modo --dev local) e
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (Project Settings > API no Supabase)

npm install

# Cria a conta "Echo Music Bot" (auth + profile) e imprime o BOT_AUTHOR_ID
node scripts/create-bot-account.mjs
# cole o UUID impresso em BOT_AUTHOR_ID no .env
```

Teste local antes de virar serviço:

```bash
npm start
# em outra sessão, poste "!play alguma música" num canal de voz pelo app
# e acompanhe os logs
```

## Rodando como serviço (systemd)

```bash
sudo mkdir -p /opt/echo/music-bot
sudo cp -r music-bot/* /opt/echo/music-bot/
sudo useradd --system --no-create-home echobot
sudo chown -R echobot:echobot /opt/echo/music-bot

sudo cp /opt/echo/music-bot/systemd/echo-music-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now echo-music-bot
sudo systemctl status echo-music-bot
sudo journalctl -u echo-music-bot -f   # logs em tempo real
```

O `CPUQuota=150%` e `MemoryMax=1G` no `.service` já isolam o bot do
`livekit-server` — ajuste conforme achar melhor, mas não recomendo tirar
o limite completamente.

## O que ainda vale testar/validar no primeiro deploy real

Este é um v1 funcional na teoria, mas que eu não consegui rodar de ponta a
ponta neste ambiente (não tenho como instalar bindings nativos do
`@livekit/rtc-node` nem alcançar seu LiveKit/Supabase daqui). Os pontos
mais prováveis de precisar de um ajuste fino na primeira execução real:

- A assinatura exata de `AudioFrame`/`AudioSource`/`TrackPublishOptions`
  no `@livekit/rtc-node` instalado (a API desses pacotes de "agents" muda
  entre versões — vale conferir contra `node_modules/@livekit/rtc-node`
  se algo não bater).
- Se o `yt-dlp` conseguir extrair áudio sem precisar de cookies/proxy
  (o YouTube às vezes exige isso dependendo do IP do servidor).
- Latência/qualidade do pipe `yt-dlp | ffmpeg` em conexões mais lentas —
  pode precisar de um buffer maior antes de começar a tocar.

Me avisa quando testar no servidor e eu ajudo a debugar o que aparecer.
