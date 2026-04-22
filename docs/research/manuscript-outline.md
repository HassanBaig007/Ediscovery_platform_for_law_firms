# Manuscript Outline (Systems/Engineering)

## Working Title Options
1. Auditable Workflow Integrity for Legal eDiscovery: Design and Evaluation of a Full-Stack Case Platform
2. Chain-of-Custody Aware eDiscovery Operations: A Practical Systems Architecture and Reproducibility Study
3. From Ingestion to Production: A Policy-Enforced eDiscovery Workflow System

## 1. Abstract (Template)
- Problem: legal review workflows need traceability and policy-safe production.
- Method: full-stack system with dedup, coding, audit logging, and production state machine.
- Results: summarize E1-E5 metrics from `evaluation-protocol.md`.
- Contribution: reproducible systems artifact and documented enforcement guarantees/limitations.

## 2. Introduction
- eDiscovery operational pain points (volume, privilege risk, audit defensibility).
- Why systems contribution is meaningful even without ML novelty.
- Explicit scope and non-goals for this paper.

## 3. System Design
- Architecture and module boundaries.
- Auth and governance model.
- Ingestion and dedup pipeline.
- Review queue and coding lifecycle.
- Production state machine and Bates handling.
- Audit trail architecture.

## 4. Implementation
- Backend stack and key route/controller contracts.
- Frontend workflow integration points.
- Script-based reproducibility harness.

## 5. Evaluation Setup
- Synthetic data generation and seed strategy.
- Experiment matrix E1-E5.
- Metrics and measurement tooling.

## 6. Results
- Integrity and policy enforcement outcomes.
- Workflow completion and endpoint stability.
- Contract consistency checks (docs vs runtime).

## 7. Discussion
- Practical implications for legal ops teams.
- Where the current architecture scales well.
- Known risks and operational caveats.

## 8. Threats to Validity
- Synthetic dataset limitation.
- Partial RBAC enforcement coverage.
- Proxy metrics in analytics.

## 9. Related Work (Positioning)
- Commercial eDiscovery systems and workflow governance literature.
- Workflow auditability and state-machine enforcement patterns.

## 10. Conclusion and Future Work
- Immediate hardening priorities (RBAC unification, stricter contract testing).
- Follow-on ML/HCI studies after systems baseline publication.

## Required Figures/Tables
- Figure 1: System architecture diagram.
- Figure 2: Document lifecycle state flow.
- Table 1: Claim-to-evidence matrix (from `evidence-matrix.md`).
- Table 2: Experiment results summary (E1-E5).
- Table 3: Truth table deltas and mitigations.
