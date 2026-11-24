import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/src/lib/firebase';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadImageToStorage(
  file: File,
  folder: 'avatars' | 'activities',
  uid: string
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > MAX_SIZE_BYTES) {
    throw new Error('Image must be smaller than 5 MB.');
  }

  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(storage, `${folder}/${uid}/${safeName}`);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 'storage/unauthorized' || code === 'storage/unknown') {
      throw new Error(
        'Image upload is unavailable until Firebase Storage is enabled and storage rules are published in Firebase Console. You can select a curated cover image below.'
      );
    }
    throw new Error(
      `Image upload failed (${msg}). You can try another file or select a curated editorial image below.`
    );
  }
}
