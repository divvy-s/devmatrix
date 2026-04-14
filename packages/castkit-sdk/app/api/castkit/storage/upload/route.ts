import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type StorageNetwork = 'ipfs' | 'arweave';

type ParsedPayload = {
  requestedNetwork: StorageNetwork;
  mode: 'json' | 'file';
  data?: unknown;
  bytes?: Uint8Array;
  contentType: string;
  filename?: string;
};

function normalizeNetwork(input: unknown): StorageNetwork {
  const value = String(input || '').toLowerCase().trim();
  if (value === 'ipfs' || value === 'arweave') return value;
  throw new Error('Invalid network. Use "ipfs" or "arweave".');
}

async function parsePayload(request: NextRequest): Promise<ParsedPayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const requestedNetwork = normalizeNetwork(formData.get('network'));
    const maybeFile = formData.get('file');

    if (!(maybeFile instanceof File)) {
      throw new Error('Missing file payload in multipart request.');
    }

    const arrayBuffer = await maybeFile.arrayBuffer();
    return {
      requestedNetwork,
      mode: 'file',
      bytes: new Uint8Array(arrayBuffer),
      contentType: maybeFile.type || 'application/octet-stream',
      filename: maybeFile.name || 'upload.bin'
    };
  }

  const body = await request.json();
  return {
    requestedNetwork: normalizeNetwork(body?.network),
    mode: 'json',
    data: body?.data,
    contentType: 'application/json'
  };
}

function asIpfsReceipt(cid: string, requestedNetwork: StorageNetwork) {
  const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
  const protocolUrl = `ipfs://${cid}`;

  return {
    status: 'confirmed',
    provider: 'pinata',
    network: 'ipfs',
    requestedNetwork,
    cid,
    gatewayUrl,
    protocolUrl,
    displayUrl: gatewayUrl,
    permanentUrl: protocolUrl,
    urls: {
      display: gatewayUrl,
      permanent: protocolUrl
    }
  };
}

async function readFailureReason(response: Response) {
  const text = await response.text();
  return text || `Upstream request failed with status ${response.status}.`;
}

async function uploadToPinata(payload: ParsedPayload) {
  const pinataJwt = process.env.CASTKIT_PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('Missing CASTKIT_PINATA_JWT. Add it to your server environment to enable IPFS uploads.');
  }

  if (payload.mode === 'file') {
    const formData = new FormData();
    const fileName = payload.filename || 'upload.bin';
    const blob = new Blob([payload.bytes || new Uint8Array()], {
      type: payload.contentType || 'application/octet-stream'
    });

    formData.append('file', blob, fileName);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJwt}`
      },
      body: formData,
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(await readFailureReason(res));
    }

    const json = (await res.json()) as { IpfsHash?: string };
    if (!json?.IpfsHash) {
      throw new Error('Pinata response did not include IpfsHash for file upload.');
    }

    return asIpfsReceipt(json.IpfsHash, payload.requestedNetwork);
  }

  const jsonContent =
    payload.data && typeof payload.data === 'object'
      ? payload.data
      : {
          value: payload.data
        };

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pinataContent: jsonContent
    }),
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(await readFailureReason(res));
  }

  const json = (await res.json()) as { IpfsHash?: string };
  if (!json?.IpfsHash) {
    throw new Error('Pinata response did not include IpfsHash for JSON upload.');
  }

  return asIpfsReceipt(json.IpfsHash, payload.requestedNetwork);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parsePayload(request);
    const receipt = await uploadToPinata(payload);
    return NextResponse.json(receipt, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storage upload failed unexpectedly.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
