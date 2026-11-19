import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function downloadBlobInBrowser(fileName: string, blob: Blob): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareFile(options: {
  fileName: string;
  contents: string;
  mimeType: string;
  title: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([options.contents], { type: options.mimeType });
    downloadBlobInBrowser(options.fileName, blob);
    return true;
  }

  const exportPath = `exports/${options.fileName}`;
  try {
    await Filesystem.writeFile({
      path: exportPath,
      data: options.contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({
      path: exportPath,
      directory: Directory.Cache,
    });

    await Share.share({
      title: options.title,
      url: uri,
      dialogTitle: options.title,
    });
    return true;
  } catch {
    return false;
  } finally {
    // ทำความสะอาดไฟล์ชั่วคราวหลังแชร์
    setTimeout(() => {
      void Filesystem.deleteFile({ path: exportPath, directory: Directory.Cache }).catch(() => {});
    }, 30000);
  }
}

export async function shareBinaryFile(options: {
  fileName: string;
  base64Data: string;
  mimeType: string;
  title: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const binary = atob(options.base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: options.mimeType });
    downloadBlobInBrowser(options.fileName, blob);
    return true;
  }

  const exportPath = `exports/${options.fileName}`;
  try {
    await Filesystem.writeFile({
      path: exportPath,
      data: options.base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({
      path: exportPath,
      directory: Directory.Cache,
    });

    await Share.share({
      title: options.title,
      url: uri,
      dialogTitle: options.title,
    });
    return true;
  } catch {
    return false;
  } finally {
    setTimeout(() => {
      void Filesystem.deleteFile({ path: exportPath, directory: Directory.Cache }).catch(() => {});
    }, 30000);
  }
}
