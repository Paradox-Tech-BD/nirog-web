const allowedPath = [
  /^profiles$/,
  /^profiles\/[0-9a-f-]{36}\/prescriptions$/,
  /^profiles\/[0-9a-f-]{36}\/prescriptions\/[0-9a-f-]{36}\/evidence$/,
  /^profiles\/[0-9a-f-]{36}\/prescriptions\/[0-9a-f-]{36}\/evidence\/uploads$/,
  /^profiles\/[0-9a-f-]{36}\/prescriptions\/[0-9a-f-]{36}\/evidence\/[0-9a-f-]{36}\/complete$/,
  /^profiles\/[0-9a-f-]{36}\/evidence\/[0-9a-f-]{36}\/ocr-extractions$/,
  /^profiles\/[0-9a-f-]{36}\/evidence\/[0-9a-f-]{36}\/ocr-jobs\/[0-9a-f-]{36}\/lab-correlation$/,
  /^profiles\/[0-9a-f-]{36}\/evidence\/[0-9a-f-]{36}\/ocr-jobs\/[0-9a-f-]{36}\/lab-receipt-audit$/,
];

export function isAllowedCoreEvidencePath(path: string): boolean {
  return allowedPath.some((pattern) => pattern.test(path));
}
