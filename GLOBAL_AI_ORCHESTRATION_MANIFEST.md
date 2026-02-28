# GLOBAL AI ORCHESTRATION MANIFEST (GAIOM)
## Project: UrwayDispatch.com (Internal: Rideoo)
## Environment: Windows PowerShell + Google Cloud SDK

### 1. PROJECT STATUS: [READY FOR VERTEX SWARM]
- **Infrastructure**: GCS Bucket `urway-dispatch-brain` mounted via GCS Fuse.
- **EBT Flow**: Completed (9 Sectors Scanned). Audit Report generated.
- **Isolation**: Verified. Independent of AEL-Stage.

### 2. REPEATABLE DEPLOYMENT PATTERN (For Future Projects)
- **Step A**: Clone Agnostic Blueprints to new folder.
- **Step B**: Initialize `aggregator.py` before `ebt.ps1`.
- **Step C**: Set `gcloud config set project [ID]` explicitly.

### 3. ERROR LOG (Resolved)
- *Error*: `aggregator.py not found` -> *Fix*: Scripted creation of aggregator.py into the prep-block.
- *Error*: `EBT Project Mismatch` -> *Fix*: Hardcoded Project Name variable in EBT initialization.

### 7. POWERSHELL SYNTAX NOTES
- [ ] **Rsync Filtering:** When using gsutil rsync -x, avoid complex pipe strings in PowerShell without explicit quoting.
- [ ] **Verified Filter:** Use "node_modules|git" as the standard exclusion pattern for SaaS project clones.
### 8. REFINED POWERSHELL ESCAPING
- [X] **Issue:** gsutil -x "a|b" causes PS to try and execute .
- [X] **Resolution:** Use SINGLE QUOTES 'node_modules|git' to encapsulate the regex pattern, preventing shell execution.
### 9. THE STOP-PARSING PROTOCOL
- [X] **Issue:** Even single quotes failed to stop PS from seeing the pipe symbol in gsutil -x.
- [X] **Resolution:** Use the --% (stop-parsing) operator. This is the only 100% reliable way to pass regex pipes to external tools in PowerShell.
### 10. GIT-CLOUD-AI SYNC STATUS [VERIFIED]
- [X] **Cloud State:** gs://urway-dispatch-brain/source/ matches local UrwayDispatch root.
- [X] **Hygiene:** 0 node_modules detected in cloud.
- [X] **Sync Logic:** Standardized on gsutil -m rsync -r -x.
### 12. UPLOAD STRATEGY: INCLUDE VS EXCLUDE
- [X] **Lesson:** When local 'node_modules' exceed 8k files, exclusion patterns (-x) in PowerShell are prone to shell-parsing errors.
- [X] **Strategy:** Shifted to 'Explicit Include' (uploading specific core folders). This reduced file count from 8,200+ to <500.
- [X] **Recovery:** Closing the terminal successfully kills runaway uploads.
### 13. SANITY CHECK & DATA STORE LINKING
- [X] **Verification:** Confirmed 125 files in gs://urway-dispatch-brain/source/. 
- [X] **Hygiene:** 8.2k 'node_modules' successfully blocked.
- [X] **Activation:** Data Store linked to Discovery Engine for Swarm Awareness.
### 22. FIRST PRODUCTION SYNC
- [X] **Commit:** Local files indexed and committed.
- [X] **Remote:** Pushed to americaneaglelogsvc/RideShare.
- [!] **Deployment:** Awaiting Cloud Build completion.
### 24. BRANCH REALIGNMENT
- [X] **Local:** Renamed 'master' to 'main' for GitHub compatibility.
- [ ] **Remote:** Pushing DNA to americaneaglelogsvc/RideShare (main).
- [ ] **Trigger:** Re-testing rideshare-prod-deploy.
### 25. REPO & TRIGGER SYNCHRONIZED
- [X] **Branch:** Local and Remote locked to 'main'.
- [X] **File:** cloudbuild.yaml confirmed in repository.
- [ ] **Build:** Awaiting first successful automated deployment.
### 33. FULL SYSTEM SYNCHRONIZATION COMPLETE
- [X] **Data Store:** gs://rideoo-agentic-brain/source/ fully populated.
- [X] **Pipeline:** Manual and Triggered builds verified (STATUS: SUCCESS).
- [X] **Codebase:** apps, services, infra, and requirements all synced.
- [!] **DNS:** A-Record set to 136.110.182.120 (Awaiting SSL Propagation).
