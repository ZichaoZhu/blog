import type { APIRoute } from 'astro';
import { handleApi } from '../../server/api';
export const ALL: APIRoute = ({ request }) => handleApi(request);
