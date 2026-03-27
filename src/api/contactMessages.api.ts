import type {
  ContactMessagesApiResponse,
  ContactMessage,
} from "@/types/contactMessages.types";

import { deleteWithFallback, getWithFallback } from "@/lib/requestFallback";

interface DeleteContactMessageApiResponse {
  success: boolean;
  message: string;
  contact_message_id: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContactMessage(value: unknown): value is ContactMessage {
  return (
    isRecord(value) &&
    typeof value.contact_message_id === "number" &&
    typeof value.description === "string"
  );
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function getContactMessagesEndpointCandidates(id?: number): string[] {
  const suffix = typeof id === "number" ? `/${id}` : "";

  return [
    `/contact/contact-messages${suffix}`,
    `/admin/contact/contact-messages${suffix}`,
    `/admin/contact-messages${suffix}`,
  ];
}

function extractMessages(raw: unknown): ContactMessage[] {
  if (Array.isArray(raw)) {
    return raw as ContactMessage[];
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (Array.isArray(raw.data)) {
    return raw.data as ContactMessage[];
  }

  if (Array.isArray(raw.messages)) {
    return raw.messages as ContactMessage[];
  }

  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.messages)) {
      return raw.data.messages as ContactMessage[];
    }

    if (Array.isArray(raw.data.items)) {
      return raw.data.items as ContactMessage[];
    }
  }

  return [];
}

function extractSingleMessage(raw: unknown): ContactMessage | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (isRecord(raw.data)) {
    if (isContactMessage(raw.data.contactMessage)) {
      return raw.data.contactMessage;
    }

    if (isContactMessage(raw.data.message)) {
      return raw.data.message;
    }

    if (isContactMessage(raw.data)) {
      return raw.data;
    }
  }

  if (isContactMessage(raw.contactMessage)) {
    return raw.contactMessage;
  }

  if (isContactMessage(raw.message)) {
    return raw.message;
  }

  if (isContactMessage(raw)) {
    return raw;
  }

  return null;
}

function extractPagination(raw: unknown): Record<string, unknown> | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  if (isRecord(raw.pagination)) {
    return raw.pagination;
  }

  if (isRecord(raw.data) && isRecord(raw.data.pagination)) {
    return raw.data.pagination;
  }

  return undefined;
}

function getContactMessagesContainers(raw: unknown): Record<string, unknown>[] {
  const containers: Record<string, unknown>[] = [];

  if (isRecord(raw)) {
    containers.push(raw);
  }

  if (isRecord(raw) && isRecord(raw.data)) {
    containers.push(raw.data);
  }

  const pagination = extractPagination(raw);

  if (pagination) {
    containers.push(pagination);
  }

  return containers;
}

function getFirstDefinedValue(
  containers: Record<string, unknown>[],
  keys: string[],
): unknown {
  for (const container of containers) {
    for (const key of keys) {
      if (key in container && container[key] !== undefined) {
        return container[key];
      }
    }
  }

  return undefined;
}

export async function getContactMessages(
  page: number,
  limit: number,
): Promise<ContactMessagesApiResponse> {
  const response = await getWithFallback<unknown>(
    getContactMessagesEndpointCandidates(),
    {
      params: { page, limit },
    },
  );

  const messages = extractMessages(response.data);
  const containers = getContactMessagesContainers(response.data);
  const total = toNonNegativeInteger(
    getFirstDefinedValue(containers, ["total", "count"]),
    messages.length,
  );
  const resolvedLimit = toPositiveInteger(
    getFirstDefinedValue(containers, ["limit", "per_page", "perPage"]),
    limit,
  );
  const totalPages = toPositiveInteger(
    getFirstDefinedValue(containers, ["total_pages", "totalPages", "pages"]),
    Math.max(Math.ceil(Math.max(total, messages.length) / resolvedLimit), 1),
  );

  return {
    success: !isRecord(response.data) || response.data.success !== false,
    data: messages,
    pagination: {
      total,
      page: toPositiveInteger(
        getFirstDefinedValue(containers, ["page", "currentPage", "current_page"]),
        page,
      ),
      limit: resolvedLimit,
      total_pages: totalPages,
      totalPages,
    },
  };
}

export async function getContactMessageById(
  id: number,
): Promise<ContactMessage> {
  const response = await getWithFallback<unknown>(
    getContactMessagesEndpointCandidates(id),
  );
  const message = extractSingleMessage(response.data);

  if (!message) {
    throw new Error("Contact message not found");
  }

  return message;
}

export async function deleteContactMessageById(
  id: number,
): Promise<DeleteContactMessageApiResponse> {
  const response = await deleteWithFallback<DeleteContactMessageApiResponse>(
    getContactMessagesEndpointCandidates(id),
  );

  return response.data;
}

export function getContactMessagesErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load contact messages.";
  }

  return "Failed to load contact messages.";
}
