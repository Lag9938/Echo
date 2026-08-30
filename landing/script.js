async function configureDownloadButton() {
  const downloadBtn = document.getElementById('download-btn');
  const btnText = document.getElementById('btn-text');
  const btnSub = document.getElementById('btn-subtext');

  try {
    const response = await fetch('https://api.github.com/repos/Lag9938/Echo/releases/latest');
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    
    // Procura pelo asset .exe
    const exeAsset = data.assets.find(asset => asset.name.endsWith('.exe'));
    
    if (exeAsset) {
      downloadBtn.href = exeAsset.browser_download_url;
      // Atualiza o texto do botão com a versão encontrada
      if (btnSub) {
        btnSub.textContent = `Versão ${data.tag_name} (Windows de 64 bits)`;
      }
      console.log('Direct download link configured for version:', data.tag_name);
    } else {
      // Fallback para a página de releases se não achar o exe
      downloadBtn.href = 'https://github.com/Lag9938/Echo/releases/latest';
    }
  } catch (error) {
    console.error('Error fetching latest release from GitHub:', error);
    // Fallback geral em caso de erro
    downloadBtn.href = 'https://github.com/Lag9938/Echo/releases/latest';
    if (btnSub) {
      btnSub.textContent = 'Baixar instalador oficial (Windows)';
    }
  }
}

// Executar após carregar a página
document.addEventListener('DOMContentLoaded', configureDownloadButton);
