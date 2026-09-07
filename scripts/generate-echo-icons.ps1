Add-Type -AssemblyName System.Drawing

function Draw-EchoIcon([int]$size, [string]$outputPath, [bool]$hasBackground = $true) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $g.Clear([System.Drawing.Color]::Transparent)

    if ($hasBackground) {
        # Rounded squircle background
        $corner = $size * 0.22
        $rect = New-Object System.Drawing.RectangleF(1, 1, ($size - 2), ($size - 2))
        $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $bgPath.AddArc($rect.X, $rect.Y, $corner * 2, $corner * 2, 180, 90)
        $bgPath.AddArc($rect.Right - ($corner * 2), $rect.Y, $corner * 2, $corner * 2, 270, 90)
        $bgPath.AddArc($rect.Right - ($corner * 2), $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 0, 90)
        $bgPath.AddArc($rect.X, $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 90, 90)
        $bgPath.CloseFigure()

        # Gradient fill (dark sleek modern navy/black)
        $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            [System.Drawing.PointF]::new(0, 0),
            [System.Drawing.PointF]::new($size, $size),
            [System.Drawing.Color]::FromArgb(255, 20, 26, 40),
            [System.Drawing.Color]::FromArgb(255, 9, 12, 18)
        )
        $g.FillPath($bgBrush, $bgPath)

        # Subtle cyan border
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 0, 242, 254), [Math]::Max(1.0, $size * 0.025))
        $g.DrawPath($borderPen, $bgPath)
        $borderPen.Dispose()
        $bgBrush.Dispose()
        $bgPath.Dispose()
    }

    # Center coordinates
    $cx = $size / 2.0
    $cy = $size / 2.0
    $scale = ($size / 24.0) * 0.78

    # Pen for atom rings
    $ringColor = [System.Drawing.Color]::FromArgb(255, 0, 242, 254) # #00f2fe
    $ringPen = New-Object System.Drawing.Pen($ringColor, [Math]::Max(1.2, $scale * 1.6))

    # Draw 3 rotated ellipses: 30, 90, 150 deg
    $rx = 9.3 * $scale
    $ry = 3.5 * $scale

    foreach ($angle in @(30, 90, 150)) {
        $state = $g.Save()
        $g.TranslateTransform($cx, $cy)
        $g.RotateTransform($angle)
        $g.DrawEllipse($ringPen, -$rx, -$ry, ($rx * 2), ($ry * 2))
        $g.Restore($state)
    }

    # Nucleus (center circle)
    $nucRadius = 2.0 * $scale
    $nucBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillEllipse($nucBrush, ($cx - $nucRadius), ($cy - $nucRadius), ($nucRadius * 2), ($nucRadius * 2))

    # Satellite electrons at angles
    $electronRadius = 1.3 * $scale
    $elecBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    
    # Offsets matching SVG: (20-12, 7.4-12) => (8, -4.6), (0, -9.3), (-8, -4.6)
    $dots = @(
        @{ X = 8.0 * $scale; Y = -4.6 * $scale },
        @{ X = 0.0 * $scale; Y = -9.3 * $scale },
        @{ X = -8.0 * $scale; Y = -4.6 * $scale }
    )
    foreach ($d in $dots) {
        $g.FillEllipse($elecBrush, ($cx + $d.X - $electronRadius), ($cy + $d.Y - $electronRadius), ($electronRadius * 2), ($electronRadius * 2))
    }

    $nucBrush.Dispose()
    $elecBrush.Dispose()
    $ringPen.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $outputPath"
}

# Ensure directories exist
$assetsDir = Join-Path $PSScriptRoot '..\assets'
$storeDir = Join-Path $assetsDir 'store'
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
New-Item -ItemType Directory -Force -Path $storeDir | Out-Null

Draw-EchoIcon 256 (Join-Path $assetsDir "echo-icon.png") $true
Draw-EchoIcon 32  (Join-Path $assetsDir "echo-tray.png") $true
Draw-EchoIcon 44  (Join-Path $storeDir "SampleAppx.44x44.png") $true
Draw-EchoIcon 50  (Join-Path $storeDir "SampleAppx.50x50.png") $true
Draw-EchoIcon 150 (Join-Path $storeDir "SampleAppx.150x150.png") $true

# Wide 310x150
$w = 310
$h = 150
$bmpWide = New-Object System.Drawing.Bitmap($w, $h)
$gWide = [System.Drawing.Graphics]::FromImage($bmpWide)
$gWide.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$bgBrushWide = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new(0, 0),
    [System.Drawing.PointF]::new($w, $h),
    [System.Drawing.Color]::FromArgb(255, 20, 26, 40),
    [System.Drawing.Color]::FromArgb(255, 9, 12, 18)
)
$gWide.FillRectangle($bgBrushWide, 0, 0, $w, $h)
$bgBrushWide.Dispose()

$subBmp = New-Object System.Drawing.Bitmap((Join-Path $storeDir "SampleAppx.150x150.png"))
$gWide.DrawImage($subBmp, 15, 10, 130, 130)
$subBmp.Dispose()
$gWide.Dispose()
$widePath = Join-Path $storeDir "SampleAppx.310x150.png"
$bmpWide.Save($widePath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpWide.Dispose()
Write-Host "Created: $widePath"
