import type { MultipartFile } from '../api/phoneBotApi';

type ImageAssetLike = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: Blob & { name?: string; type?: string };
};

type BlobResponseLike = {
  blob(): Promise<Blob>;
};

type FetchBlobLike = (uri: string) => Promise<BlobResponseLike>;

export async function imageAssetToMultipartFile(
  asset: ImageAssetLike,
  fallbackIndex: number,
  fetcher: FetchBlobLike = (uri) => fetch(uri),
): Promise<MultipartFile> {
  const name = asset.fileName ?? asset.file?.name ?? `image-${fallbackIndex}`;
  const mimeType = asset.mimeType ?? asset.file?.type ?? 'image/jpeg';

  if (asset.file) {
    return { name, mimeType, source: asset.file };
  }

  if (isWebRuntime() && (asset.uri.startsWith('blob:') || asset.uri.startsWith('data:'))) {
    const blob = await (await fetcher(asset.uri)).blob();
    return { name, mimeType: blob.type || mimeType, source: blob };
  }

  return { name, mimeType, source: { uri: asset.uri } };
}

function isWebRuntime(): boolean {
  return typeof window !== 'undefined';
}
