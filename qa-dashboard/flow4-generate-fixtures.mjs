import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const destination = resolve('.flow4/fixtures');
await mkdir(destination, { recursive: true });

const fixtures = {
  'valid-proof.pdf': Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'),
  'valid-proof.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  'valid-proof.jpg': Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=', 'base64'),
  'mime-mismatch.png': Buffer.from('%PDF-1.4\nsynthetic mismatch\n%%EOF\n'),
  'magic-byte-mismatch.pdf': Buffer.from('This is intentionally not a PDF.'),
  'eicar-test.txt': Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
};

for (const [name, data] of Object.entries(fixtures)) await writeFile(resolve(destination, name), data);
await writeFile(resolve(destination, 'oversized-proof.pdf'), Buffer.alloc(10 * 1024 * 1024 + 1, 0x41));
console.log(`Created ${Object.keys(fixtures).length + 1} synthetic Flow 4 fixtures in ${destination}.`);
