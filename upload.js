import fs from 'fs';

async function upload() {
  const filePath = 'dist-desktop/Echo-0.12.0-win.zip';
  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo não encontrado em ${filePath}.`);
    return;
  }
  
  const stats = fs.statSync(filePath);
  console.log(`Lendo arquivo (${(stats.size / 1024 / 1024).toFixed(2)} MB) em memória...`);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/zip' });

  console.log("Consultando servidores Gofile disponíveis...");
  const serverResponse = await fetch('https://api.gofile.io/servers');
  const serverData = await serverResponse.json();
  const activeServer = serverData.data.servers[0].name;
  console.log(`Servidor de upload: ${activeServer}`);

  const formData = new FormData();
  formData.append('file', blob, 'Echo-0.12.0-win.zip');
  
  console.log(`Enviando arquivo para Gofile...`);
  const response = await fetch(`https://${activeServer}.gofile.io/contents/uploadfile`, {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  if (result.status === 'ok') {
    const downloadPageUrl = result.data.downloadPage;
    console.log(`\n🎉 Upload concluído com sucesso!`);
    console.log(`Link de Download: ${downloadPageUrl}`);
    
    // Update landing page
    const htmlPath = 'landing-page/index.html';
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.replace(/href="[^"]*"(\s+class="cta-btn")/, `href="${downloadPageUrl}"$1`);
      html = html.replace('📥 Baixar para Windows (.exe)', '📥 Baixar para Windows (.zip)');
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`Landing Page atualizada.`);
    }
  } else {
    console.error("Upload falhou:", result);
  }
}

upload().catch(console.error);
