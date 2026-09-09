#!/bin/bash
set -e

# Configurações do Repositório (pode ser substituído via variável de ambiente: REPO_URL=... ./deploy.sh)
DEFAULT_REPO="https://github.com/ApenasGabs/JobsFinder-client.git"
REPO_URL="${REPO_URL:-$DEFAULT_REPO}"
TARGET_DIR="${TARGET_DIR:-S-Job-Crawler}"
BRANCH="${BRANCH:-main}"

echo "======================================================"
echo "🚀 S-Job-Crawler - Script Automático de Deploy / Atualização"
echo "======================================================"

# Verifica se o docker e docker compose estão disponíveis
if ! command -v docker &> /dev/null; then
    echo "❌ Erro: 'docker' não foi encontrado. Instale o Docker antes de continuar."
    exit 1
fi

# Verifica se está rodando dentro da própria pasta do projeto ou fora dela
if [ -f "docker-compose.yml" ] && [ -f "Dockerfile" ]; then
    echo "📂 Você já está dentro da pasta do projeto ($(pwd))."
    PROJECT_DIR="$(pwd)"
else
    if [ ! -d "$TARGET_DIR" ]; then
        echo "📥 Repositório não encontrado. Baixando automaticamente de $REPO_URL..."
        if command -v git &> /dev/null; then
            git clone -b "$BRANCH" "$REPO_URL" "$TARGET_DIR"
        else
            echo "⚠️  'git' não encontrado. Tentando baixar via tarball/zip..."
            mkdir -p "$TARGET_DIR"
            curl -fsSL "https://github.com/ApenasGabs/JobsFinder-client/archive/refs/heads/${BRANCH}.tar.gz" | tar -xz --strip-components=1 -C "$TARGET_DIR"
        fi
        echo "✅ Repositório baixado com sucesso em ./$TARGET_DIR"
    else
        echo "📁 Pasta '$TARGET_DIR' já existe. Verificando atualizações..."
        if [ -d "$TARGET_DIR/.git" ] && command -v git &> /dev/null; then
            (cd "$TARGET_DIR" && git pull origin "$BRANCH" || echo "⚠️ Não foi possível dar git pull, prosseguindo com arquivos locais.")
        fi
    fi
    PROJECT_DIR="$(pwd)/$TARGET_DIR"
    cd "$PROJECT_DIR"
fi

# Garante que os diretórios persistentes para volumes existam
echo "📦 Criando e verificando diretórios persistentes..."
mkdir -p data config auth_baileys

# Se não existir search.config.json, o container criará com os padrões ou podemos garantir
if [ ! -f "config/search.config.json" ] && [ -f "config/search.config.example.json" ]; then
    cp config/search.config.example.json config/search.config.json
fi

# Detecta se é 'docker compose' (v2) ou 'docker-compose' (v1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Erro: Nem 'docker compose' nem 'docker-compose' foram encontrados."
    exit 1
fi

echo "🐳 Subindo os containers com $COMPOSE_CMD..."
$COMPOSE_CMD up -d --build

# Obtém o IP da máquina na rede local
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "======================================================"
echo "🎉 S-Job-Crawler implantado e rodando com sucesso!"
echo "======================================================"
echo "👉 Acesse o painel pelo navegador:"
echo "   http://${SERVER_IP}:3001"
echo ""
echo "📱 Próximo passo no painel:"
echo "   1. Clique em 'Conectar WhatsApp' e escaneie o QR Code."
echo "   2. Selecione o grupo que receberá as vagas novas."
echo "======================================================"
