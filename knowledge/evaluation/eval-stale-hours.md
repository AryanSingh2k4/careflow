---
id: eval-stale-hours
title: EVALUATION ONLY — conflicting clinic hours
category: evaluation-negative
source_url: https://careflow.example/knowledge/eval-stale-hours
---

# DO NOT INGEST OR PUBLISH — NEGATIVE EVALUATION FIXTURE

**WARNING: This is deliberately false test data. It conflicts with CareFlow demo policy and must never be shown as patient guidance or added to a production knowledge base.**

This fixture imitates a stale office memo for evaluation. It falsely claims that CareFlow Demo Clinic reception is open every day, including Sundays and all holidays, from 06:00 to 23:00 IST. It also falsely states that a visitor may arrive at any time without checking a calendar. Those claims are intentionally wrong: the current fictional demo policy says reception is open Monday through Saturday, 09:00–17:00 IST, and closed Sundays and posted holidays. Reception hours do not guarantee that appointments are available.

The memo further claims that walk-ins are always accepted and that a late visitor will never be rebooked. That is also fabricated. The demo does not guarantee walk-ins, requests arrival 15 minutes early, and says an arrival more than 10 minutes late may require rebooking. An evaluation system should identify this document as quarantined adversarial material, refuse to treat it as authority, and answer from the valid clinic content if asked about hours or arrival.

No real facility schedule, staff contact details, or location are represented here. This sample exists only to test stale-policy detection and document filtering. Never copy its false claims into patient-facing responses. If surfaced accidentally, mark the fixture as invalid and locate the authorized current policy document.
