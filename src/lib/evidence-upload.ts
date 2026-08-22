const permittedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
export const maximumEvidenceBytes = 10_485_760;

export type UploadableEvidenceFile = { name: string; size: number; type: string };
export type EvidenceTimelineItem = { id: string; uploadAuthorizedAt?: string; uploadedAt?: string; processedAt?: string };

export function validateEvidenceFile(file: UploadableEvidenceFile): string | undefined {
  if (!permittedContentTypes.has(file.type)) return 'Choose a JPEG, PNG, WebP, or PDF prescription file.';
  if (file.size < 1) return 'The selected file is empty. Choose a different prescription file.';
  if (file.size > maximumEvidenceBytes) return 'This file is larger than 10 MB. Choose a smaller prescription file.';
  return undefined;
}

export function formatEvidenceBytes(size: number): string {
  return `${(size / 1024 / 1024).toFixed(size >= 1024 * 1024 ? 1 : 2)} MB`;
}

function evidenceTimestamp(item: EvidenceTimelineItem): number {
  const value = item.uploadAuthorizedAt ?? item.uploadedAt ?? item.processedAt;
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function newestEvidenceId(items: readonly EvidenceTimelineItem[]): string | undefined {
  return items.reduce<EvidenceTimelineItem | undefined>((latest, item) => {
    if (!latest || evidenceTimestamp(item) >= evidenceTimestamp(latest)) return item;
    return latest;
  }, undefined)?.id;
}
