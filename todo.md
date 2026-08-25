# Project TODO

- [x] Assess the existing nirog-web Core bridge, route structure, and available Core evidence/OCR contracts.
- [x] Add a Core-backed Prescription Evidence workspace to nirog-web for user-facing OCR status and mandatory review entry points.
- [x] Keep browser access same-origin and server-mediated; never expose Core worker credentials or Lab service credentials to the client.
- [x] Surface only Core-authoritative, provenance-marked, human-review-gated data in nirog-web.
- [x] Reclassify nirog-ocr-ml as private operational/research tooling rather than a primary product surface.
- [x] Add tests, run nirog-web lint/build verification, document the architecture change, and deploy the primary web experience.
- [x] Audit every primary patient-facing route, layout, and existing component for navigation, styling, responsiveness, and account-flow defects.
- [x] Define and implement one coherent visual system for typography, colors, spacing, surfaces, controls, focus states, and responsive breakpoints.
- [x] Rebuild the global header with clear product navigation, contextual active states, mobile navigation, accessible account controls, and a working logout action.
- [x] Rebuild the signed-in application shell so all main patient-facing pages have consistent navigation, page headers, loading states, and escape routes.
- [x] Restyle and integrate the dashboard, prescriptions, evidence/OCR workflow, and account-related screens without weakening Core authorization or review safeguards.
- [x] Add a provider-independent global error boundary so the production build can prerender safely.
- [x] Add focused tests for navigation policy and logout behavior, run lint/type/build validation, verify desktop and mobile renders, then deploy and synchronize the rebuilt frontend.
- [x] Reproduce and diagnose the signed-in prescription evidence upload failure, including control enablement, browser-to-Core authorization, upload URL handling, and completion feedback.
- [x] Rework the evidence upload interaction so a selected file has visible validation, progress, recoverable errors, and a clear post-upload review status without automatic clinical mutation.
- [x] Use supplied prescription images only as controlled evidence inputs necessary to verify the workflow, preserve mandatory human review, and document the operational status without exposing image content in logs or source.
- [x] Audit Core, dispatcher, and OCR Ops for Redis/BullMQ or alternative job-processing technology; add a protected status view only for the actual supported queue implementation.
- [x] Add regression tests, perform desktop/mobile live verification, publish the corrected workflow, and synchronize the final changes to GitHub main.
- [x] Correct the evidence review-status query so it follows the newest Core evidence item instead of a stale first list entry, without exposing OCR content or allowing clinical mutation.

- [ ] Identify the active signed-in account and reproduce profile creation and evidence-upload failures for rinattok21@gmail.com.
- [ ] Trace and repair account-specific profile creation and evidence upload behavior without weakening Core authorization or human review.
- [ ] Validate the clinician-facing workflow with safe synthetic or controlled evidence, including no automatic clinical mutation.
- [ ] Run regression, responsive, security, and deployment checks for the account-specific fixes.

- [x] Add a visible signed-in profile-creation entry point with validation, recoverable errors, and Core-authoritative persistence.
- [ ] Test profile creation independently before testing prescription creation and evidence upload for an account without existing profiles.

- [x] Read referenced task QZ4GEh42fXMBGpxqgLSXu9 and map its completed position to the current repositories.
- [ ] Continue the first unfinished requirement from the referenced task with tests and safety validation.
- [x] Expose reusable Core-authoritative profile creation directly in the no-profile prescription workspace, rather than leaving users blocked on empty selectors.
- [x] Bound native browser-push permission and subscription waits so clinicians receive a recoverable error instead of an indefinite setup state.
- [x] Add explicit no-profile evidence-workspace regression coverage and validate the onboarding handoff without relying on a pre-seeded test profile.
- [x] Define a protected operator-only status surface using real Core outbox and OCR Ops job lifecycle data, with no BullMQ/Bull Board substitution and no patient evidence content.
- [ ] Implement the protected aggregate-only operator-status web bridge and presentation with regression, responsive, authorization, and deployment validation; the verified Git preview is ready, but the custom production domain remains on the prior release and Vercel requires an authenticated browser session to promote the new revision.
- [ ] Promote the verified operator-status revision to the custom production domain using the connected Vercel integration only; do not rely on the sandbox browser session.
- [x] Add an isolated no-profile workspace regression that proves inline Core-authoritative profile onboarding appears before any prescription or evidence action is enabled.
- [x] Review the existing Core and OCR Ops lifecycle contracts for a future operator-only status design that exposes identifiers and states only, never evidence or OCR text.
- [x] Add Core-owned `operations.read` authorization and an aggregate-only operator-status contract before creating any browser-visible operations view.
- [x] Add an authorization-preserving same-origin web bridge for the Core aggregate-only status contract; do not introduce a worker secret, direct browser-to-Core call, or any mutation path.
- [x] Add an operator-only status presentation that handles Core authorization denial safely and renders only aggregate operational counts and generation time.
- [x] Add regression tests proving the web bridge forwards caller identity, rejects unavailable/forbidden responses safely, and cannot expose patient, evidence, OCR, medication, payload, or job-identifier data.
- [x] Diagnose the deployed sandbox test session’s evidence-workspace refresh stall without creating, modifying, or inspecting patient evidence; the same-origin account bridge returns successfully and a read-only refresh reaches the authorized ready state without client-console errors.
