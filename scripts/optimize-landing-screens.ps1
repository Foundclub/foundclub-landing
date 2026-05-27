$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" }

function New-QualityParameters([long]$quality) {
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    $quality
  )
  return $params
}

function Optimize-ImageFolder {
  param(
    [string]$SourceDir,
    [string]$TargetDir,
    [int]$MaxWidth = 620,
    [long]$Quality = 84
  )

  if (!(Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir | Out-Null
  }

  $qualityParams = New-QualityParameters $Quality

  $files = Get-ChildItem -Path $SourceDir -File | Where-Object {
    $_.Extension -match '^\.(png|jpg|jpeg)$'
  }

  foreach ($file in $files) {
    $sourcePath = $file.FullName
    $targetPath = Join-Path $TargetDir ($file.BaseName + ".jpg")

    $image = [System.Drawing.Image]::FromFile($sourcePath)
    try {
      $targetWidth = if ($image.Width -gt $MaxWidth) { $MaxWidth } else { $image.Width }
      $targetHeight = [int]([math]::Round($image.Height * ($targetWidth / $image.Width)))

      $bitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.Clear([System.Drawing.Color]::FromArgb(7, 19, 27))
          $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)
        } finally {
          $graphics.Dispose()
        }

        $bitmap.Save($targetPath, $jpegEncoder, $qualityParams)
      } finally {
        $bitmap.Dispose()
      }
    } finally {
      $image.Dispose()
    }
  }
}

$jobs = @(
  @{
    SourceDir = (Join-Path $PSScriptRoot "..\\images\\Screen")
    TargetDir = (Join-Path $PSScriptRoot "..\\images\\Screen-landing")
    MaxWidth = 620
    Quality = 84
  },
  @{
    SourceDir = (Join-Path $PSScriptRoot "..\\images\\guide\\joueur")
    TargetDir = (Join-Path $PSScriptRoot "..\\images\\guide-landing\\joueur")
    MaxWidth = 560
    Quality = 82
  },
  @{
    SourceDir = (Join-Path $PSScriptRoot "..\\images\\guide\\entraineur")
    TargetDir = (Join-Path $PSScriptRoot "..\\images\\guide-landing\\entraineur")
    MaxWidth = 560
    Quality = 82
  },
  @{
    SourceDir = (Join-Path $PSScriptRoot "..\\images\\guide\\dirigeant")
    TargetDir = (Join-Path $PSScriptRoot "..\\images\\guide-landing\\dirigeant")
    MaxWidth = 560
    Quality = 82
  }
)

foreach ($job in $jobs) {
  Optimize-ImageFolder @job
}

$jobs |
  ForEach-Object {
    Get-ChildItem -Path $_.TargetDir -File |
      Sort-Object Name |
      Select-Object @{Name="Folder";Expression={[System.IO.Path]::GetFileName($_.DirectoryName)}}, Name, @{Name="KB";Expression={[math]::Round($_.Length / 1kb, 1)}}
  }
