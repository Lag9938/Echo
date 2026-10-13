/**
 * A janelinha de aviso que aparece enquanto o Echo está fechado e o instalador trabalha ("Atualizando o Echo…",
 * "Voltando para a versão X…"). Ela roda num PowerShell solto, depois de o app já ter fechado, então não dá para ser
 * uma janela do Electron: o executável está sendo trocado. Por isso é desenhada à mão em Windows Forms, no
 * mesmo visual da tela de atualização do app (Aurora Dark): cantos arredondados, fundo grafite com um brilho
 * coral, o átomo do Echo com anéis girando e uma barra de progresso que vai e volta. No aviso de falha o anel
 * dá lugar a um "!" vermelho e a barra some.
 *
 * Regras que não podem quebrar (a atualização nunca depende de o aviso aparecer):
 * - tudo que cria a janela fica dentro de try/catch; se falhar, `$form` fica nulo e o script segue sem aviso;
 * - o desenho só acontece quando o script "bombeia" a janela (Tick/Pump): quem espera deve chamar Pump, não
 *   Start-Sleep, ou a janela congela e o Windows a marca como "não respondendo".
 *
 * Devolve as linhas do script. Quem usa define `$form`, depois chama `Say 'título' 'subtítulo' ['busy'|'error']`.
 */
export function buildNoticeWindowScript({ width = 420, height = 128, title = '', subtitle = '' } = {}) {
  const q = (text) => String(text ?? '').replace(/'/g, "''")
  return [
    '$form = $null',
    `$script:notice = @{ Title = '${q(title)}'; Sub = '${q(subtitle)}'; Mode = 'busy'; Clock = [Diagnostics.Stopwatch]::StartNew(); W = ${width}; H = ${height}; Scale = 1.0 }`,
    'function RoundRect($x, $y, $w, $h, $r) {',
    '  $p = New-Object System.Drawing.Drawing2D.GraphicsPath',
    '  $d = $r * 2',
    '  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)',
    '  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)',
    '  $p.CloseFigure(); return $p',
    '}',
    // Desenho de um quadro. Coordenadas em "pixels lógicos" (o ScaleTransform cuida de telas com zoom).
    'function Paint-Notice($g) {',
    '  $n = $script:notice; $w = $n.W; $h = $n.H; $t = $n.Clock.Elapsed.TotalSeconds',
    "  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'ClearTypeGridFit'; $g.ScaleTransform($n.Scale, $n.Scale)",
    '  $err = ($n.Mode -eq "error")',
    '  $coral = if ($err) { [System.Drawing.Color]::FromArgb(248, 113, 113) } else { [System.Drawing.Color]::FromArgb(223, 109, 93) }',
    // fundo grafite em degradê + brilho da cor de destaque no canto
    '  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Rectangle(0, 0, $w, $h)), [System.Drawing.Color]::FromArgb(30, 28, 34), [System.Drawing.Color]::FromArgb(12, 11, 13), 90)',
    '  $g.FillRectangle($bg, 0, 0, $w, $h); $bg.Dispose()',
    '  $glow = New-Object System.Drawing.Drawing2D.GraphicsPath; $glow.AddEllipse(-60, -70, 260, 200)',
    '  $gb = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow); $gb.CenterColor = [System.Drawing.Color]::FromArgb(54, $coral); $gb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $coral))',
    '  $g.FillPath($gb, $glow); $gb.Dispose(); $glow.Dispose()',
    // borda fina clara
    '  $bp = RoundRect 0.5 0.5 ($w - 1) ($h - 1) 22; $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(48, 255, 255, 255), 1); $g.DrawPath($pen, $bp); $pen.Dispose(); $bp.Dispose()',
    // o "medalhão" à esquerda
    '  $cx = 56; $cy = $h / 2 - 2',
    '  $disc = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, $coral)); $g.FillEllipse($disc, $cx - 27, $cy - 27, 54, 54); $disc.Dispose()',
    '  if ($err) {',
    '    $rp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, $coral), 2.5); $g.DrawEllipse($rp, $cx - 26, $cy - 26, 52, 52); $rp.Dispose()',
    '    $f = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel); $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = "Center"; $sf.LineAlignment = "Center"',
    '    $tb = New-Object System.Drawing.SolidBrush($coral); $g.DrawString("!", $f, $tb, (New-Object System.Drawing.RectangleF(($cx - 27), ($cy - 27), 54, 54)), $sf); $tb.Dispose(); $f.Dispose(); $sf.Dispose()',
    '  } else {',
    // dois anéis em sentidos opostos
    '    $a1 = New-Object System.Drawing.Pen($coral, 3); $a1.StartCap = "Round"; $a1.EndCap = "Round"',
    '    $g.DrawArc($a1, $cx - 27, $cy - 27, 54, 54, ($t * 260) % 360, 110); $a1.Dispose()',
    '    $a2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(110, $coral), 2); $a2.StartCap = "Round"; $a2.EndCap = "Round"',
    '    $g.DrawArc($a2, $cx - 33, $cy - 33, 66, 66, 360 - (($t * 150) % 360), 70); $a2.Dispose()',
    // o átomo do Echo no centro: três órbitas e o núcleo
    '    $ap = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 255, 255, 255), 1.6)',
    '    foreach ($deg in 0, 60, 120) { $g.TranslateTransform($cx, $cy); $g.RotateTransform($deg + ($t * 18)); $g.DrawEllipse($ap, -13, -5.5, 26, 11); $g.ResetTransform(); $g.ScaleTransform($n.Scale, $n.Scale) }',
    '    $ap.Dispose(); $core = New-Object System.Drawing.SolidBrush($coral); $g.FillEllipse($core, $cx - 3.2, $cy - 3.2, 6.4, 6.4); $core.Dispose()',
    '  }',
    // textos
    '  $sf2 = New-Object System.Drawing.StringFormat; $sf2.Trimming = "EllipsisWord"',
    '  $tf = New-Object System.Drawing.Font("Segoe UI Semibold", 18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)',
    '  $sb = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)',
    '  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 237, 239)); $muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(189, 182, 187))',
    '  $tx = 104; $tw = $w - $tx - 26',
    '  $titleTop = if ($err) { 26 } else { 24 }',
    '  $g.DrawString($n.Title, $tf, $white, (New-Object System.Drawing.RectangleF($tx, $titleTop, $tw, 26)), $sf2)',
    '  $g.DrawString($n.Sub, $sb, $muted, (New-Object System.Drawing.RectangleF($tx, ($titleTop + 28), $tw, 44)), $sf2)',
    '  $white.Dispose(); $muted.Dispose(); $tf.Dispose(); $sb.Dispose(); $sf2.Dispose()',
    // barra que vai e volta (só no aviso normal): não sabemos quanto falta, só que está andando
    '  if (-not $err) {',
    '    $bx = $tx; $by = $h - 28; $bw = $tw; $bh = 5',
    '    $track = RoundRect $bx $by $bw $bh 2.5; $tb2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(36, 255, 255, 255)); $g.FillPath($tb2, $track); $tb2.Dispose()',
    '    $g.SetClip($track); $ph = ($t * 0.75) % 1.4; $sx = $bx + ($ph - 0.4) * $bw; $sw = $bw * 0.4',
    '    $seg = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.RectangleF($sx, $by, $sw, $bh)), [System.Drawing.Color]::FromArgb(240, 128, 112), $coral, 0)',
    '    $g.FillRectangle($seg, $sx, $by, $sw, $bh); $seg.Dispose(); $g.ResetClip(); $track.Dispose()',
    '  }',
    '  $g.ResetTransform()',
    '}',
    'try {',
    '  Add-Type -AssemblyName System.Windows.Forms, System.Drawing',
    // Sem isto o Windows estica a janela como imagem em telas com zoom e o texto fica borrado
    '  try { Add-Type -Name EchoDpi -Namespace EchoNotice -MemberDefinition \'[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool SetProcessDPIAware();\'; [void][EchoNotice.EchoDpi]::SetProcessDPIAware() } catch {}',
    '  $probe = [System.Drawing.Graphics]::FromHwnd([IntPtr]::Zero); $script:notice.Scale = [Math]::Max(1.0, $probe.DpiX / 96.0); $probe.Dispose()',
    '  $pw = [int][Math]::Round($script:notice.W * $script:notice.Scale); $ph0 = [int][Math]::Round($script:notice.H * $script:notice.Scale)',
    '  $form = New-Object System.Windows.Forms.Form',
    "  $form.Text = 'Echo'; $form.FormBorderStyle = 'None'; $form.StartPosition = 'CenterScreen'",
    '  $form.Size = New-Object System.Drawing.Size($pw, $ph0); $form.TopMost = $true; $form.ShowInTaskbar = $false',
    '  $form.BackColor = [System.Drawing.Color]::FromArgb(12, 11, 13)',
    "  [System.Windows.Forms.Form].GetProperty('DoubleBuffered', [Reflection.BindingFlags]'Instance,NonPublic').SetValue($form, $true, $null)",
    '  $rp0 = RoundRect 0 0 $pw $ph0 ([int](22 * $script:notice.Scale)); $form.Region = New-Object System.Drawing.Region($rp0); $rp0.Dispose()',
    '  $form.Add_Paint({ param($s, $e) try { Paint-Notice $e.Graphics } catch {} })',
    '  $form.Show(); [System.Windows.Forms.Application]::DoEvents()',
    '} catch { $form = $null; $script:noticeError = $_.Exception.Message }',
    // Muda o texto (e o modo) e redesenha
    "function Say($t, $s, $mode = 'busy') { $script:notice.Title = $t; $script:notice.Sub = $s; $script:notice.Mode = $mode; Tick }",
    // Um quadro: redesenha e processa os eventos da janela. Fora do try/catch acima de propósito: sem janela, não faz nada.
    'function Tick { if ($form) { try { $form.Invalidate(); [System.Windows.Forms.Application]::DoEvents() } catch {} } }',
    // Espera N segundos animando a janela a ~30 quadros por segundo (Start-Sleep puro a congelaria)
    'function Pump($seconds) { for ($i = 0; $i -lt [int]($seconds * 30); $i++) { Tick; Start-Sleep -Milliseconds 33 } }'
  ]
}
