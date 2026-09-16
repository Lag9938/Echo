/**
 * Echo — Scripts da Landing Page
 * Download direto sem intermediários e alta performance
 */

const GITHUB_REPO = 'Lag9938/Echo';
const DEFAULT_DIRECT_EXE = 'https://github.com/Lag9938/Echo/releases/download/v0.33.6/Echo-Setup-0.33.6.exe';

async function configureDirectDownload() {
  const downloadBtn = document.getElementById('download-btn');
  const finalDownloadBtn = document.getElementById('final-download-btn');
  const navDownloadBtn = document.getElementById('nav-download-btn');
  const btnSub = document.getElementById('btn-subtext');
  const badgeVersionText = document.getElementById('badge-version-text');

  // Garante que o link padrão de download direto está configurado imediatamente
  if (downloadBtn) downloadBtn.href = DEFAULT_DIRECT_EXE;
  if (finalDownloadBtn) finalDownloadBtn.href = DEFAULT_DIRECT_EXE;
  if (navDownloadBtn) navDownloadBtn.href = DEFAULT_DIRECT_EXE;

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`);
    if (!response.ok) return;
    
    const releases = await response.json();
    let directExeUrl = null;
    let targetVersion = 'v0.33.6';

    for (const rel of releases) {
      if (rel.assets && Array.isArray(rel.assets)) {
        const exeAsset = rel.assets.find(a => 
          a.name.endsWith('.exe') && !a.name.includes('blockmap')
        );
        if (exeAsset && exeAsset.browser_download_url) {
          directExeUrl = exeAsset.browser_download_url;
          targetVersion = rel.tag_name || targetVersion;
          break;
        }
      }
    }

    if (directExeUrl) {
      if (downloadBtn) downloadBtn.href = directExeUrl;
      if (finalDownloadBtn) finalDownloadBtn.href = directExeUrl;
      if (navDownloadBtn) navDownloadBtn.href = directExeUrl;

      if (badgeVersionText) {
        badgeVersionText.textContent = `Echo ${targetVersion} disponível • Rápido, leve e direto`;
      }

      if (btnSub) {
        btnSub.textContent = `Instalador oficial ${targetVersion} (.exe) • Download Direto`;
      }
    }
  } catch (error) {
    console.warn('[Echo] Usando link de download direto padrão pré-configurado');
  }
}

/**
 * Seletor de Temas Leve no Bento Grid
 */
function setupThemePicker() {
  const themeChips = document.querySelectorAll('.theme-chip');
  const temasCard = document.getElementById('temas-card');

  const themeGlows = {
    obsidian: 'rgba(0, 242, 254, 0.4)',
    cyberpunk: 'rgba(238, 140, 121, 0.4)',
    dracula: 'rgba(189, 147, 249, 0.4)',
    nord: 'rgba(136, 192, 208, 0.4)'
  };

  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      themeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const theme = chip.getAttribute('data-theme');
      if (temasCard && themeGlows[theme]) {
        temasCard.style.borderColor = themeGlows[theme];
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  configureDirectDownload();
  setupThemePicker();
});
