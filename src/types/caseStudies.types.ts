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

export interface CaseStudy {
  client: string;
  createdAt?: string;
  date: string;
  featured: boolean;
  id: number;
  industry: string;
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
  cta?: CaseStudyCta;
  ctaTitle?: string;
  ctaUrl?: string;
  internalLinks?: CaseStudyInternalLink[];
}

export interface CaseStudyPayload {
  client: string;
  date: string;
  featured: boolean;
  industry: string;
  overview: CaseStudyOverview;
  palette: string[];
  paletteNames: string[];
  process: CaseStudyProcess;
  projectInfo: CaseStudyProjectInfo;
  publishedAt?: string | null;   
  readTime: string;
  results?: CaseStudyResults;
  sortOrder?: number;
  status: CaseStudyStatus;
  summary: string;
  tags: string[];
  team: CaseStudyTeamMember[];
  team_members?: CaseStudyTeamMember[];
  palette_names?: string[];
  project_info?: CaseStudyProjectInfo;
  published_at?: string | null;
  read_time?: string;
  sort_order?: number;
  title: string;
  // CTA
  cta?: CaseStudyCta;
  ctaTitle?: string;        
  ctaUrl?: string;          
  // Internal Links
  internalLinks?: CaseStudyInternalLink[];
  
}

export interface GetCaseStudiesParams {
  page: number;
  per_page: number;
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
export interface CaseStudyCta {
  title: string;
  buttonLabel: string;
  buttonHref: string;
}

export interface CaseStudyInternalLink {
  anchor: string;
  url: string;
}
export interface CaseStudyCTA {
  title?: string;
  buttonLabel?: string;
  buttonHref?: string;
}
