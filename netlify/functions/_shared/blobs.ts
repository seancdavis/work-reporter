import { getStore } from "@netlify/blobs";

const STORE_NAME = "kudos-screenshots";

export async function uploadScreenshot(
  file: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  const store = getStore(STORE_NAME);
  const key = `${Date.now()}-${filename}`;

  await store.set(key, file, {
    metadata: {
      contentType,
      originalFilename: filename,
      uploadedAt: new Date().toISOString(),
    },
  });

  return key;
}

export async function getScreenshot(
  key: string
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const store = getStore(STORE_NAME);

  try {
    const { data, metadata } = await store.getWithMetadata(key, {
      type: "arrayBuffer",
    });

    if (!data) return null;

    return {
      data,
      contentType: (metadata as { contentType?: string })?.contentType || "image/png",
    };
  } catch (error) {
    console.error("Error fetching screenshot:", error);
    return null;
  }
}

export async function deleteScreenshot(key: string): Promise<void> {
  const store = getStore(STORE_NAME);
  await store.delete(key);
}
