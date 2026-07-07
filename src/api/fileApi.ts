import apiClient from './axios';
import { USE_MOCK_DATA } from '../config';

const BASE_ORIGIN = 'http://172.20.10.2:8080';

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

  return `${BASE_ORIGIN}${data.url}`;
}
