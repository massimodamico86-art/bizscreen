# BizScreen Database Schema Documentation

## Overview

BizScreen is a multi-tenant TV content management application. This document describes the database schema and identifies which tables are core vs legacy.

## Core Tables (Active/Required)

### `profiles`
User profiles with RBAC roles.
- `id` (uuid, PK) - Links to auth.users
- `email` (text)
- `full_name` (text)
- `role` (text) - 'super_admin', 'admin', 'client'
- `managed_by` (uuid, FK) - For admin→client relationships
- `created_at`, `updated_at` (timestamps)

### `listings`
Business locations that display content on TVs.
- `id` (uuid, PK)
- `owner_id` (uuid, FK → profiles)
- `name`, `description`, `address`, `image`
- `active` (boolean)
- TV Settings: `tv_layout`, `carousel_images`, `background_image`, `background_video`, `background_music`
- Display Options: `show_welcome_message`, `welcome_greeting`, `welcome_message`
- `show_wifi`, `wifi_network`, `wifi_password`
- `show_weather`, `weather_city`, `weather_unit`
- `show_contact`, `contact_phone`, `contact_email`
- `show_qr_codes`
- `show_check_in_out`, `standard_check_in_time`, `standard_check_out_time`
- `show_hours_of_operation`, `hours_of_operation_from`, `hours_of_operation_to`
- `show_logo`, `logo`
- `website_url`, `tours_link`
- Legacy fields (hospitality): `bedrooms`, `bathrooms`, `guests`, `price`, `rating`, `reviews`

### `tv_devices`
Paired TV devices for each location.
- `id` (uuid, PK)
- `listing_id` (uuid, FK → listings)
- `name` (text) - e.g., "Living Room TV"
- `otp` (text) - 6-digit pairing code
- `is_paired` (boolean)
- `is_online` (boolean)
- `last_seen` (timestamp)

### `qr_codes`
QR codes displayed on TV screens.
- `id` (uuid, PK)
- `listing_id` (uuid, FK → listings)
- `name` (text)
- `type` (text) - 'wifi', 'url', 'guidebook', 'menu', etc.
- `details` (text) - URL or data URI for QR image
- `display_order` (integer)

### `activity_log`
Audit trail for user actions.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `action_type` (text) - 'create', 'update', 'delete', etc.
- `entity_type` (text) - 'listing', 'tv_device', 'qr_code', etc.
- `entity_id` (uuid)
- `details` (jsonb)
- `created_at` (timestamp)

### `user_settings`
Per-user preferences.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `setting_key` (text)
- `setting_value` (jsonb)

### `faqs`
Help content.
- `id` (uuid, PK)
- `category`, `question`, `answer` (text)
- `display_order` (integer)
- `is_published` (boolean)

## Legacy Tables (Hospitality-Specific)

These tables remain in the schema for data continuity but are not actively used in the BizScreen UI:

### `guests`
Guest check-in/check-out records (hospitality feature).
- `id`, `listing_id`, `first_name`, `last_name`, `email`
- `check_in`, `check_out` (dates)
- `language` (text)

### `pms_connections`
PMS (Property Management System) integrations.
- `id`, `listing_id`, `platform`, `api_key`, `property_id`
- Not used - hospitality feature removed.

### `tasks`
Property maintenance tasks.
- `id`, `listing_id`, `title`, `due_date`, `priority`, `status`

### `monetization_stats` / `experiences`
Revenue tracking (hospitality monetization feature).
- Not used in BizScreen.

## Row Level Security (RLS)

All tables have RLS enabled with policies based on user roles:
- **super_admin**: Full access to all data
- **admin**: Access to data from assigned clients (via `managed_by`)
- **client**: Access only to their own data

## Unified Media System

BizScreen uses a unified media state stored in `listings`:
- `carousel_images` (jsonb array) - Image URLs for rotation
- `background_image` (text) - Single background image URL
- `background_video` (text) - Video URL (takes precedence over images)

The frontend uses `useMediaPlayback` hook with configurable:
- Image rotation interval (3-300 seconds, default 10)
- Video playlist with looping

