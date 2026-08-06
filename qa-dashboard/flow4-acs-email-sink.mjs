import { appendFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const host = '127.0.0.1';
const port = Number(process.env.FLOW4_EMAIL_SINK_PORT || 51001);
const outputDirectory = resolve('.flow4');
const outputFile = resolve(outputDirectory, 'email-capture.jsonl');
await mkdir(outputDirectory, { recursive: true });

const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  const id = randomUUID();

  if (request.method === 'POST' && request.url?.startsWith('/emails:send')) {
    await appendFile(outputFile, `${JSON.stringify({ id, capturedAt: new Date().toISOString(), body: JSON.parse(body) })}\n`, { mode: 0o600 });
    response.writeHead(202, {
      'content-type': 'application/json',
      'operation-location': `http://${host}:${port}/emails/operations/${id}?api-version=2023-03-31`,
      'x-ms-request-id': id
    });
    response.end(JSON.stringify({ id, status: 'Running' }));
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/emails/operations/')) {
    response.writeHead(200, { 'content-type': 'application/json', 'x-ms-request-id': id });
    response.end(JSON.stringify({ id, status: 'Succeeded' }));
    return;
  }

  response.writeHead(404).end();
});

server.listen(port, host, () => console.log(`Flow 4 local email capture boundary ready at http://${host}:${port}; message bodies are not logged.`));
