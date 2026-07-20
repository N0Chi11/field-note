-- ============================================================================
-- Equipment Management System - MySQL 初始化脚本
-- 数据库: equipment_db
-- 字符集: utf8mb4
-- ============================================================================

CREATE DATABASE IF NOT EXISTS equipment_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

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
-- 密码均为 admin123（bcrypt 哈希），首次登录后请修改密码
-- ============================================================================
INSERT INTO users (student_id, name, password_hash, role, is_active) VALUES
    ('admin',     '系统管理员', '$2b$12$gaXSLx.qftvCWxg86A.fLuE.Z3ijta96/mDVyx/AuMS7gPelkiBk.', 'admin', 1),
    ('2024001',   '范雨欣',     '$2b$12$gaXSLx.qftvCWxg86A.fLuE.Z3ijta96/mDVyx/AuMS7gPelkiBk.', 'admin', 1),
    ('2024010',   '张伟',       '$2b$12$gaXSLx.qftvCWxg86A.fLuE.Z3ijta96/mDVyx/AuMS7gPelkiBk.', 'user',  1),
    ('2024020',   '李娜',       '$2b$12$gaXSLx.qftvCWxg86A.fLuE.Z3ijta96/mDVyx/AuMS7gPelkiBk.', 'user',  1);

-- ============================================================================
-- 种子设备数据
-- ============================================================================
INSERT INTO equipment (code, name, category, icon, notes, status) VALUES
    ('EQ001', '佳能 EOS R6 Mark II', '相机',     '📷', '含电池×2、充电器、肩带。借用时请检查机身完好。', 'available'),
    ('EQ002', '索尼 A7 IV',           '相机',     '📷', '全画幅微单，含28-70mm镜头。', 'available'),
    ('EQ003', '大疆 RS3 云台',         '稳定器',   '🎬', '承重3kg，适合微单。含电池、三脚架连接器。', 'available'),
    ('EQ004', '罗德 NTG3 麦克风',     '录音设备', '🎙️', '超心型指向，含防风毛套、XLR线。', 'available'),
    ('EQ005', '阿帕 200D 灯光套装',    '灯光',     '💡', '双灯+柔光箱+灯架。拍摄人像必备。', 'available'),
    ('EQ006', '曼富图三脚架',          '三脚架',   '🔭', '碳纤维材质，承重8kg。', 'repair'),
    ('EQ007', 'GoPro Hero 12',        '相机',     '📷', '运动相机，含防水壳、各种固定座。', 'available');

-- ============================================================================
-- 种子内存卡数据
-- ============================================================================
INSERT INTO cards (code, name, status, notes) VALUES
    ('SD001', 'SD卡 32GB 金士顿', 'available', '配EQ001'),
    ('SD002', 'SD卡 64GB 闪迪',   'available', '配EQ002'),
    ('SD003', 'MicroSD 128GB',    'available', '配GoPro'),
    ('SD004', 'SD卡 128GB 索尼',  'available', '高速卡，适合4K录制');
