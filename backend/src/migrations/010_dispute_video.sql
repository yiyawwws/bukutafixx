-- Migration: 010_dispute_video.sql
-- Description: Add unboxing_video_url column to the disputes table.
-- This is a safe additive migration — no columns are dropped, renamed, or modified.

ALTER TABLE disputes
  ADD COLUMN unboxing_video_url VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'Cloudinary URL of the unboxing video uploaded by the buyer'
  AFTER evidence_photos;

SELECT 'Migration 010_dispute_video selesai ✓' AS result;
