import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Redireciona para a página web de convite. Já estava publicada no Supabase mas fora do repositório.
// Aceita o código de convite atual (?code=) e os links antigos com o UUID do espaço (?space= / ?id=).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve((req: Request) => {
  const url = new URL(req.url)
  const token = url.searchParams.get("code") || url.searchParams.get("space") || url.searchParams.get("id") || ""
  const channelId = url.searchParams.get("channel") || ""

  const param = UUID_RE.test(token) ? "space" : "code"
  const redirectUrl = `https://lag9938.github.io/Echo/invite/?${param}=${encodeURIComponent(token)}${channelId ? `&channel=${encodeURIComponent(channelId)}` : ""}`

  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
      "Cache-Control": "public, max-age=60",
    },
  })
})
