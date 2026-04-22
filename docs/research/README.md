# Research Artifact Pack

This folder contains paper-oriented artifacts generated from the current eDiscovery platform implementation.

## Scope
- Paper type: systems/engineering first
- Data scope: synthetic/mock only
- Focus: auditable workflow integrity, policy enforcement, and reproducibility

## Artifact Index
- `evidence-matrix.md`: claim-to-code and claim-to-verification mapping
- `architecture-truth-table.md`: documented vs implemented vs observed behavior
- `evaluation-protocol.md`: reproducible synthetic evaluation design
- `manuscript-outline.md`: section-level writing blueprint
- `venue-shortlist.md`: submission targets by fit

## Quick Reproducibility Workflow
1. Compile backend:
   - `cd server`
   - `npm run build`
2. Seed canonical credentials and dataset:
   - `npx ts-node src/seed.ts`
3. Run verification scripts:
   - `node scripts/verify_phase4_js.js > verify_phase4_latest.txt 2>&1`
   - `npx ts-node scripts/verify_phase5.ts > verify_phase5_latest.txt 2>&1`
   - `npx ts-node scripts/verify_phase6.ts > verify_phase6_latest.txt 2>&1`
4. Compile frontend:
   - `cd ../client`
   - `npm run build`

## Notes
- Scripts now use seeded partner credentials by default:
  - email: `partner@techcorp-case.com`
  - password: `Password123!`
- Override via environment variables if needed:
  - `VERIFY_PARTNER_EMAIL`
  - `VERIFY_PARTNER_PASSWORD`
