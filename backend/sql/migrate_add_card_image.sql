-- ============================================================================
-- 迁移脚本：为 cards 表添加 image_url 字段
-- 用于已有数据库升级，新数据库通过 init.sql 自动包含此字段
-- ============================================================================
SET NAMES utf8mb4;

USE equipment_db;

-- 添加 image_url 字段（如果不存在）
ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(512) DEFAULT NULL COMMENT '图片 URL'
    AFTER notes;
