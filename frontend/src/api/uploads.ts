import { apiClient } from './client';
import axios from 'axios';

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await apiClient.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.imageUrl;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      throw new Error(err.response.data.message,{ cause: err });
    }
    throw new Error('Image upload failed',{ cause: err });
  }
} 

export async function deleteUploadedImage(imageUrl: string): Promise<void> {
  try {
    await apiClient.delete('/api/upload', { data: { imageUrl } });
  } catch (err) {
    console.error('Failed to delete uploaded image:', err);
    // non-critical — don't block the UI on cleanup failure
  }
}