import apiClient from './axios';
import { USE_MOCK_DATA } from '../config';
import { getImageUrl } from '../utils/imageUrl';

export async function uploadImage(localUri: string): Promise<string> {
  if (USE_MOCK_DATA) return localUri;

  const filename = localUri.split('/').pop() ?? 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type } as any);

  const { data } = await apiClient.post<{ url: string }>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  // data.url may be a relative path ("/uploads/xyz.jpg") or already
  // absolute — getImageUrl resolves it against the actual configured API
  // origin instead of a hardcoded host, so it never points at a dead
  // local-dev IP regardless of which backend the app is pointed at.
  return getImageUrl(data.url) ?? data.url;
}
