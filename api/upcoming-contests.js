import { handleApiRequest } from '../server-api.js';

export default async function handler(req, res) {
  await handleApiRequest(req, res);
}
