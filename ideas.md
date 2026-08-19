# Nirog Web Companion — Design Direction

## Three explored directions

### 1. Clinical Ledger

**Very Brief Intro:** A calm, editorial workspace that treats medication care as a trustworthy personal record. It uses a persistent care rail and compact evidence-like cards rather than a centered marketing dashboard.

**Probability:** 0.07

### 2. Sunlit Apothecary

**Very Brief Intro:** A warm domestic-care interface inspired by daylight, handwritten medicine labels, and home routines. It would emphasize encouragement and family sharing.

**Probability:** 0.03

### 3. Signal Night

**Very Brief Intro:** A dark operational console for caregivers managing multiple profiles and medication signals. It would prioritize dense alert scanning and shift-style handover.

**Probability:** 0.05

---

## Chosen direction: Clinical Ledger

### Design Movement

**Editorial clinical utility.** The interface borrows the calm hierarchy of a modern clinical chart and the warmth of a carefully kept personal ledger, avoiding an app-store landing-page feel.

### Core Principles

1. **Care is chronological.** The primary dashboard is organized around a vertical care rail, current context, and next actions rather than uniform card grids.
2. **Identity is scoped.** The current profile is always visible, and delegation/access state is treated as a first-class piece of care context.
3. **Meaning before density.** Medication and adherence summaries use restrained hierarchy and evidence labels; no decorative data visualizations compete with a care action.
4. **Phone-complementary, not phone-cloned.** Desktop uses a persistent navigation rail and contextual side panel; mobile condenses those into a bottom context strip and single-column story.

### Color Philosophy

The background is soft mineral white, chosen to reduce glare and resemble a durable medical record rather than a dashboard canvas. Deep navy anchors clinical trust. **Nirog Care Teal** (`#0F766E`) is the ownable signature color for safe positive action and verified states. A restrained amber identifies attention-required workflow without presenting every item as an emergency.

### Layout Paradigm

The desktop shell is an asymmetric three-field composition: a slim identity/navigation rail; an expansive chronological care workspace; and a narrow contextual profile panel. The mobile layout keeps the chronology but collapses peripheral context into a compact profile switcher and contextual drawer.

### Signature Elements

1. **Care rail:** a fine vertical line with time markers, dose/event capsules, and concise action state.
2. **Ledger tabs:** underlined, record-like section markers with explicit profile scope.
3. **Evidence chips:** small, bordered status labels for verified identity, medication source, and access scope.

### Interaction Philosophy

Important actions are explicit and reversible where possible. A profile change uses a clear context confirmation; protected API actions show meaningful state rather than silently failing. Navigation is predictable, keyboard-capable, and quick.

### Animation

Animations use a 160–220 ms custom ease-out and only transform/opacity. The care rail introduces sequentially by 50 ms, action drawers move from their contextual edge, and mutation feedback is immediate. All non-essential movement respects `prefers-reduced-motion`.

### Typography System

**Manrope** provides the human, high-legibility interface voice. **IBM Plex Mono** is reserved for compact ledger labels, IDs, timestamps, and evidence chips. Headlines use Manrope at tight but readable tracking; body text uses an open line height; clinical metadata is small, monospaced, and uppercased only when it improves scanning.

### Brand Essence

**Nirog is a trustworthy care ledger for people and families who need medication routines to remain clear, shared, and human.**

Personality: **considered, steady, precise**.

### Brand Voice

Headlines are direct and contextual; calls to action name the care action rather than the UI mechanism. Microcopy is candid about evidence and access.

Examples: “Your care day, in one clear record.”  
“Review access before you share a profile.”

### Wordmark and Logo

The mark is a two-stroke rounded ledger seal: an offset vertical spine and a resting dose capsule, suggesting a protected record and a medication moment. The header pairs the mark with a custom-spaced Nirog wordmark rather than a default font treatment.

### Signature Brand Color

**Nirog Care Teal — `#0F766E`**.
