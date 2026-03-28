// =============================================================================
// lib/api-response.ts
// Consistent response helpers for API routes.
// =============================================================================

import { NextResponse } from "next/server";
import type { ApiErrorResponse, ApiSuccessResponse, ValidationError } from "../types/guests";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details && { details }) } },
    { status }
  );
}

export function validationErrorResponse(errors: ValidationError[]): NextResponse<ApiErrorResponse> {
  const details: Record<string, string[]> = {};
  for (const err of errors) {
    if (!details[err.field]) details[err.field] = [];
    details[err.field].push(err.message);
  }
  return errorResponse(400, "VALIDATION_ERROR", "One or more fields failed validation.", details);
}

export function authErrorResponse(code: string, message: string): NextResponse<ApiErrorResponse> {
  return errorResponse(401, code, message);
}

export function forbiddenResponse(
  message = "You do not have access to this resource."
): NextResponse<ApiErrorResponse> {
  return errorResponse(403, "FORBIDDEN", message);
}

export function notFoundResponse(resource = "Resource"): NextResponse<ApiErrorResponse> {
  return errorResponse(404, "NOT_FOUND", `${resource} not found.`);
}

/**
 * Logs full error server-side (Vercel logs), returns generic message to client.
 * TODO post-launch: replace console.error with Sentry
 */
export function internalErrorResponse(
  error: unknown,
  context = "Unknown operation"
): NextResponse<ApiErrorResponse> {
  console.error(`[API Error] ${context}:`, error);
  return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred. Please try again.");
}
