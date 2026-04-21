import type { PaginationPayload } from "./pagination.types";

export type CaseStudyStatus = 0 | 1;

export interface CaseStudyOverviewQuote {
  author: string;
  role: string;
  text: string;
}

export interface CaseStudyOverviewHighlight {
  detail: string;
  label: string;
}

export interface CaseStudyOverview {
  paragraphs: string[];
  quote?: CaseStudyOverviewQuote;
  highlights?: CaseStudyOverviewHighlight[];
}

export interface GetCaseStudiesParams {
  page: number;
  per_page: number;
  search?: string;
  signal?: AbortSignal;
  /** Pass [1] for published-only, [0] for draft-only, or [] for all */
  status: CaseStudyStatus[];
}

export interface CaseStudyProcessStep {
  description: string;
  title: string;
}

export interface CaseStudyProcess {
  intro?: string;
  steps: CaseStudyProcessStep[];
}

export interface CaseStudyResultStat {
  description?: string;
  label: string;
  value: string;
}

export interface CaseStudyResultComparison {
  after: number;
  before: number;
  label: string;
}

export interface CaseStudyResults {
  comparisons: CaseStudyResultComparison[];
  intro?: string;
  stats: CaseStudyResultStat[];
}

export interface CaseStudyProjectInfo {
  client?: string;
  deliverables?: string;
  duration?: string;
  projectType?: string;
  published?: string;
  readTime?: string;
  services?: string[];
  timeline?: string;
}

export interface CaseStudyTeamMember {
  color?: string;
  initials?: string;
  name: string;
  role: string;
}

export interface CaseStudyCta {
  title: string;
  buttonLabel: string;
  buttonHref: string;
}

export interface CaseStudyInternalLink {
  anchor: string;
  url: string;
}

export interface CaseStudy {
  client: string;
  createdAt?: string;
  cta?: CaseStudyCta;
  ctaTitle?: string;
  ctaUrl?: string;
  date: string;
  featured: boolean;
  id: number;
  industry: string;
  internalLinks?: CaseStudyInternalLink[];
  overview: CaseStudyOverview;
  palette: string[];
  paletteNames: string[];
  process: CaseStudyProcess;
  projectInfo: CaseStudyProjectInfo;
  publishedAt?: string | null;
  readTime: string;
  results?: CaseStudyResults;
  sortOrder?: number | null;
  status: CaseStudyStatus;
  summary: string;
  tags: string[];
  team: CaseStudyTeamMember[];
  title: string;
  updatedAt?: string;
}

export interface CaseStudyPayload {
  client: string;
  cta?: CaseStudyCta;
  ctaTitle?: string;
  ctaUrl?: string;
  date: string;
  featured: boolean;
  industry: string;
  internalLinks?: CaseStudyInternalLink[];
  overview: CaseStudyOverview;
  palette: string[];
  palette_names?: string[];
  paletteNames: string[];
  process: CaseStudyProcess;
  project_info?: CaseStudyProjectInfo;
  projectInfo: CaseStudyProjectInfo;
  published_at?: string | null;
  read_time?: string;
  readTime: string;
  results?: CaseStudyResults;
  sort_order?: number;
  sortOrder?: number;
  status: CaseStudyStatus;
  summary: string;
  tags: string[];
  team: CaseStudyTeamMember[];
  team_members?: CaseStudyTeamMember[];
  title: string;
}

export interface CaseStudiesApiResponse {
  data: CaseStudy[];
  page: number;
  pagination: PaginationPayload;
  per_page: number;
  success?: boolean;
  total: number;
  total_pages: number;
}

export interface SingleCaseStudyApiResponse {
  caseStudy?: CaseStudy;
  data?: CaseStudy;
  item?: CaseStudy;
  success?: boolean;
}