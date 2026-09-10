import { proxy } from '@/lib/backend';

/**
 * Reference implementation of the ADR-0001 proxy pattern.
 *
 * A Route Handler is a forwarding address. It names a method and a path and
 * returns what the backend said. There is no logic here, and there should be
 * none in the handlers you add next.
 *
 * Runs against fixtures until `BACKEND_URL` is set. Check the `x-data-source`
 * response header to see which mode answered.
 */
export async function GET(): Promise<Response> {
  return proxy('GET', '/health');
}
