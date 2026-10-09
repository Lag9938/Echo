# Protótipo: capturador de tela próprio do Echo

**Estado: protótipo de bancada. Não faz parte do app, não é empacotado e não foi testado com nenhum jogo.**

Objetivo: transmitir a tela inteira a 60 FPS com um jogo aberto, sem depender da captura de tela do
Electron/Chromium (que copia cada quadro para a memória, espaça as capturas pelo dobro do tempo da cópia e,
quando o caminho rápido falha, cai para um método antigo do Windows que não passa de ~20 FPS).

## Como funciona

1. `capture.cpp` — programa nativo. Pede ao Windows a imagem do monitor (DXGI Desktop Duplication), reduz
   para o tamanho de envio na própria placa de vídeo e deixa o resultado em texturas compartilhadas. Não copia
   nada para a memória e **não toca em nenhum outro processo** (não injeta, não lê memória de jogo).
2. `main.cjs` — Electron: recebe o identificador de cada textura e a importa com `sharedTexture`.
3. `index.html` — a página transforma cada textura em quadro de vídeo (`MediaStreamTrackGenerator`), que é o
   mesmo tipo de faixa que o Echo publica na chamada, e mede o caminho inteiro com uma conexão de teste local.
4. `gpu-load/load.cjs` — "jogo" de mentira: outro processo que ocupa a placa de vídeo sem limite de quadros.

## Compilar e rodar (Windows, Build Tools do Visual Studio)

```
vcvars64.bat
cl /nologo /EHsc /O2 /W3 /DUNICODE /D_UNICODE capture.cpp /Fe:capture.exe /link d3d11.lib dxgi.lib
..\..\node_modules\electron\dist\electron.exe main.cjs      (grava results.txt)
```

Carga: `set LOAD_ITER=3200 && electron gpu-load\load.cjs` em outra janela.

## Medições (09/10/2026 — RTX 5060, Ryzen 7 5700X, monitor 2560x1440 a 180 Hz, Windows 11)

Envio em 1920x1080, H.264 pela placa de vídeo, teto de 8 Mbps.

| Situação | Quadros que chegam ao app | Codificados e recebidos |
|---|---|---|
| Sem carga | 60 | 60 |
| "Jogo" a ~150 FPS | 52 | 46 (a resolução caiu para 720p) |
| "Jogo" a ~78 FPS | 39 | 21 |
| "Jogo" a ~45 FPS | 44 | **12** |

Para comparar, a captura do Electron no modo acelerado (v0.53.3), nas mesmas cargas: 54–56 / 45–57 / 44–45
quadros capturados e ~49 recebidos com o "jogo" a ~105 FPS.

## O que isto mostra

- O caminho funciona: sem carga são 60 capturados, 60 codificados, 60 recebidos, com imagem correta.
- **Com a placa ocupada, este protótipo ainda é PIOR que a captura acelerada do Electron.** A captura em si
  empata (as duas dependem de quantos quadros o Windows compõe); o que piora é a codificação: os quadros
  chegam em BGRA e, para virar o formato do codificador (NV12), cada um espera a placa de vídeo.
- O número de 12 FPS é parecido com o que os usuários relatam. Vale conferir, com os números da origem que a
  v0.53.4 mostra, se no computador deles a captura entrega os quadros e é o envio que não acompanha.

## Mudança de plano: o capturador também codifica

A tentativa de entregar as texturas já em NV12 falhou duas vezes (a transferência para a página estoura o
tempo de 1 s, com e sem "keyed mutex"), e mesmo que passasse o quadro continuaria dependendo do codificador
do Chromium, que é quem fica para trás com a placa ocupada.

Plano novo: o programa nativo captura **e codifica** em H.264 na placa de vídeo, e manda ao app só o vídeo
pronto (cerca de 1 MB por segundo, trivial de transportar). O app envia esse vídeo pela chamada.

### Prova de conceito da parte mais incerta: `inject/`

O WebRTC do Chromium não aceita vídeo já codificado. O contorno: publicar uma faixa "de fachada" de 64x64
e, dentro da conexão (`RTCRtpScriptTransform`), trocar o conteúdo de cada quadro codificado pelo nosso H.264.
Em `inject/` o "codificador próprio" é o `VideoEncoder` do navegador, só para testar o mecanismo.

Resultado em conexão de teste local (09/10/2026, sem carga), três execuções seguidas:

| Codificador próprio | Recebido e decodificado | Tamanho recebido | Quadros-chave | Travadas | Atraso do receptor |
|---|---|---|---|---|---|
| 57,6 FPS | 57,1 FPS | 1920x1080 | 1 | 1 | 24 ms |
| 57,7 FPS | 57,7 FPS | 1920x1080 | 1 | 0 | 31 ms |
| 57,7 FPS | 58,0 FPS | 1920x1080 | 1 | 0 | 67 ms |

Três coisas foram necessárias para ficar limpo (cada uma, sem ela, travava ou atrasava):

1. **Desligar as extensões "dependency descriptor" e "generic frame descriptor" nessa faixa**
   (`setHeaderExtensionsToNegotiate`). Com elas o receptor confia na marcação da fachada sobre quais quadros
   são chave e de quais cada um depende; sem elas, lê tudo do H.264 trocado.
2. **Um relógio de folga** (20 quadros de fachada extras por segundo) para escoar a fila quando um quadro de
   fachada se perde, e o mesmo relógio para todos os carimbos de tempo.
3. **O codificador próprio seguir a taxa que a conexão autoriza** (`targetBitrate` das estatísticas de envio).
   Mandar 8 Mbps desde o primeiro quadro enfileira no envio e gera travadas.

Pedido de quadro-chave do receptor chega como quadro-chave na fachada; o worker avisa e o codificador próprio
gera o dele.

### O que falta

- O codificador nativo de verdade (Media Foundation, H.264 pela placa de vídeo, recebendo a textura do
  capturador sem cópia) e a saída dele por um canal até o app.
- Testar a troca **através do servidor de voz (LiveKit)**, não só em conexão local: o cliente do LiveKit cria
  a faixa e negocia as extensões por conta própria.
- Medir tudo de novo com a placa ocupada — é o único número que importa, e ainda não existe para este plano.

Outras pendências antes de virar recurso do app: desenhar o cursor (esta captura não o inclui), mais de um
monitor, HDR, troca de resolução durante a transmissão, devolver as texturas só depois de o app terminar de
usar, e o teste com o Valorant numa conta secundária.
