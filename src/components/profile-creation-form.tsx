'use client';

import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { coreMessage, readCore } from '@/lib/core-read-model';
import { prepareProfileCreation } from '@/lib/profile-creation';

export function ProfileCreationForm({
  defaultTimezone,
  onCreated,
}: {
  defaultTimezone: string;
  onCreated: () => void;
}) {
  const [preferredName, setPreferredName] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function createProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const prepared = prepareProfileCreation(preferredName, timezone);
    if (!prepared.ok) {
      setProblem(prepared.message);
      return;
    }

    setSubmitting(true);
    setProblem(null);
    try {
      await readCore<{ id: string }>('profiles', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `profile-create-${crypto.randomUUID()}`,
        },
        body: JSON.stringify(prepared.payload),
      });
      onCreated();
    } catch (error) {
      setProblem(coreMessage(error, 'The profile could not be created. No care record was changed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="profile-onboarding" onSubmit={(event) => void createProfile(event)}>
      <label>
        Profile name
        <input
          aria-label="Profile name"
          disabled={submitting}
          maxLength={160}
          onChange={(event) => setPreferredName(event.target.value)}
          required
          value={preferredName}
        />
      </label>
      <label>
        Timezone
        <input
          aria-label="Timezone"
          disabled={submitting}
          maxLength={64}
          onChange={(event) => setTimezone(event.target.value)}
          required
          value={timezone}
        />
      </label>
      {problem && <p className="form-problem" role="alert">{problem}</p>}
      <button className="button button-primary" disabled={submitting} type="submit">
        {submitting ? <><LoaderCircle className="spin" size={16} /> Creating profile…</> : 'Create profile'}
      </button>
    </form>
  );
}
