import type { PaginationPayload } from "./pagination.types";

export type ColorStoryStatus = 0 | 1;
export type ColorStoryStatusFilter = "all" | "0" | "1";

export interface ColorStoryAuthor {
  name: string;
  avatar?: string;
  readTime?: string;
  date?: string;
}

export interface ColorStory {
  id: number;
  title: string;
  excerpt: string;
  palette: string[];
  category: string;
  author: ColorStoryAuthor;
  tags: string[];
  status: ColorStoryStatus;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ColorStoryPayload {
  title: string;
  excerpt: string;
  palette: string[];
  category: string;
  author: ColorStoryAuthor;
  tags: string[];
  status: ColorStoryStatus;
  published_at: string | null;
}

export interface GetColorStoriesParams {
  page: number;
  per_page: number;
  search?: string;
  status?: ColorStoryStatus;
  category?: string;
}

export interface ColorStoriesFiltersFormValues {
  search: string;
  status: ColorStoryStatusFilter;
  category: string;
}

export interface ColorStoriesApiResponse {
  success?: boolean;
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: ColorStory[];
  pagination: PaginationPayload;
}

export interface SingleColorStoryApiResponse {
  success?: boolean;
  data?: ColorStory;
  story?: ColorStory;
  colorStory?: ColorStory;
}
