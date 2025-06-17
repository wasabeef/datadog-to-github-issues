import * as core from '@actions/core';
import * as github from '@actions/github';
import { DatadogClient } from './datadog-client';
import { GitHubClient } from './github-client';
import { ErrorProcessor } from './error-processor';
import { IssueFormatter } from './issue-formatter';

interface ActionInputs {
  datadogApiKey: string;
  datadogAppKey: string;
  datadogSite: string;
  githubToken: string;
  service?: string;
  dateFrom: string;
  dateTo: string;
  errorHandling: string;
  errorSource?: string;
  excludeNoise: boolean;
  maxIssuesPerRun: number;
  updateExisting: boolean;
  reopenClosed: boolean;
  labels: string[];
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs = getInputs();

    // Initialize clients
    const datadogClient = new DatadogClient(
      inputs.datadogApiKey,
      inputs.datadogAppKey,
      inputs.datadogSite
    );

    const octokit = github.getOctokit(inputs.githubToken);
    const { owner, repo } = github.context.repo;
    const githubClient = new GitHubClient(octokit, owner, repo);

    // Build search query
    const query = buildSearchQuery(inputs);
    core.info(`Searching for RUM errors with query: ${query}`);

    // Fetch errors from Datadog
    const errors = await datadogClient.fetchRUMErrors(
      query,
      inputs.dateFrom,
      inputs.dateTo
    );
    core.info(`Found ${errors.length} total errors`);

    if (errors.length === 0) {
      core.info('No errors found. Exiting.');
      return;
    }

    // Process and group errors
    const errorProcessor = new ErrorProcessor();
    const errorGroups = errorProcessor.groupErrors(errors);
    core.info(`Grouped into ${errorGroups.size} unique errors`);

    // Initialize formatter
    const formatter = new IssueFormatter();

    // Track statistics
    let issuesCreated = 0;
    let issuesUpdated = 0;
    let issuesReopened = 0;

    // Process each error group
    const sortedGroups = Array.from(errorGroups.values())
      .sort((a, b) => b.count - a.count) // Sort by occurrence count
      .slice(0, inputs.maxIssuesPerRun);

    for (const errorGroup of sortedGroups) {
      try {
        // Check for existing issue
        const existingIssue = await githubClient.findExistingIssue(
          errorGroup.hash
        );

        if (existingIssue) {
          if (inputs.updateExisting) {
            const wasReopened = await githubClient.updateExistingIssue(
              existingIssue,
              errorGroup,
              formatter,
              inputs.reopenClosed
            );

            issuesUpdated++;
            if (wasReopened) {
              issuesReopened++;
            }

            core.info(
              `Updated issue #${existingIssue.issue.number} for error: ${errorGroup.hash}`
            );
          } else {
            core.info(`Skipping existing issue for error: ${errorGroup.hash}`);
          }
        } else {
          // Create new issue
          const issueTitle = formatter.generateIssueTitle(errorGroup);
          const issueBody = formatter.generateIssueBody(errorGroup);

          const issue = await githubClient.createIssue({
            title: issueTitle,
            body: issueBody,
            labels: inputs.labels,
          });

          issuesCreated++;
          core.info(
            `Created issue #${issue.number} for error: ${errorGroup.hash}`
          );
        }
      } catch (error) {
        core.error(
          `Failed to process error group ${errorGroup.hash}: ${error}`
        );
      }
    }

    // Set outputs
    core.setOutput('issues-created', issuesCreated.toString());
    core.setOutput('issues-updated', issuesUpdated.toString());
    core.setOutput('issues-reopened', issuesReopened.toString());

    core.info(
      `Summary: Created ${issuesCreated}, Updated ${issuesUpdated}, Reopened ${issuesReopened} issues`
    );
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

function getInputs(): ActionInputs {
  return {
    datadogApiKey: core.getInput('datadog-api-key', { required: true }),
    datadogAppKey: core.getInput('datadog-app-key', { required: true }),
    datadogSite: core.getInput('datadog-site') || 'datadoghq.com',
    githubToken: core.getInput('github-token', { required: true }),
    service: core.getInput('service') || undefined,
    dateFrom: core.getInput('date-from') || 'now-24h',
    dateTo: core.getInput('date-to') || 'now',
    errorHandling: core.getInput('error-handling') || 'unhandled',
    errorSource: core.getInput('error-source') || undefined,
    excludeNoise: core.getBooleanInput('exclude-noise') ?? true,
    maxIssuesPerRun: parseInt(core.getInput('max-issues-per-run') || '10', 10),
    updateExisting: core.getBooleanInput('update-existing') ?? true,
    reopenClosed: core.getBooleanInput('reopen-closed') ?? true,
    labels: core
      .getInput('labels')
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l),
  };
}

function buildSearchQuery(inputs: ActionInputs): string {
  const queries = ['@type:error'];

  // Service filter
  if (inputs.service) {
    queries.push(`@service:"${inputs.service}"`);
  }

  // Error handling filter
  if (inputs.errorHandling && inputs.errorHandling !== 'all') {
    queries.push(`@error.handling:${inputs.errorHandling}`);
  }

  // Error source filter
  if (inputs.errorSource) {
    queries.push(`@error.source:${inputs.errorSource}`);
  }

  // Exclude noise
  if (inputs.excludeNoise) {
    const noisePatterns = [
      'NOT @error.message:*ChunkLoadError*',
      'NOT @error.message:*ResizeObserver*',
      'NOT @error.message:*Non-Error promise rejection*',
      'NOT @error.message:*Network request failed*',
      'NOT @error.message:*Script error*',
      'NOT @error.message:*undefined is not an object*',
    ];
    queries.push(...noisePatterns);
  }

  return queries.join(' AND ');
}

// Run the action
run();
