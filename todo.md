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
