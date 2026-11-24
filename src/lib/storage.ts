const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadImageToStorage(
  file: File,
  _folder?: 'avatars' | 'activities',
  _uid?: string
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > MAX_SIZE_BYTES) {
    throw new Error('Image must be smaller than 10 MB.');
  }

  const token = localStorage.getItem('plusone_token');
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to upload image');
    }

    const data = await res.json();
    return data.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Image upload failed (${msg}). You can try another file or select a curated editorial image.`);
  }
}
