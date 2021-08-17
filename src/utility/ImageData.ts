export function clone(other: ImageData): ImageData {
  const img = new ImageData(other.width, other.height);
  img.data.set(other.data);
  return img;
}
