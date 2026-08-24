# Protected Operations Status Design

## Purpose

Nirog needs limited operational visibility for the real PostgreSQL outbox and OCR lifecycle. This design is deliberately **not** a patient feature, a clinical workspace, or a substitute for a queue dashboard. It must show whether delivery work needs attention without exposing a patient, a document, extracted text, a medication candidate, a payload, or a credential.

## Existing authoritative source

Core already computes a protected aggregate snapshot from the PostgreSQL outbox, OCR job lifecycle, and in-app delivery inbox. The snapshot is an internal service boundary and returns only a generation time plus aggregate counts for claimable/dead-lettered delivery work, scheduled/dead-lettered OCR retries, and the age of the oldest unread in-app notification. It intentionally excludes patient records, identifiers, recipients, evidence, and notification payloads.

> The current Core snapshot is the source for operational state. Nirog must not install or imitate BullMQ/Bull Board because Core uses a PostgreSQL-backed outbox and dispatcher.

## Required authorization boundary

The current Core aggregate snapshot is protected with a server-only worker identity. It must never be proxied directly to the browser and its credential must not be placed in `nirog-web` runtime configuration. Before a web-visible operator view is implemented, Core must add a separate, auditable `operations.read` authorization decision for designated operators. That decision must be evaluated in Core from the authenticated user principal and must return only the aggregate model below.

| Layer | Responsibility | Prohibited capability |
| --- | --- | --- |
| Core | Authorize an operator and produce aggregate state from PostgreSQL | Returning patient, evidence, OCR, prescription, medication, or payload data |
| Nirog web server | Relay a Core-authorized aggregate response through the existing same-origin authenticated bridge | Holding or forwarding a worker identity |
| Browser operator view | Present health states and accessible remediation guidance | Calling internal services, viewing raw work items, or retrying jobs |

## Minimum public-to-operator model

The operator view may show only the following fields: snapshot generation time, outbox claimable count, outbox dead-lettered count, OCR retry-scheduled count, OCR dead-lettered count, and the age of the oldest unread in-app notification. It should translate nonzero dead-lettered counts into an operator prompt to use the protected operational runbook; it must not show a job list or enable a retry control.

## Delivery sequence

1. Core receives an authenticated operator request through the normal application path and evaluates the new `operations.read` permission.
2. Core returns the aggregate-only status model and writes an audit event for the access decision.
3. The web application renders a state-focused card with a generated-at time and aggregate counters.
4. Operators use established private infrastructure procedures for remediation; no browser action alters the outbox, OCR job, or clinical record.

## Acceptance criteria for implementation

| Area | Required evidence |
| --- | --- |
| Authorization | Tests reject ordinary patients and unauthenticated requests while allowing only designated operators. |
| Data minimization | Contract tests prove the response contains only aggregate fields and no identifiers, payloads, evidence metadata, or OCR/medication text. |
| Clinical safety | Tests prove the screen cannot create, update, confirm, retry, or delete clinical/OCR/outbox records. |
| Product integration | The web calls only the same-origin authenticated Core bridge and does not receive a worker secret. |
| Operations fidelity | Values come from the existing PostgreSQL outbox/OCR lifecycle queries; no BullMQ, Redis queue, mock counter, or fabricated status is introduced. |
