# ═══════════════════════════════════════════════════════════════
# RideShare Platform — Terraform Infrastructure
# GCP Project: rideoo-487904
# CANONICAL §1.2: Infrastructure as Code
# ═══════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "rideoo-terraform-state"
    prefix = "rideshare/production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ═══════════════ Variables ═══════════════

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "rideoo-487904"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
  default     = "staging"
}

variable "gateway_image" {
  description = "Container image for the gateway service"
  type        = string
  default     = "us-central1-docker.pkg.dev/rideoo-487904/rideshare/gateway:latest"
}

variable "min_instances" {
  description = "Minimum Cloud Run instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 10
}

# ═══════════════ Artifact Registry ═══════════════

resource "google_artifact_registry_repository" "rideshare" {
  location      = var.region
  repository_id = "rideshare"
  format        = "DOCKER"
  description   = "Container images for RideShare platform"
}

# ═══════════════ Cloud Run — Gateway ═══════════════

resource "google_cloud_run_v2_service" "gateway" {
  name     = "rideshare-gateway-${var.environment}"
  location = var.region

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.gateway_image

      ports {
        container_port = 3001
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "production" ? "production" : "staging"
      }

      env {
        name  = "PORT"
        value = "3001"
      }

      env {
        name = "SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SUPABASE_SERVICE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_key.secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3001
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 3001
        }
        period_seconds = 30
      }
    }

    service_account = google_service_account.gateway.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# ═══════════════ IAM — Gateway Service Account ═══════════════

resource "google_service_account" "gateway" {
  account_id   = "rideshare-gateway-${var.environment}"
  display_name = "RideShare Gateway (${var.environment})"
}

resource "google_project_iam_member" "gateway_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.gateway.email}"
}

resource "google_project_iam_member" "gateway_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gateway.email}"
}

# ═══════════════ Secrets ═══════════════

resource "google_secret_manager_secret" "supabase_url" {
  secret_id = "SUPABASE_URL"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "supabase_key" {
  secret_id = "SUPABASE_SERVICE_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "fluidpay_api_key" {
  secret_id = "FLUIDPAY_API_KEY"
  replication {
    auto {}
  }
}

# ═══════════════ Cloud Armor (WAF) ═══════════════

resource "google_compute_security_policy" "rideshare_waf" {
  name = "rideshare-waf-${var.environment}"

  rule {
    action   = "deny(429)"
    priority = 1000
    match {
      expr {
        expression = "true"
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
    description = "Rate limit: 100 req/min per IP"
  }

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }
}

# ═══════════════ Cloud Scheduler (Cron) ═══════════════

resource "google_cloud_scheduler_job" "compliance_expiry_scan" {
  name             = "compliance-expiry-scan-${var.environment}"
  schedule         = "0 8 * * *"
  time_zone        = "America/Chicago"
  attempt_deadline = "300s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.gateway.uri}/admin/compliance/expiry-scan"
    oidc_token {
      service_account_email = google_service_account.gateway.email
    }
  }
}

resource "google_cloud_scheduler_job" "scheduled_payouts" {
  name             = "scheduled-payouts-${var.environment}"
  schedule         = "0 17 * * *"
  time_zone        = "America/Chicago"
  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.gateway.uri}/admin/payouts/process-scheduled"
    oidc_token {
      service_account_email = google_service_account.gateway.email
    }
  }
}

# ═══════════════ Outputs ═══════════════

output "gateway_url" {
  value       = google_cloud_run_v2_service.gateway.uri
  description = "Cloud Run gateway service URL"
}

output "service_account_email" {
  value       = google_service_account.gateway.email
  description = "Gateway service account email"
}
