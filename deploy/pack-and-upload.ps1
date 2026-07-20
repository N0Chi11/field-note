# ============================================================================
# 本地打包+上传脚本 (Windows PowerShell)
# 在本地执行，打包项目并上传到阿里云服务器
# 
# 使用方法：
#   1. 修改下面的 SSH_USER 和 SERVER_IP（如果不同）
#   2. 在 PowerShell 中执行: powershell -ExecutionPolicy Bypass -File deploy\pack-and-upload.ps1
# ============================================================================

$SSH_USER = "root"
$SERVER_IP = "47.116.101.102"
$REMOTE_DIR = "/root/equipment-system"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  器材设备管理系统 — 打包并上传到服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取项目根目录
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectDir
Write-Host "项目目录: $ProjectDir" -ForegroundColor Green

# ===== 1. 构建前端 =====
Write-Host ""
Write-Host "[1/3] 构建前端..." -ForegroundColor Yellow
$frontendDir = Join-Path $ProjectDir "frontend"
if (Test-Path (Join-Path $frontendDir "node_modules")) {
    Set-Location $frontendDir
    npm run build 2>&1 | Select-Object -Last 3
    Set-Location $ProjectDir
    Write-Host "  前端构建完成" -ForegroundColor Green
} else {
    Write-Host "  node_modules 不存在，跳过构建（请先 npm install）" -ForegroundColor Red
    Write-Host "  如果服务器已有 dist 目录可以跳过" -ForegroundColor Yellow
}

# ===== 2. 打包项目 =====
Write-Host ""
Write-Host "[2/3] 打包项目..." -ForegroundColor Yellow
$tarFile = "equipment-system.tar.gz"
$exclude = @("node_modules", ".git", "__pycache__", "*.pyc", "*.pyo", ".env")
$excludeArgs = ($exclude | ForEach-Object { "--exclude=$_" }) -join " "
$cmd = "tar -czf $tarFile $excludeArgs ."
Invoke-Expression $cmd
$fileSize = [math]::Round((Get-Item $tarFile).Length / 1MB, 1)
Write-Host "  打包完成: $tarFile ($fileSize MB)" -ForegroundColor Green

# ===== 3. 上传到服务器 =====
Write-Host ""
Write-Host "[3/3] 上传到服务器 $SERVER_IP ..." -ForegroundColor Yellow
Write-Host "  如果提示输入密码，请输入服务器 SSH 密码" -ForegroundColor Yellow
scp $tarFile "${SSH_USER}@${SERVER_IP}:/root/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  上传完成" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  上传成功！接下来 SSH 登录服务器执行：" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ssh $SSH_USER@$SERVER_IP" -ForegroundColor White
    Write-Host "  cd /root" -ForegroundColor White
    Write-Host "  mkdir -p equipment-system && tar -xzf equipment-system.tar.gz -C equipment-system" -ForegroundColor White
    Write-Host "  cd equipment-system" -ForegroundColor White
    Write-Host "  cp deploy/.env.prod .env" -ForegroundColor White
    Write-Host "  vi .env  # 修改密码" -ForegroundColor White
    Write-Host "  chmod +x deploy/deploy.sh && ./deploy/deploy.sh" -ForegroundColor White
    Write-Host ""
    Write-Host "  访问地址: http://$SERVER_IP" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "  上传失败，请检查 SSH 连接" -ForegroundColor Red
}

# 清理本地打包文件
Remove-Item $tarFile -Force -ErrorAction SilentlyContinue
