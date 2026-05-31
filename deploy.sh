#!/usr/bin/env bash
# ============================================================
#  ngandic 一键部署更新脚本
#  用法: ./deploy.sh [--force] [--no-backup]
# ============================================================
set -euo pipefail

# ── 颜色定义 ──────────────────────────────────────────────
RED='\033[0;31m';    GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'
CYAN='\033[0;36m';   MAGENTA='\033[0;35m'
BOLD='\033[1m';      DIM='\033[2m'
NC='\033[0m'         # No Color

# ── 配置 ──────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${PROJECT_DIR}/.deploy-backups"
LOG_FILE="${PROJECT_DIR}/.deploy.log"
FORCE=false
NO_BACKUP=false

# ── 参数解析 ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force)    FORCE=true; shift ;;
        --no-backup) NO_BACKUP=true; shift ;;
        -h|--help)
            echo "用法: ./deploy.sh [选项]"
            echo "  --force      跳过确认，直接部署"
            echo "  --no-backup  跳过数据库备份"
            echo "  -h, --help   显示帮助"
            exit 0
            ;;
        *) echo -e "${RED}未知参数: $1${NC}"; exit 1 ;;
    esac
done

# ── 工具函数 ──────────────────────────────────────────────

log()   { echo -e "$(date '+%H:%M:%S') $1" | tee -a "$LOG_FILE"; }
ok()    { log "  ${GREEN}✓${NC} $1"; }
warn()  { log "  ${YELLOW}⚠${NC} $1"; }
fail()  { log "  ${RED}✗${NC} $1"; }
step()  { echo -e "\n${BOLD}${CYAN}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"; }

# 进度条 (输入: 当前值 最大值 宽度)
progress_bar() {
    local current=$1 max=$2 width=${3:-40}
    local filled=$(( current * width / max ))
    local empty=$(( width - filled ))
    local pct=$(( current * 100 / max ))
    printf -v bar "%${filled}s" ""; bar=${bar// /█}
    printf -v space "%${empty}s" ""; space=${space// /░}
    printf "\r  ${CYAN}[%-${width}s]${NC} %3d%%" "${bar}${space}" "$pct"
}

# 旋转动画 (后台运行, 输出 PID)
spinner() {
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local delay=0.1
    while true; do
        for ((i=0; i<${#chars}; i++)); do
            printf "\r  ${BLUE}%s${NC} %s" "${chars:$i:1}" "$1"
            sleep $delay
        done
    done
}

# 执行带 spinner 的命令
run_with_spinner() {
    local msg="$1"; shift
    log "  ${DIM}$msg...${NC}"
    spinner "$msg" &
    local sp=${!}
    "$@" > /dev/null 2>&1
    local ret=$?
    kill $sp 2>/dev/null; wait $sp 2>/dev/null
    printf "\r\033[K"  # 清除 spinner 行
    return $ret
}

# ── 前置检查 ──────────────────────────────────────────────

check_prerequisites() {
    local errors=0

    command -v git      >/dev/null 2>&1 || { fail "未安装 git";      ((errors++)); }
    command -v docker    >/dev/null 2>&1 || { fail "未安装 docker";    ((errors++)); }
    command -v docker compose >/dev/null 2>&1 || {
        # 兼容旧版 docker-compose
        if command -v docker-compose >/dev/null 2>&1; then
            DOCKER_COMPOSE="docker-compose"
        else
            fail "未安装 docker compose"
            ((errors++))
        fi
    }

    [[ $errors -gt 0 ]] && { echo -e "${RED}请先安装缺失的依赖${NC}"; exit 1; }

    DOCKER_COMPOSE="${DOCKER_COMPOSE:-docker compose}"
    [[ -f "${PROJECT_DIR}/docker-compose.yml" ]] || { fail "找不到 docker-compose.yml"; exit 1; }

    ok "环境检查通过 (${DOCKER_COMPOSE})"
}

# ── Git 拉取 ──────────────────────────────────────────────

pull_code() {
    cd "$PROJECT_DIR"

    local before after
    before=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

    if ! run_with_spinner "拉取远程代码" git pull origin master; then
        fail "Git pull 失败 — 请检查网络或解决冲突"
        return 1
    fi

    after=$(git rev-parse HEAD)

    if [[ "$before" == "$after" ]]; then
        echo -e "${DIM}  已是最新，无需构建${NC}"
        return 2  # 返回 2 表示无变化
    fi

    # 显示变更摘要
    local count
    count=$(git rev-list --count "${before}..${after}" 2>/dev/null || echo "?")
    ok "拉取成功 — ${count} 个新提交"
    git log --oneline "${before}..${after}" 2>/dev/null | while read -r line; do
        echo -e "     ${DIM}${line}${NC}"
    done
    return 0
}

# ── 备份数据库 ────────────────────────────────────────────

backup_db() {
    $NO_BACKUP && { log "  ${DIM}跳过备份 (--no-backup)${NC}"; return 0; }
    mkdir -p "$BACKUP_DIR"

    local ts
    ts=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/ngandic_${ts}.sqlite"

    # 从 Docker volume 中复制数据库
    if run_with_spinner "备份数据库" docker cp "$(docker compose ps -q backend 2>/dev/null):/app/data/ngandic.sqlite" "$backup_file" 2>/dev/null; then
        local size
        size=$(du -h "$backup_file" | cut -f1)
        ok "数据库备份完成 — ${size} (${backup_file})"

        # 只保留最近 10 个备份
        local count
        count=$(ls -1 "$BACKUP_DIR"/*.sqlite 2>/dev/null | wc -l)
        if [[ $count -gt 10 ]]; then
            ls -1t "$BACKUP_DIR"/*.sqlite | tail -n +11 | xargs rm -f
            ok "清理旧备份 (保留最近 10 个)"
        fi
    else
        warn "数据库备份跳过 (容器可能未运行，首次部署属正常)"
    fi
}

# ── Docker 构建 & 部署 ────────────────────────────────────

build_and_deploy() {
    cd "$PROJECT_DIR"

    # 模拟进度: 构建阶段
    echo ""
    step "$CURRENT_STEP" "构建 Docker 镜像…"; ((CURRENT_STEP++))

    # 先构建 (显示实时输出的一部分)
    log "  ${DIM}docker compose build...${NC}"

    # 使用后台 spinner + 构建
    spinner "构建中" &
    local sp=${!}

    local build_out build_ret
    build_out=$($DOCKER_COMPOSE build --no-cache 2>&1)
    build_ret=$?
    kill $sp 2>/dev/null; wait $sp 2>/dev/null
    printf "\r\033[K"

    if [[ $build_ret -ne 0 ]]; then
        fail "构建失败 — 详情见上方输出"
        echo "$build_out" | tail -30
        return 1
    fi
    ok "镜像构建完成"

    # 部署: 重启容器
    step "$CURRENT_STEP" "重启服务 (滚动更新)…"; ((CURRENT_STEP++))

    log "  ${DIM}docker compose up...${NC}"

    spinner "启动中" &
    sp=${!}

    # 先停旧容器再启动新容器
    local deploy_out deploy_ret
    deploy_out=$($DOCKER_COMPOSE up -d --remove-orphans 2>&1)
    deploy_ret=$?
    kill $sp 2>/dev/null; wait $sp 2>/dev/null
    printf "\r\033[K"

    if [[ $deploy_ret -ne 0 ]]; then
        fail "部署失败"
        echo "$deploy_out" | tail -20
        return 1
    fi
    ok "容器已启动"
}

# ── 健康检查 ──────────────────────────────────────────────

health_check() {
    step "$CURRENT_STEP" "健康检查…"; ((CURRENT_STEP++))

    # 等容器就绪 (最多 30 秒)
    local i=0 max=30
    local nginx_ok=false backend_ok=false

    while [[ $i -lt $max ]]; do
        # 检查 nginx
        if ! $nginx_ok; then
            curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null | grep -q "200" && {
                nginx_ok=true
            }
        fi

        # 检查 backend
        if ! $backend_ok; then
            $DOCKER_COMPOSE ps 2>/dev/null | grep backend | grep -q "Up" && {
                backend_ok=true
            }
        fi

        if $nginx_ok && $backend_ok; then
            ok "所有服务就绪 ✓"
            echo ""
            return 0
        fi

        sleep 1
        ((i++))

        # 异步进度条
        [[ $((i % 5)) -eq 0 ]] && \
            log "  ${DIM}等待服务就绪… (${i}s/${max}s)${NC}"
    done

    warn "健康检查超时 (${max}s)"
    $DOCKER_COMPOSE ps 2>/dev/null || true
    return 0  # 不阻止, 仅警告
}

# ── 最终状态 ──────────────────────────────────────────────

show_status() {
    echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  部署完成${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 容器状态表格
    echo -e "\n${BOLD}容器状态:${NC}"
    $DOCKER_COMPOSE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || {
        warn "无法获取容器状态"
    }

    # 当前版本信息
    local commit
    commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo -e "\n${DIM}版本: ${commit}  |  时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${DIM}日志: ${LOG_FILE}${NC}\n"
}

# ── 主流程 ────────────────────────────────────────────────

main() {
    TOTAL_STEPS=5
    CURRENT_STEP=1

    echo -e "\n${BOLD}${MAGENTA}╔══════════════════════════════════════╗${NC}"
    echo -e   "${BOLD}${MAGENTA}║   ${BOLD}言典 Ngandic · 一键部署       ${MAGENTA}║${NC}"
    echo -e   "${BOLD}${MAGENTA}╚══════════════════════════════════════╝${NC}"
    echo -e "${DIM}项目路径: ${PROJECT_DIR}${NC}"
    echo -e "${DIM}时间:      $(date '+%Y-%m-%d %H:%M:%S')${NC}"

    # 确认 (除非 --force)
    if ! $FORCE; then
        echo ""
        read -r -p "$(echo -e ${YELLOW}"确认部署更新？[Y/n] "${NC})" confirm
        [[ "$confirm" =~ ^[Nn] ]] && { echo "已取消"; exit 0; }
    fi

    # ── Step 1: 环境检查 ──
    step "$CURRENT_STEP" "检查环境依赖"; ((CURRENT_STEP++))
    check_prerequisites

    # ── Step 2: 拉取代码 ──
    step "$CURRENT_STEP" "拉取最新代码"; ((CURRENT_STEP++))
    pull_code
    local pull_result=$?

    if [[ $pull_result -eq 2 ]]; then
        echo -e "\n${GREEN}代码已是最新，跳过构建。${NC}"
        # 仍然做健康检查
        TOTAL_STEPS=2; CURRENT_STEP=2
        health_check
        show_status
        exit 0
    elif [[ $pull_result -ne 0 ]]; then
        fail "代码拉取失败，终止部署"
        exit 1
    fi

    # ── Step 3: 备份 ──
    step "$CURRENT_STEP" "备份数据库"; ((CURRENT_STEP++))
    backup_db

    # ── Step 4: 构建 & 部署 ──
    build_and_deploy || {
        echo -e "\n${RED}部署失败！请检查日志: ${LOG_FILE}${NC}"
        exit 1
    }

    # ── Step 5: 健康检查 ──
    health_check

    # ── 完成 ──
    show_status
}

# ── 入口 ──────────────────────────────────────────────────
main "$@"
