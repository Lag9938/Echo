// Encerrar a transmissão de tela de verdade.
//
// O app guardava só a ÚLTIMA faixa de tela publicada e, ao parar, despublicava só ela. Ao trocar de janela no
// meio da transmissão ("Mudar de Janela") uma faixa nova era publicada por cima sem encerrar a anterior: a
// antiga ficava órfã, e depois de "Parar Transmissão" ela continuava no ar, com a tela da pessoa visível para
// quem estivesse na chamada. O mesmo acontecia ao parar enquanto a publicação ainda estava sendo negociada.
//
// Por isso a limpeza não confia no que o app lembra: ela pergunta à sala tudo que está publicado como tela
// (vídeo e áudio) e tira tudo.

const SCREEN_SOURCES = new Set(['screen_share', 'screen_share_audio'])

interface PublishedTrack {
  stop?: () => void
  mediaStreamTrack?: { stop?: () => void } | null
}

interface Publication {
  source?: string
  track?: PublishedTrack | null
}

export interface ScreenSharePublisher {
  trackPublications: Map<string, Publication> | Iterable<[string, Publication]>
  unpublishTrack: (track: any, stopOnUnpublish?: boolean) => Promise<unknown> | unknown
}

/** As publicações de tela (vídeo e áudio) de um participante */
export function screenSharePublications(publisher: Pick<ScreenSharePublisher, 'trackPublications'> | null | undefined): Publication[] {
  if (!publisher?.trackPublications) return []
  const all = publisher.trackPublications instanceof Map ? [...publisher.trackPublications.values()] : [...publisher.trackPublications].map(([, pub]) => pub)
  return all.filter((pub) => pub && typeof pub.source === 'string' && SCREEN_SOURCES.has(pub.source))
}

/**
 * Despublica e para TODAS as faixas de tela do participante, mais as faixas extras informadas (as que o app
 * lembra, caso ainda não constem na sala). Devolve quantas faixas foram encerradas. Nunca lança erro: parar
 * de transmitir não pode falhar pela metade.
 */
export function releaseAllScreenShare(publisher: ScreenSharePublisher | null | undefined, extraTracks: Array<PublishedTrack | null | undefined> = []): number {
  const tracks = new Set<PublishedTrack>()
  for (const pub of screenSharePublications(publisher)) if (pub.track) tracks.add(pub.track)
  for (const track of extraTracks) if (track) tracks.add(track)

  for (const track of tracks) {
    if (publisher) {
      try {
        const result = publisher.unpublishTrack(track, true)
        if (result && typeof (result as Promise<unknown>).catch === 'function') (result as Promise<unknown>).catch(() => {})
      } catch { /* a sala já fechou: segue para parar a captura */ }
    }
    try { track.stop?.() } catch { /* já parada */ }
    try { track.mediaStreamTrack?.stop?.() } catch { /* já parada */ }
  }
  return tracks.size
}

/** Para a captura em si (a faixa de vídeo e de áudio que saem da tela), mesmo que nada tenha sido publicado */
export function stopCaptureStream(stream: { getTracks: () => Array<{ stop: () => void }> } | null | undefined): void {
  if (!stream) return
  try {
    for (const track of stream.getTracks()) {
      try { track.stop() } catch { /* já parada */ }
    }
  } catch { /* stream inválido */ }
}
