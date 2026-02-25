# Masked Communications and Messaging Retention (FOUNDATION)
req_id: MSG-RET-0001

## Purpose
Defines baseline masking and retention expectations for rider↔driver messaging.

## Principles
- Riders and drivers must not see each other’s phone or email addresses.
- In-app messaging is required; optional voice is feature-gated.
- Messages have a default retention of 180 days, configurable per tenant within platform caps (e.g., 30–365 days).

## Evidence gates (FOUNDATION)
To consider messaging retention requirements In Progress/Implemented at this layer, evidence must include:
- A documented masking policy for identities (this file).
- A machine-readable retention policy (see `messaging_retention_policy.json`).
- Validation that the JSON artifact parses and contains default/min/max retention days.
