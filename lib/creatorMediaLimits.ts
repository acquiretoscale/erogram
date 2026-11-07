/** Max stored file on R2 after optimization. */
export const MAX_CREATOR_PHOTO_BYTES = 1 * 1024 * 1024;
/** Raw upload cap (matches next.config serverActions.bodySizeLimit). Server compresses to WebP first. */
export const MAX_CREATOR_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_CREATOR_PHOTO_UPLOAD_MB = 10;
export const MAX_CREATOR_VIDEO_BYTES = 1 * 1024 * 1024;
export const MAX_CREATOR_PHOTO_MB = 1;
export const MAX_CREATOR_VIDEO_MB = 1;

export function humanUploadTooLarge(fileName: string, isVideo: boolean): string {
  const cap = isVideo ? MAX_CREATOR_VIDEO_MB : MAX_CREATOR_PHOTO_UPLOAD_MB;
  return `${fileName} is too large. Max ${cap} MB upload.`;
}

export function humanUploadError(raw: string, fileName?: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('body exceeded') || lower.includes('bodysizelimit') || lower.includes('1 mb limit')) {
    return fileName
      ? `${fileName} is too large. Max 1 MB. Compress it and try again.`
      : 'File is too large. Max 1 MB. Compress it and try again.';
  }
  if (lower.includes('photo too large')) {
    return fileName ? `${fileName} is too large. Max 1 MB. Compress it and try again.` : 'Photo too large. Max 1 MB.';
  }
  if (lower.includes('video too large')) {
    return fileName ? `${fileName} is too large. Max 1 MB. Compress or trim it and try again.` : 'Video too large. Max 1 MB.';
  }
  if (lower.includes('server components render') || lower.includes('digest')) {
    return 'Upload failed on the server. Try a JPG under 1 MB, or use the split-test uploader on /ofm while logged in as admin.';
  }
  return raw;
}
