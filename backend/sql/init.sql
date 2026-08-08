-- ============================================================================
-- Equipment Management System - MySQL 初始化脚本
-- 数据库: equipment_db
-- 字符集: utf8mb4
-- ============================================================================

-- 设置连接字符集（确保 init.sql 中的中文正确写入）
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS equipment_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 授权 equip_app 用户访问 equipment_db（解决 Access denied 问题）
GRANT ALL PRIVILEGES ON equipment_db.* TO 'equip_app'@'%';
FLUSH PRIVILEGES;

USE equipment_db;

-- ============================================================================
-- 1. users 用户表
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT       NOT NULL AUTO_INCREMENT                COMMENT '主键',
    student_id    VARCHAR(64)  NOT NULL                               COMMENT '学号/工号',
    name          VARCHAR(64)  NOT NULL                               COMMENT '姓名',
    password_hash VARCHAR(255) NOT NULL                               COMMENT '密码哈希(bcrypt)',
    phone         VARCHAR(20)  DEFAULT NULL                           COMMENT '手机号',
    role          ENUM('user','admin') NOT NULL DEFAULT 'user'        COMMENT '角色: user-普通用户 admin-管理员',
    openid        VARCHAR(128) DEFAULT NULL                           COMMENT '微信 openid',
    avatar_url    VARCHAR(512) DEFAULT NULL                           COMMENT '头像 URL',
    is_active     TINYINT      NOT NULL DEFAULT 1                     COMMENT '是否启用: 1-启用 0-禁用',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP     COMMENT '创建时间',
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================================================
-- 2. equipment 器材表
-- ============================================================================
CREATE TABLE IF NOT EXISTS equipment (
    id         BIGINT       NOT NULL AUTO_INCREMENT                COMMENT '主键',
    code       VARCHAR(64)  NOT NULL                               COMMENT '器材编码',
    name       VARCHAR(128) NOT NULL                               COMMENT '器材名称',
    category   VARCHAR(64)  NOT NULL                               COMMENT '分类',
    icon       VARCHAR(16)  NOT NULL DEFAULT '📦'                  COMMENT '图标(emoji)',
    image_url  VARCHAR(512) DEFAULT NULL                           COMMENT '图片 URL',
    notes      TEXT         DEFAULT NULL                           COMMENT '备注',
    status     ENUM('available','borrowed','repair') NOT NULL DEFAULT 'available' COMMENT '状态: available-可用 borrowed-已借出 repair-维修中',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP     COMMENT '创建时间',
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='器材表';

-- ============================================================================
-- 3. cards 借用卡表
-- ============================================================================
CREATE TABLE IF NOT EXISTS cards (
    id         BIGINT       NOT NULL AUTO_INCREMENT                COMMENT '主键',
    code       VARCHAR(64)  NOT NULL                               COMMENT '卡片编码',
    name       VARCHAR(128) NOT NULL                               COMMENT '卡片名称',
    notes      VARCHAR(512) DEFAULT NULL                           COMMENT '备注',
    image_url  VARCHAR(512) DEFAULT NULL                           COMMENT '图片 URL',
    status     ENUM('available','borrowed') NOT NULL DEFAULT 'available' COMMENT '状态: available-可用 borrowed-已借出',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP     COMMENT '创建时间',
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='借用卡表';

-- ============================================================================
-- 4. borrow_requests 借用申请表
-- ============================================================================
CREATE TABLE IF NOT EXISTS borrow_requests (
    id               BIGINT      NOT NULL AUTO_INCREMENT             COMMENT '主键',
    work_order_no    VARCHAR(64) NOT NULL                            COMMENT '工单号',
    user_id          BIGINT      NOT NULL                            COMMENT '申请人 ID',
    equipment_id     BIGINT      NOT NULL                            COMMENT '器材 ID',
    card_id          BIGINT      DEFAULT NULL                        COMMENT '借用卡 ID',
    borrow_time      DATETIME    NOT NULL                            COMMENT '计划借用时间',
    return_time      DATETIME    NOT NULL                            COMMENT '计划归还时间',
    actual_return    DATETIME    DEFAULT NULL                        COMMENT '实际归还时间',
    reason           TEXT        NOT NULL                            COMMENT '借用事由',
    status           ENUM('pending','approved','borrowing','return_pending','returned','rejected','cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态: pending-待审批 approved-已批准 borrowing-借用中 return_pending-待归还 returned-已归还 rejected-已拒绝 cancelled-已取消',
    approver_id      BIGINT      DEFAULT NULL                        COMMENT '审批人 ID',
    admin_comment    VARCHAR(512) DEFAULT NULL                       COMMENT '管理员备注',
    return_photo_url VARCHAR(512) DEFAULT NULL                       COMMENT '归还照片 URL',
    created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    updated_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_work_order_no (work_order_no),
    KEY idx_user (user_id),
    KEY idx_equipment (equipment_id),
    KEY idx_card (card_id),
    KEY idx_status (status),
    KEY idx_borrow_time (borrow_time),
    CONSTRAINT fk_borrow_requests_user      FOREIGN KEY (user_id)      REFERENCES users (id)     ON DELETE RESTRICT,
    CONSTRAINT fk_borrow_requests_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE RESTRICT,
    CONSTRAINT fk_borrow_requests_card      FOREIGN KEY (card_id)      REFERENCES cards (id)     ON DELETE SET NULL,
    CONSTRAINT fk_borrow_requests_approver  FOREIGN KEY (approver_id)  REFERENCES users (id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='借用申请表';

-- ============================================================================
-- 5. operation_logs 操作日志表
-- ============================================================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id          BIGINT      NOT NULL AUTO_INCREMENT             COMMENT '主键',
    actor_id    BIGINT      NOT NULL                            COMMENT '操作人 ID',
    action      VARCHAR(30) NOT NULL                            COMMENT '操作类型',
    detail      TEXT        DEFAULT NULL                        COMMENT '操作详情',
    target_type VARCHAR(64) DEFAULT NULL                        COMMENT '操作目标类型',
    target_id   BIGINT      DEFAULT NULL                        COMMENT '操作目标 ID',
    ip_address  VARCHAR(45) DEFAULT NULL                        COMMENT 'IP 地址',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_actor (actor_id),
    KEY idx_action (action),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_operation_logs_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- ============================================================================
-- 6. refresh_tokens 刷新令牌表
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT      NOT NULL AUTO_INCREMENT             COMMENT '主键',
    user_id     BIGINT      NOT NULL                            COMMENT '用户 ID',
    token_hash  VARCHAR(255) NOT NULL                           COMMENT '令牌哈希',
    expires_at  DATETIME    NOT NULL                            COMMENT '过期时间',
    is_revoked  TINYINT     NOT NULL DEFAULT 0                  COMMENT '是否已撤销: 0-有效 1-已撤销',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_token_hash (token_hash),
    KEY idx_user (user_id),
    KEY idx_expires_at (expires_at),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刷新令牌表';

-- ============================================================================
-- 7. system_config 系统配置表
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    id    BIGINT       NOT NULL AUTO_INCREMENT                COMMENT '主键',
    `key` VARCHAR(128) NOT NULL                               COMMENT '配置键',
    value TEXT         NOT NULL                               COMMENT '配置值',
    `desc` VARCHAR(255) DEFAULT NULL                          COMMENT '配置说明',
    PRIMARY KEY (id),
    UNIQUE KEY uk_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- ============================================================================
-- 预置系统配置数据
-- ============================================================================
INSERT INTO system_config (`key`, value, `desc`) VALUES
    ('conflict_buffer_minutes', '30',  '借用时间冲突缓冲分钟数'),
    ('max_borrow_days',         '7',   '最大借用天数'),
    ('log_retention_days',      '180', '操作日志保留天数');

-- ============================================================================
-- 默认用户账户
-- 4 位管理员：范雨欣、黄禹博、陈玥杉、牛婉慈
-- 管理员密码：40thxmtzx（bcrypt 哈希）
-- 管理员用姓名作为 student_id 登录
-- 普通用户无需预设，首次登录时自动创建
-- ============================================================================
INSERT INTO users (student_id, name, password_hash, role, is_active) VALUES
    ('范雨欣', '范雨欣', '$2b$12$LmOxkg2yeVjcmnj1qFV1refPBRxXPIpEB5MoQ5/KnqZFPyNIN4AFe', 'admin', 1),
    ('黄禹博', '黄禹博', '$2b$12$LmOxkg2yeVjcmnj1qFV1refPBRxXPIpEB5MoQ5/KnqZFPyNIN4AFe', 'admin', 1),
    ('陈玥杉', '陈玥杉', '$2b$12$LmOxkg2yeVjcmnj1qFV1refPBRxXPIpEB5MoQ5/KnqZFPyNIN4AFe', 'admin', 1),
    ('牛婉慈', '牛婉慈', '$2b$12$LmOxkg2yeVjcmnj1qFV1refPBRxXPIpEB5MoQ5/KnqZFPyNIN4AFe', 'admin', 1);

-- ============================================================================
-- 种子设备数据（与原始 HTML 版本一致，共 16 台设备）
-- ============================================================================
INSERT INTO equipment (code, name, category, icon, notes, status) VALUES
    ('EQ001', '索尼A6400',                  '相机',     '📷', '配SELP18105G镜头、SD卡*1', 'available'),
    ('EQ002', '大疆如影SC-2',                '稳定器',   '🎯', '配快装板', 'available'),
    ('EQ003', '无线领夹麦克风01',            '麦克风',   '🎙️', '接收器发射器各一个，配盒子、线材、说明书', 'available'),
    ('EQ004', '无线领夹麦克风02',            '麦克风',   '🎙️', '接收器发射器各一个，配盒子、线材、说明书', 'available'),
    ('EQ005', '三脚架(大-01)',               '三脚架',   '📐', '配快装板', 'available'),
    ('EQ006', '三脚架(大-02)',               '三脚架',   '📐', '配快装板（损坏）', 'repair'),
    ('EQ007', '尼康D7000_1',                 '相机',     '📷', '配(有遮光罩)AF-S DX 尼克尔 18-105mm f/3.5-5.6G ED VR镜头', 'available'),
    ('EQ008', '尼康D7000_2',                 '相机',     '📷', '配(无遮光罩)AF-S DX 尼克尔 18-105mm f/3.5-5.6G ED VR镜头', 'available'),
    ('EQ009', '索尼FDR-AXP55',               '相机',     '🎥', 'SD卡*1', 'available'),
    ('EQ010', '斯威声BM-8无线麦克风',        '麦克风',   '🎙️', '发射器接收器各一(有一个发射器已损坏)，配盒子、线材、监听耳机', 'available'),
    ('EQ011', 'DJI Pocket3 01',              '相机',     '🎥', '三角架、无线麦克风+麦克风套、充电线', 'available'),
    ('EQ012', '斯丹德RGB-B320手持补光灯',    '灯具',     '💡', '', 'available'),
    ('EQ013', '反光板01',                    '灯具',     '🪞', '便携袋', 'available'),
    ('EQ014', 'DJI Pocket3 02',              '相机',     '🎥', '包', 'available'),
    ('EQ015', '三脚架（大）03',               '三脚架',   '📐', '配快装板', 'available'),
    ('EQ016', '索尼a6000',                   '相机',     '📷', '2025.1月遗失', 'repair');

-- ============================================================================
-- 种子内存卡数据（与原始 HTML 版本一致）
-- ============================================================================
INSERT INTO cards (code, name, status, notes) VALUES
    ('SD001', 'SD卡 32GB 金士顿', 'borrowed', '配EQ001'),
    ('SD002', 'SD卡 64GB 闪迪',   'available', ''),
    ('SD003', 'SD卡 32GB 三星',   'available', ''),
    ('SD004', 'MicroSD 64GB',     'available', '配Pocket3');
