import * as core from '@actions/core';
import { v2, client } from '@datadog/datadog-api-client';

/**
 * Datadog RUM error data structure
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
    };
  };
}

/**
 * Client for interacting with Datadog RUM API
 */
export class DatadogClient {
  private apiInstance: v2.RUMApi;

  /**
   * Creates a new Datadog client instance
   * @param apiKey - Datadog API key
   * @param appKey - Datadog Application key
   * @param site - Datadog site (default: datadoghq.com)
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
   * Fetches RUM errors from Datadog API
   * @param query - Datadog query string for filtering errors
   * @param dateFrom - Start time for the query (e.g., 'now-24h')
   * @param dateTo - End time for the query (e.g., 'now')
   * @returns Array of RUM errors
   */
  async fetchRUMErrors(
    query: string,
    dateFrom: string,
    dateTo: string
  ): Promise<RUMError[]> {
    const errors: RUMError[] = [];
    let cursor: string | undefined;
    const limit = 100;
    const maxPages = 10; // Safety limit

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
