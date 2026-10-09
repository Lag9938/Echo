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

## Próximo passo (não resolvido)

Entregar as texturas já em NV12, para o codificador da placa usar direto. Duas tentativas falharam: a
transferência para a página estoura o tempo de 1 s (`transfer shared texture timed out`), com e sem
"keyed mutex". Falta descobrir o que o Chromium exige de uma textura NV12 importada.

Outras pendências antes de virar recurso do app: desenhar o cursor (esta captura não o inclui), mais de um
monitor, HDR, troca de resolução durante a transmissão, devolver as texturas só depois de o app terminar de
usar, e o teste com o Valorant numa conta secundária.
