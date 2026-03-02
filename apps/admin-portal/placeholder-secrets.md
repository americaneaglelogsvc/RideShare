# Admin Portal Placeholder Secrets

This repository currently does not contain explicit Supabase or FluidPay configuration usage in `apps/admin-portal`.

If/when Admin Portal begins to call authenticated backend APIs directly, define the following as build-time and/or runtime configuration (do not commit real values to git):

## API
- `VITE_API_BASE_URL` (build-time): `https://api.urwaydispatch.com`
- `NEXT_PUBLIC_API_BASE_URL` (build-time): `https://api.urwaydispatch.com`

## Supabase (if used by portal UI)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Payments (if portal UI ever integrates hosted payment flows)
- `NEXT_PUBLIC_FLUIDPAY_PUBLIC_KEY`

## Notes
- Production secrets should be stored in Google Secret Manager and injected into Cloud Run.
