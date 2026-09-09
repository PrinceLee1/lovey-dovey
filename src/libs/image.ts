/**
 * Downscales and re-encodes an image file as JPEG before upload.
 *
 * Phone camera photos are routinely 5-15MB (and on iPhone, often HEIC —
 * a format Laravel's `image` validation rule doesn't recognize), which
 * blows past small server upload limits and slow-connection timeouts.
 * Drawing to a canvas sidesteps both: the browser decodes whatever format
 * it natively supports (Safari can decode HEIC into an <img>/canvas even
 * though it can't be validated as one server-side) and canvas.toBlob always
 * re-encodes to the requested output format.
 */
export function resizeImageToJpeg(file: File, maxDim = 1280, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Image encoding failed')); return; }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image'));
    };

    img.src = objectUrl;
  });
}
