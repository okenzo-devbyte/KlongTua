import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function downloadInBrowser(options: {
  fileName: string;
  contents: string;
  mimeType: string;
}): void {
  const blob = new Blob([options.contents], { type: options.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function shareFile(options: {
  fileName: string;
  contents: string;
  mimeType: string;
  title: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(options);
    return true;
  }

  await Filesystem.writeFile({
    path: options.fileName,
    data: options.contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const { uri } = await Filesystem.getUri({
    path: options.fileName,
    directory: Directory.Cache,
  });

  await Share.share({
    title: options.title,
    url: uri,
    dialogTitle: options.title,
  });

  return true;
}
