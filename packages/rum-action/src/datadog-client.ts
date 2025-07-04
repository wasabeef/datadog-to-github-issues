import * as core from '@actions/core';
import { v2, client } from '@datadog/datadog-api-client';
import { API_LIMITS } from '@datadog-to-github-issues/core';

/**
 * Datadog RUM error data structure
 *
 * @remarks
 * This interface represents the structure of error events returned by the Datadog RUM API.
 * Each error contains detailed information about browser errors, crashes, and exceptions.
 *
 * @example
 * ```typescript
 * const error: RUMError = {
 *   id: "unique-error-id",
 *   type: "rum",
 *   attributes: {
 *     timestamp: 1234567890,
 *     service: "frontend-app",
 *     tags: ["env:production", "version:1.0.0"],
 *     attributes: {
 *       error: {
 *         message: "Cannot read property 'x' of undefined",
 *         type: "TypeError",
 *         source: "source",
 *         handling: "unhandled"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface RUMError {
  id: string;
  type: string;
  attributes: {
    timestamp: number;
    service: string;
    tags: string[];
    attributes: {
      date: number;
      service: string;
      error: {
        id?: string;
        message: string;
        type: string;
        source: string;
        stack?: string;
        handling: string;
        fingerprint?: string;
        is_crash?: boolean;
        resource?: {
          method: string;
          status_code: number;
          url: string;
        };
      };
      view?: {
        id: string;
        url: string;
        referrer?: string;
        name?: string;
      };
      session?: {
        id: string;
        type: string;
        has_replay: boolean;
      };
      usr?: {
        id?: string;
        name?: string;
        email?: string;
      };
      browser?: {
        name: string;
        version: string;
      };
      os?: {
        name: string;
        version: string;
      };
      device?: {
        type: string;
        name?: string;
      };
      geo?: {
        country?: string;
        city?: string;
      };
      context?: Record<string, any>;
      issue?: {
        id: string;
        first_seen: number;
        first_seen_version?: string;
        age: number;
      };
    };
  };
}

/**
 * Client for interacting with Datadog RUM API
 *
 * @remarks
 * This client provides methods to fetch and process RUM (Real User Monitoring) errors
 * from Datadog. It handles authentication, pagination, and rate limiting automatically.
 *
 * @example
 * ```typescript
 * const client = new DatadogClient(apiKey, appKey, 'datadoghq.com');
 * const errors = await client.fetchRUMErrors(
 *   '@type:error AND service:frontend',
 *   'now-24h',
 *   'now'
 * );
 * ```
 */
export class DatadogClient {
  private apiInstance: v2.RUMApi;

  /**
   * Creates a new Datadog client instance
   *
   * @param apiKey - Datadog API key with RUM read permissions
   * @param appKey - Datadog Application key
   * @param site - Datadog site (default: datadoghq.com)
   *
   * @throws {Error} If API keys are invalid or missing
   *
   * @example
   * ```typescript
   * // For US1 region (default)
   * const client = new DatadogClient(apiKey, appKey);
   *
   * // For EU region
   * const client = new DatadogClient(apiKey, appKey, 'datadoghq.eu');
   * ```
   */
  constructor(apiKey: string, appKey: string, site: string = 'datadoghq.com') {
    const configuration = client.createConfiguration({
      authMethods: {
        apiKeyAuth: apiKey,
        appKeyAuth: appKey,
      },
    });

    configuration.setServerVariables({
      site: site,
    });

    this.apiInstance = new v2.RUMApi(configuration);
  }

  /**
   * Fetches RUM errors from Datadog API with automatic pagination
   *
   * @param query - Datadog query string for filtering errors
   * @param dateFrom - Start time for the query (e.g., 'now-24h', '2024-01-01')
   * @param dateTo - End time for the query (e.g., 'now', '2024-01-02')
   *
   * @returns Promise resolving to array of RUM errors
   *
   * @throws {Error} If API request fails or rate limit is exceeded
   *
   * @example
   * ```typescript
   * // Fetch all errors from the last 24 hours
   * const errors = await client.fetchRUMErrors(
   *   '@type:error AND service:frontend',
   *   'now-24h',
   *   'now'
   * );
   *
   * // Fetch unhandled errors only
   * const unhandledErrors = await client.fetchRUMErrors(
   *   '@type:error AND @error.handling:unhandled',
   *   'now-7d',
   *   'now'
   * );
   * ```
   *
   * @remarks
   * - Results are limited to 1000 events per page
   * - Maximum 10 pages are fetched (10,000 events total)
   * - Events are sorted by timestamp in descending order
   */
  async fetchRUMErrors(
    query: string,
    dateFrom: string,
    dateTo: string
  ): Promise<RUMError[]> {
    const errors: RUMError[] = [];
    let cursor: string | undefined;
    const limit = API_LIMITS.RUM_EVENTS_PER_PAGE;
    const maxPages = API_LIMITS.MAX_PAGES; // Safety limit

    try {
      for (let page = 0; page < maxPages; page++) {
        core.debug(`Fetching page ${page + 1} of RUM errors`);

        const params: v2.RUMApiSearchRUMEventsRequest = {
          body: {
            filter: {
              from: dateFrom,
              to: dateTo,
              query: query,
            },
            page: {
              limit: limit,
              cursor: cursor,
            },
            sort: '-timestamp' as v2.RUMSort,
          },
        };

        const response = await this.apiInstance.searchRUMEvents(params);

        if (!response.data) {
          break;
        }

        // Add errors from this page
        errors.push(...(response.data as unknown as RUMError[]));

        // Check for next page
        cursor = response.meta?.page?.after;
        if (!cursor || response.data.length < limit) {
          break;
        }
      }

      core.info(`Successfully fetched ${errors.length} RUM errors`);
      return errors;
    } catch (error) {
      if (error instanceof Error) {
        core.error(`Failed to fetch RUM errors: ${error.message}`);
        throw new Error(`Datadog API error: ${error.message}`);
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a single event to test the connection
      const params: v2.RUMApiSearchRUMEventsRequest = {
        body: {
          filter: {
            from: 'now-1h',
            to: 'now',
            query: '@type:error',
          },
          page: {
            limit: 1,
          },
        },
      };

      await this.apiInstance.searchRUMEvents(params);
      return true;
    } catch (error) {
      core.error(`Datadog connection test failed: ${error}`);
      return false;
    }
  }
}
