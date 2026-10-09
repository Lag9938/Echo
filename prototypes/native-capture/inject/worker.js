// Roda dentro da conexão WebRTC, entre o codificador do Chromium e a rede. Troca o conteúdo de cada quadro
// codificado da faixa "de fachada" (minúscula) pelo quadro H.264 que veio do codificador próprio.
//
// Pré-requisito (feito pela página): a faixa NÃO negocia as extensões "dependency descriptor" /
// "generic frame descriptor". Com elas, o receptor confia na marcação da fachada (qual quadro é chave, de
// qual depende) e qualquer quadro de fachada descartado, ou chave fora de lugar, trava a decodificação.
// Sem elas, o receptor lê tudo do próprio H.264 que trocamos, e a fachada vira só um relógio.
const queue = []
let swapped = 0, droppedFacade = 0, maxQueued = 0, keyRequests = 0, lastKeyRequestAt = 0

onmessage = (event) => {
  const message = event.data
  if (message.type === 'au') { queue.push(message); if (queue.length > maxQueued) maxQueued = queue.length }
  else if (message.type === 'stats') postMessage({ type: 'stats', swapped, droppedFacade, queued: queue.length, maxQueued, keyRequests })
}

onrtctransform = (event) => {
  const { readable, writable } = event.transformer
  readable.pipeThrough(new TransformStream({
    transform(frame, controller) {
      // Quadro-chave na fachada = o receptor (ou o servidor) pediu um. Pede o nosso, no máximo um por segundo.
      if (frame.type === 'key' && performance.now() - lastKeyRequestAt > 1000) {
        lastKeyRequestAt = performance.now(); keyRequests++
        postMessage({ type: 'need-key' })
      }
      const au = queue.shift()
      if (!au) { droppedFacade++; return }   // nada nosso pronto: este quadro de fachada não é enviado
      frame.data = au.data
      swapped++
      controller.enqueue(frame)
    }
  })).pipeTo(writable)
}
