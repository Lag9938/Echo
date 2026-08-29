# Script para configurar automaticamente o SMTP do Resend no Supabase
# Execute este script no terminal PowerShell dentro da pasta do projeto: .\configure-smtp.ps1

Write-Host "=== Configurando SMTP do Resend no Supabase ===" -ForegroundColor Cyan
Write-Host ""

# 1. Solicita as informações necessárias de forma segura
$tokenInput = Read-Host -Prompt "1. Cole seu Supabase Personal Access Token (PAT)"
$resendKey = Read-Host -Prompt "2. Cole sua API Key do Resend (começa com re_)"
$senderEmail = Read-Host -Prompt "3. Digite o E-mail de Envio (deve ser do domínio verificado no Resend, ex: no-reply@seudominio.com)"
$senderName = Read-Host -Prompt "4. Digite o Nome do Remetente (ex: Echo)"

# Limpa espaços em branco acidentais
$token = $tokenInput.Trim()
$resendKey = $resendKey.Trim()
$senderEmail = $senderEmail.Trim()
$senderName = $senderName.Trim()

if (-not $token -or -not $resendKey -or -not $senderEmail) {
    Write-Host "Erro: Todos os campos (exceto opcionalmente o nome) devem ser preenchidos." -ForegroundColor Red
    exit
}

if (-not $senderName) {
    $senderName = "Echo"
}

# Referência do projeto obtida automaticamente do seu .env.local
$projectRef = "fcgizoopltqrldixvyve"

# 2. Prepara o payload para a API
$body = @{
    smtp_host        = "smtp.resend.com"
    smtp_port        = "587"
    smtp_user        = "resend"
    smtp_pass        = $resendKey
    smtp_sender_name = $senderName
    smtp_admin_email = $senderEmail
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

Write-Host ""
Write-Host "Enviando configuração para o Supabase (Projeto: $projectRef)..." -ForegroundColor Yellow

try {
    # Realiza a chamada PATCH para atualizar a configuração de autenticação do Supabase
    $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/config/auth" -Method Patch -Headers $headers -Body $body -ErrorAction Stop
    Write-Host ""
    Write-Host "✔ Sucesso! O SMTP do Resend foi configurado e ativado no seu projeto Supabase." -ForegroundColor Green
    Write-Host "Agora o seu aplicativo Echo enviará e-mails de confirmação e senha através do Resend!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Falha ao configurar o SMTP." -ForegroundColor Red
    Write-Host "Detalhe do erro: $_" -ForegroundColor Red
    Write-Host "Verifique se o seu Personal Access Token do Supabase está correto e tem as permissões necessárias." -ForegroundColor Yellow
}
