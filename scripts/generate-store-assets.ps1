Add-Type -AssemblyName System.Drawing

function New-EchoLogo([int]$width, [int]$height, [string]$path) {
  $bitmap = [System.Drawing.Bitmap]::new($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(223, 109, 93))

  $markSize = [Math]::Min($height * 0.68, $width * 0.36)
  $x = ($width - $markSize) / 2
  $y = ($height - $markSize) / 2
  $pathShape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $radius = $markSize * 0.28
  $pathShape.AddArc($x, $y, $radius * 2, $radius * 2, 180, 90)
  $pathShape.AddArc($x + $markSize - ($radius * 2), $y, $radius * 2, $radius * 2, 270, 90)
  $pathShape.AddArc($x + $markSize - ($radius * 2), $y + $markSize - ($radius * 2), $radius * 2, $radius * 2, 0, 90)
  $pathShape.AddLine($x + $radius, $y + $markSize, $x, $y + $markSize)
  $pathShape.AddLine($x, $y + $markSize, $x, $y + $radius)
  $pathShape.CloseFigure()
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new($x, $y, $markSize, $markSize), [System.Drawing.Color]::FromArgb(255, 244, 161, 139), [System.Drawing.Color]::FromArgb(255, 203, 72, 107), 45)
  $graphics.FillPath($gradient, $pathShape)

  $barWidth = [Math]::Max(2, [int]($markSize * 0.08))
  $gap = [Math]::Max(2, [int]($markSize * 0.09))
  $bars = @( ($markSize * 0.27), ($markSize * 0.52), ($markSize * 0.34) )
  for ($index = 0; $index -lt 3; $index++) {
    $barHeight = $bars[$index]
    $barX = $x + ($markSize / 2) - (($barWidth * 3 + $gap * 2) / 2) + $index * ($barWidth + $gap)
    $barY = $y + ($markSize - $barHeight) / 2
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $graphics.FillRectangle($brush, $barX, $barY, $barWidth, $barHeight)
    $brush.Dispose()
  }
  $gradient.Dispose(); $pathShape.Dispose(); $graphics.Dispose()
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$assets = Join-Path $PSScriptRoot '..\assets\store'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
New-EchoLogo 50 50 (Join-Path $assets 'SampleAppx.50x50.png')
New-EchoLogo 44 44 (Join-Path $assets 'SampleAppx.44x44.png')
New-EchoLogo 150 150 (Join-Path $assets 'SampleAppx.150x150.png')
New-EchoLogo 310 150 (Join-Path $assets 'SampleAppx.310x150.png')
