import { llmsTxtResponse } from '@/lib/llms/buildLlmsTxt';

export const revalidate = 604800;

export async function GET() {
  return llmsTxtResponse();
}
