export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error('[api]', err);
  const msg = err instanceof Error ? err.message : 'Terjadi error tidak diketahui';
  return Response.json({ error: `Server error: ${msg}` }, { status: 500 });
}