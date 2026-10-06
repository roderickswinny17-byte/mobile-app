## Table `subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `plan` | `text` |  |
| `billing_cycle` | `text` |  |
| `status` | `text` |  |
| `stripe_customer_id` | `text` |  Nullable |
| `stripe_subscription_id` | `text` |  Nullable |
| `card_brand` | `text` |  Nullable |
| `card_last4` | `text` |  Nullable |
| `current_period_end` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `email` | `text` |  |
| `created_at` | `timestamptz` |  |
| `phone_number` | `text` |  Nullable |
| `home_currency` | `text` |  |
| `home_currency_auto` | `bool` |  |
| `security_question` | `text` |  Nullable |
| `security_answer_hash` | `text` |  Nullable |
| `reset_failed_attempts` | `int4` |  |
| `reset_locked_until` | `timestamptz` |  Nullable |
| `avatar_url` | `text` |  Nullable |

## Table `tracked_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `service_name` | `text` |  |
| `monthly_cost` | `numeric` |  |
| `billing_cycle` | `text` |  |
| `next_renewal_date` | `date` |  Nullable |
| `category` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `currency` | `text` |  |
| `icon_key` | `text` |  Nullable |
| `hex` | `text` |  |
| `billing_url` | `text` |  Nullable |
| `last_viewed_at` | `timestamptz` |  Nullable |
| `autopay_enabled` | `bool` |  |

## Table `oauth_states`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `state` | `text` | Primary |
| `user_id` | `uuid` |  |
| `provider` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `email_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `provider` | `text` |  |
| `email` | `text` |  Nullable |
| `access_token` | `text` |  |
| `refresh_token` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `connected_at` | `timestamptz` |  |
| `last_synced_at` | `timestamptz` |  Nullable |

## Table `detected_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `service_name` | `text` |  |
| `icon_key` | `text` |  Nullable |
| `guessed_amount` | `numeric` |  Nullable |
| `guessed_currency` | `text` |  |
| `source_snippet` | `text` |  Nullable |
| `gmail_message_id` | `text` |  |
| `status` | `text` |  |
| `detected_at` | `timestamptz` |  |
| `guessed_billing_cycle` | `text` |  |
| `guessed_next_renewal_date` | `date` |  Nullable |
| `evidence_tier` | `int2` |  |

## RLS Policies

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can view their own profile` | SELECT | public | PERMISSIVE | `(auth.uid() = id)` | — |
| `Users can update their own profile` | UPDATE | public | PERMISSIVE | `(auth.uid() = id)` | `(auth.uid() = id)` |

### `subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can view their own subscriptions` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `tracked_subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own tracked subscriptions` | ALL | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `detected_subscriptions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users manage their own detected subscriptions` | ALL | public | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

