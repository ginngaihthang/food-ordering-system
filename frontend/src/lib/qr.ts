export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  size = 1024,
  padding = 64
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));

  const svgData = new XMLSerializer().serializeToString(clone);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not render the QR code'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size + padding * 2;
  canvas.height = size + padding * 2;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, padding, padding, size, size);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}