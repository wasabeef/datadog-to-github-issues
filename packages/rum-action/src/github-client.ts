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
      // Use GitHub search API for better performance and accuracy
      const searchQuery = `repo:${this.owner}/${this.repo} "error-hash: ${errorHash}" in:body`;

      const searchResponse =
        await this.octokit.rest.search.issuesAndPullRequests({
          q: searchQuery,
          per_page: 10,
          sort: 'updated',
          order: 'desc',
        });

      if (searchResponse.data.items.length === 0) {
        return null;
      }

      // Get the most recently updated issue
      const foundIssue = searchResponse.data.items[0];

      // Fetch the full issue details to get the correct state
      const fullIssue = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: foundIssue.number,
      });

      return {
        issue: fullIssue.data,
        isOpen: fullIssue.data.state === 'open',
      };
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
    inputs: any
  ): Promise<boolean> {
    const { issue, isOpen } = existingIssue;
    let wasReopened = false;

    try {
      // If closed and should reopen
      if (
        !isOpen &&
        inputs.reopenClosed &&
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

      // Find and update existing update comment, or create new one
      await this.updateOrCreateStatusComment(issue, errorGroup, formatter);

      // Update labels based on current configuration
      await this.updateIssueLabels(issue, errorGroup, inputs);

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

  private async updateOrCreateStatusComment(
    issue: any,
    errorGroup: ErrorGroup,
    formatter: IssueFormatter
  ): Promise<void> {
    try {
      // Get all comments for the issue
      const comments = await this.octokit.rest.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: issue.number,
        per_page: 100,
      });

      // Find existing status comment (marked with special identifier)
      const statusComment = comments.data.find((comment) =>
        comment.body?.includes('<!-- status-update-comment -->')
      );

      const newStatusContent = formatter.generateStatusUpdateComment(
        errorGroup,
        issue,
        statusComment ? this.extractUpdateHistory(statusComment.body || '') : []
      );

      if (statusComment) {
        // Update existing status comment
        await this.octokit.rest.issues.updateComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: statusComment.id,
          body: newStatusContent,
        });
      } else {
        // Create new status comment
        await this.octokit.rest.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: issue.number,
          body: newStatusContent,
        });
      }
    } catch (error) {
      core.error(`Failed to update status comment: ${error}`);
      // Fallback to creating a regular update comment
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
    }
  }

  private extractUpdateHistory(
    commentBody: string
  ): Array<{ date: string; occurrences: number; users: number }> {
    // Extract existing update history from the collapsible section
    const historyMatch = commentBody.match(
      /<!-- update-history-start -->(.*?)<!-- update-history-end -->/s
    );
    if (!historyMatch) return [];

    const historyContent = historyMatch[1];
    const updates: Array<{ date: string; occurrences: number; users: number }> =
      [];

    // Parse existing history entries
    const entryMatches = historyContent.matchAll(
      /- \*\*(.*?)\*\*: (\d+) occurrences, (\d+) users/g
    );
    for (const match of entryMatches) {
      updates.push({
        date: match[1],
        occurrences: parseInt(match[2], 10),
        users: parseInt(match[3], 10),
      });
    }

    return updates;
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
    errorGroup: ErrorGroup,
    inputs: any
  ): Promise<void> {
    const currentLabels = issue.labels.map((l: any) => l.name);

    // Calculate what labels should be
    const expectedLabels = [...inputs.labels];
    const isCrash =
      errorGroup.representative.attributes.attributes.error.is_crash;

    if (isCrash === true && inputs.fatalLabels.length > 0) {
      expectedLabels.push(...inputs.fatalLabels);
    } else if (isCrash === false && inputs.nonFatalLabels.length > 0) {
      expectedLabels.push(...inputs.nonFatalLabels);
    }

    // Check if labels need updating
    const labelsNeedUpdate =
      expectedLabels.length !== currentLabels.length ||
      !expectedLabels.every((label) => currentLabels.includes(label));

    if (labelsNeedUpdate) {
      await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issue.number,
        labels: expectedLabels,
      });
    }
  }
}
