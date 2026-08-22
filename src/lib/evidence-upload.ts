const permittedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
export const maximumEvidenceBytes = 10_485_760;

export type UploadableEvidenceFile = { name: string; size: number; type: string };

export function validateEvidenceFile(file: UploadableEvidenceFile): string | undefined {
  if (!permittedContentTypes.has(file.type)) return 'Choose a JPEG, PNG, WebP, or PDF prescription file.';
  if (file.size < 1) return 'The selected file is empty. Choose a different prescription file.';
  if (file.size > maximumEvidenceBytes) return 'This file is larger than 10 MB. Choose a smaller prescription file.';
  return undefined;
}

export function formatEvidenceBytes(size: number): string {
  return `${(size / 1024 / 1024).toFixed(size >= 1024 * 1024 ? 1 : 2)} MB`;
}
