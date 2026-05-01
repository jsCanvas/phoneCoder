import { imageAssetToMultipartFile } from '../src/screens/chatAttachments';

describe('imageAssetToMultipartFile', () => {
  it('uses the web File object when Expo ImagePicker provides one', async () => {
    const file = {
      name: 'picked.png',
      type: 'image/png',
    } as Blob & { name: string; type: string };

    const result = await imageAssetToMultipartFile({
      uri: 'http://localhost/static-preview-url',
      file,
    }, 1);

    expect(result).toEqual({
      name: 'picked.png',
      mimeType: 'image/png',
      source: file,
    });
  });

  it('falls back to native uri descriptors outside web file uploads', async () => {
    const result = await imageAssetToMultipartFile({
      uri: 'file:///tmp/photo.jpg',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
    }, 2);

    expect(result).toEqual({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      source: { uri: 'file:///tmp/photo.jpg' },
    });
  });
});
