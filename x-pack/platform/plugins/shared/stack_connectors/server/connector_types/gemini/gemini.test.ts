/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeminiConnector } from './gemini';
import type { RunActionParams } from '../../../common/gemini/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import { RunApiResponseSchema, StreamingResponseSchema } from '../../../common/gemini/schema';
import { DEFAULT_GEMINI_MODEL } from '../../../common/gemini/constants';
import type { AxiosError } from 'axios';
import { Transform } from 'stream';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

jest.mock('../lib/gen_ai/create_gen_ai_dashboard');
jest.mock('@kbn/actions-plugin/server/sub_action_framework/helpers/validators', () => ({
  assertURL: jest.fn(),
}));

// Mock the imported function
jest.mock('@kbn/actions-plugin/server/lib/get_gcp_oauth_access_token', () => ({
  getGoogleOAuthJwtAccessToken: jest.fn().mockResolvedValue('mock_access_token'),
}));

let mockRequest: jest.Mock;

describe('GeminiConnector', () => {
  const defaultResponse = {
    data: {
      candidates: [{ content: { role: 'model', parts: [{ text: 'Paris' }] } }],
      usageMetadata: { totalTokenCount: 0, promptTokenCount: 0, candidatesTokenCount: 0 },
    },
  };

  const sampleGeminiBody = {
    messages: [
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: 'What is the capital of France?' }],
          },
        ],
      },
    ],
  };

  const connectorResponse = {
    completion: 'Paris',
    usageMetadata: { totalTokenCount: 0, promptTokenCount: 0, candidatesTokenCount: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error
    mockRequest = connector.request = jest.fn().mockResolvedValue(defaultResponse);
  });

  const logger = loggingSystemMock.createLogger();
  const connector = new GeminiConnector({
    connector: { id: '1', type: '.gemini' },
    configurationUtilities: actionsConfigMock.create(),
    config: {
      apiUrl: 'https://api.gemini.com',
      defaultModel: DEFAULT_GEMINI_MODEL,
      gcpRegion: 'us-central1',
      gcpProjectID: 'my-project-12345',
    },
    secrets: {
      credentialsJson: JSON.stringify({
        type: 'service_account',
        project_id: '',
        private_key_id: '',
        private_key: '-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----\n',
        client_email: '',
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: '',
      }),
    },
    logger,
    services: actionsMock.createServices(),
  });
  const maxOutputTokens = 65535; // Example from Gemini 2.5 Pro
  let connectorUsageCollector: ConnectorUsageCollector;

  describe('Gemini', () => {
    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      connectorUsageCollector = new ConnectorUsageCollector({
        logger,
        connectorId: 'test-connector-id',
      });
    });

    describe('runApi', () => {
      it('should send a formatted request to the API and return the response', async () => {
        const runActionParams: RunActionParams = {
          body: JSON.stringify(sampleGeminiBody),
          model: DEFAULT_GEMINI_MODEL,
        };

        const response = await connector.runApi(runActionParams, connectorUsageCollector);

        // Assertions
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
            method: 'post',
            data: JSON.stringify({
              messages: [
                {
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: 'What is the capital of France?' }],
                    },
                  ],
                },
              ],
            }),
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            timeout: 60000,
            responseSchema: RunApiResponseSchema,
            signal: undefined,
          },
          connectorUsageCollector
        );

        expect(response).toEqual(connectorResponse);
      });

      describe('RunApiResponseSchema', () => {
        it('successfully validates a response that only has known properties', () => {
          const onlyKnownProperties = {
            ...defaultResponse.data,
          };

          expect(RunApiResponseSchema.validate(onlyKnownProperties)).toEqual(onlyKnownProperties);
        });

        it('fails validation when the response does NOT conform to the schema', () => {
          const missingRequiredFields = {
            // missing candidates and usageMetadata
          };

          expect(() => RunApiResponseSchema.validate(missingRequiredFields)).toThrowError();
        });

        it('removes unknown properties, but does NOT fail validation when they are present', () => {
          const hasUnknownProperties = {
            ...defaultResponse.data,
            modelVersion: '1.0.0', // <-- an unknown property
          };

          expect(RunApiResponseSchema.validate(hasUnknownProperties)).toEqual({
            ...defaultResponse.data,
          });
        });
      });
    });

    describe('invokeAI', () => {
      const aiAssistantBody = {
        messages: [
          {
            role: 'user',
            content: 'What is the capital of France?',
          },
        ],
      };

      const withMaxOutputTokens = {
        ...aiAssistantBody,
        maxOutputTokens,
      };

      it('the API call is successful with correct parameters', async () => {
        await connector.invokeAI(aiAssistantBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
            method: 'post',
            responseSchema: RunApiResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal: undefined,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });

      it('the API call includes maxOutputTokens when provided', async () => {
        await connector.invokeAI(withMaxOutputTokens, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
            method: 'post',
            responseSchema: RunApiResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
                maxOutputTokens,
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal: undefined,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });

      it('signal and timeout is properly passed to runApi', async () => {
        const signal = jest.fn();
        const timeout = 60000;
        await connector.invokeAI({ ...aiAssistantBody, timeout, signal }, connectorUsageCollector);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
            method: 'post',
            responseSchema: RunApiResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });

      it('maxOutputTokens is passed to runApi when provided', async () => {
        const signal = jest.fn();
        const timeout = 60000;
        await connector.invokeAI(
          { ...withMaxOutputTokens, timeout, signal },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
            method: 'post',
            responseSchema: RunApiResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
                maxOutputTokens,
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });
    });

    describe('invokeStream', () => {
      let stream;
      beforeEach(() => {
        stream = createStreamMock();
        stream.write(new Uint8Array([1, 2, 3]));
        mockRequest = jest.fn().mockResolvedValue({ ...defaultResponse, data: stream.transform });
        // @ts-ignore
        connector.request = mockRequest;
      });
      const aiAssistantBody = {
        messages: [
          {
            role: 'user',
            content: 'What is the capital of France?',
          },
        ],
        toolConfig: {
          mode: 'ANY' as const,
          allowedFunctionNames: ['foo', 'bar'],
        },
      };

      const withMaxOutputTokens = {
        ...aiAssistantBody,
        maxOutputTokens,
      };

      it('the API call is successful with correct request parameters', async () => {
        await connector.invokeStream(aiAssistantBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
              },
              tool_config: {
                function_calling_config: {
                  mode: 'ANY',
                  allowed_function_names: ['foo', 'bar'],
                },
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            responseType: 'stream',
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal: undefined,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });

      it('the API call includes maxOutputTokens when provided', async () => {
        await connector.invokeStream(withMaxOutputTokens, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
                maxOutputTokens,
              },
              tool_config: {
                function_calling_config: {
                  mode: 'ANY',
                  allowed_function_names: ['foo', 'bar'],
                },
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            responseType: 'stream',
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal: undefined,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });

      it('signal and timeout is properly passed to streamApi', async () => {
        const signal = jest.fn();
        const timeout = 60000;
        await connector.invokeStream(
          { ...aiAssistantBody, timeout, signal },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
              },
              tool_config: {
                function_calling_config: {
                  mode: 'ANY',
                  allowed_function_names: ['foo', 'bar'],
                },
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            responseType: 'stream',
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });

      it('maxOutputTokens is passed to streamApi when provided', async () => {
        const signal = jest.fn();
        const timeout = 60000;
        await connector.invokeStream(
          { ...withMaxOutputTokens, timeout, signal },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: `https://api.gemini.com/v1/projects/my-project-12345/locations/us-central1/publishers/google/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'What is the capital of France?' }],
                },
              ],
              generation_config: {
                temperature: 0,
                maxOutputTokens,
              },
              tool_config: {
                function_calling_config: {
                  mode: 'ANY',
                  allowed_function_names: ['foo', 'bar'],
                },
              },
              safety_settings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
            responseType: 'stream',
            headers: {
              Authorization: 'Bearer mock_access_token',
              'Content-Type': 'application/json',
            },
            signal,
            timeout: 60000,
          },
          connectorUsageCollector
        );
      });
    });

    describe('getResponseErrorMessage', () => {
      it('returns an unknown error message', () => {
        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage({})).toEqual(
          `Unexpected API Error:  - Unknown error`
        );
      });

      it('returns the error.message', () => {
        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage({ message: 'a message' })).toEqual(
          `Unexpected API Error:  - a message`
        );
      });

      it('returns the error.response.data.error.message', () => {
        const err = {
          response: {
            headers: {},
            status: 404,
            statusText: 'Resource Not Found',
            data: {
              message: 'Resource not found',
            },
          },
        } as AxiosError<{ message?: string }>;
        expect(
          // @ts-expect-error expects an axios error as the parameter
          connector.getResponseErrorMessage(err)
        ).toEqual(`API Error: Resource Not Found - Resource not found`);
      });
    });
  });

  describe('Token dashboard', () => {
    const mockGenAi = initDashboard as jest.Mock;
    beforeEach(() => {
      // @ts-ignore
      connector.esClient.transport.request = mockRequest;
      mockRequest.mockResolvedValue({ has_all_requested: true });
      mockGenAi.mockResolvedValue({ success: true });
      jest.clearAllMocks();
    });
    it('the create dashboard API call returns available: true when user has correct permissions', async () => {
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: true });
    });
    it('the create dashboard API call returns available: false when user has correct permissions', async () => {
      mockRequest.mockResolvedValue({ has_all_requested: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });

    it('the create dashboard API call returns available: false when init dashboard fails', async () => {
      mockGenAi.mockResolvedValue({ success: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });
  });
});

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: Uint8Array) => {
      transform.push(data);
    },
    fail: () => {
      transform.emit('error', new Error('Stream failed'));
      transform.end();
    },
    transform,
    complete: () => {
      transform.end();
    },
  };
}
