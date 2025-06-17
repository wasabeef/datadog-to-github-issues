import * as core from '@actions/core';
import { GitHub } from '@actions/github/lib/utils';
import { ErrorGroup } from './error-processor';
import { IssueFormatter } from './issue-formatter';

export interface ExistingIssue {
  issue: any;
  isOpen: boolean;
}

export class GitHubClient {
  constructor(
    private octokit: InstanceType<typeof GitHub>,
    private owner: string,
    private repo: string
  ) {
    // Constructor parameters are used as private fields
  }

  get repositoryOwner(): string {
    return this.owner;
  }

  get repositoryName(): string {
    return this.repo;
  }

  get client(): InstanceType<typeof GitHub> {
    return this.octokit;
  }

  async findExistingIssue(errorHash: string): Promise<ExistingIssue | null> {
    try {
      // Search for open issues first
      const openIssues = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        labels: 'datadog-error',
        per_page: 100,
      });

      const openIssue = openIssues.data.find((issue) =>
        issue.body?.includes(`<!-- error-hash: ${errorHash} -->`)
      );

      if (openIssue) {
        return { issue: openIssue, isOpen: true };
      }

      // Search for recently closed issues (last 30 days)
      const since = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const closedIssues = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'closed',
        labels: 'datadog-error',
        since: since,
        per_page: 100,
      });

      const closedIssue = closedIssues.data.find((issue) =>
        issue.body?.includes(`<!-- error-hash: ${errorHash} -->`)
      );

      if (closedIssue) {
        return { issue: closedIssue, isOpen: false };
      }

      return null;
    } catch (error) {
      core.error(`Failed to search for existing issues: ${error}`);
      return null;
    }
  }

  async createIssue(params: {
    title: string;
    body: string;
    labels: string[];
  }): Promise<any> {
    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: params.title,
        body: params.body,
        labels: params.labels,
      });

      return response.data;
    } catch (error) {
      core.error(`Failed to create issue: ${error}`);
      throw error;
    }
  }

  async updateExistingIssue(
    existingIssue: ExistingIssue,
    errorGroup: ErrorGroup,
    formatter: IssueFormatter,
    reopenClosed: boolean
  ): Promise<boolean> {
    const { issue, isOpen } = existingIssue;
    let wasReopened = false;

    try {
      // If closed and should reopen
      if (
        !isOpen &&
        reopenClosed &&
        this.shouldReopenIssue(errorGroup, issue)
      ) {
        await this.octokit.rest.issues.update({
          owner: this.owner,
          repo: this.repo,
          issue_number: issue.number,
          state: 'open',
        });

        // Add reopen comment
        const reopenComment = formatter.generateReopenComment(
          errorGroup,
          issue
        );
        await this.octokit.rest.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: issue.number,
          body: reopenComment,
        });

        wasReopened = true;
      }

      // Add update comment
      const previousData = this.extractPreviousData(issue.body);
      const updateComment = formatter.generateUpdateComment(
        errorGroup,
        previousData
      );

      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issue.number,
        body: updateComment,
      });

      // Update labels if needed
      await this.updateIssueLabels(issue, errorGroup);

      return wasReopened;
    } catch (error) {
      core.error(`Failed to update issue #${issue.number}: ${error}`);
      throw error;
    }
  }

  private shouldReopenIssue(errorGroup: ErrorGroup, closedIssue: any): boolean {
    if (!closedIssue.closed_at) return false;

    const closedAt = new Date(closedIssue.closed_at);
    const daysSinceClosed =
      (Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Reopen if:
    // - Closed within 7 days
    // - High severity (50+ occurrences) and closed within 30 days
    // - Many affected users (10+) and closed within 14 days
    return (
      daysSinceClosed <= 7 ||
      (errorGroup.count >= 50 && daysSinceClosed <= 30) ||
      (errorGroup.affectedUsers.size >= 10 && daysSinceClosed <= 14)
    );
  }

  private extractPreviousData(issueBody: string): any {
    // Extract previous occurrence count from issue body
    const occurrenceMatch = issueBody.match(/\*\*Total Occurrences:\*\* (\d+)/);
    const occurrences = occurrenceMatch ? parseInt(occurrenceMatch[1], 10) : 0;

    return {
      occurrences,
    };
  }

  private async updateIssueLabels(
    issue: any,
    errorGroup: ErrorGroup
  ): Promise<void> {
    const currentLabels = issue.labels.map((l: any) => l.name);
    const newLabels = [...currentLabels];

    // Add severity label based on count
    if (errorGroup.count >= 100 && !currentLabels.includes('critical')) {
      newLabels.push('critical');
    } else if (
      errorGroup.count >= 50 &&
      !currentLabels.includes('high-priority')
    ) {
      newLabels.push('high-priority');
    }

    // Add has-replay label if applicable
    if (errorGroup.hasReplay && !currentLabels.includes('has-replay')) {
      newLabels.push('has-replay');
    }

    // Only update if labels changed
    if (newLabels.length !== currentLabels.length) {
      await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issue.number,
        labels: newLabels,
      });
    }
  }
}
