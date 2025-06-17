export interface IssueData {
  title: string;
  body: string;
  labels: string[];
}

export interface BaseError {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface DatadogConfig {
  apiKey: string;
  appKey: string;
  site: string;
  webUrl: string;
}
