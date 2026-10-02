const gameCardImages = import.meta.glob('../assets/images/games/*.jpg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const imagesByFileName = new Map<string, string>();

for (const [path, url] of Object.entries(gameCardImages)) {
  const fileName = path.split('/').at(-1);

  if (fileName) {
    imagesByFileName.set(fileName, url);
  }
}

export function resolveGameImage(cardImage: string): string | undefined {
  const fileName = cardImage.split('/').at(-1);

  if (!fileName) {
    return undefined;
  }

  return imagesByFileName.get(fileName);
}
