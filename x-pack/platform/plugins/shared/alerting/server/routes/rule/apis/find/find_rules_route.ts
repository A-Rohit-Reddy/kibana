/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  FindRulesRequestQueryV1,
  FindRulesResponseV1,
} from '../../../../../common/routes/rule/apis/find';
import {
  findRulesRequestQuerySchemaV1,
  findRuleParamsExamplesV1,
} from '../../../../../common/routes/rule/apis/find';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { ruleResponseSchemaV1 } from '../../../../../common/routes/rule/response';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import { transformFindRulesBodyV1, transformFindRulesResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const findRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rules/_find`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Get information about rules',
        tags: ['oas-tag:alerting'],
        oasOperationObject: findRuleParamsExamplesV1,
      },
      validate: {
        request: {
          query: findRulesRequestQuerySchemaV1,
        },
        response: {
          200: {
            body: () => ruleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = await (await context.alerting).getRulesClient();

        const query: FindRulesRequestQueryV1 = req.query;

        trackLegacyTerminology(
          [query.search, query.search_fields, query.sort_field].filter(Boolean) as string[],
          usageCounter
        );

        const options = transformFindRulesBodyV1({
          ...query,
          has_reference: query.has_reference || undefined,
          search_fields: searchFieldsAsArray(query.search_fields),
        });

        if (req.query.fields) {
          usageCounter?.incrementCounter({
            counterName: `alertingFieldsUsage`,
            counterType: 'alertingFieldsUsage',
            incrementBy: 1,
          });
        }

        const findResult = await rulesClient.find({
          options,
          excludeFromPublicApi: true,
          includeSnoozeData: true,
        });

        const responseBody: FindRulesResponseV1<RuleParamsV1>['body'] =
          transformFindRulesResponseV1<RuleParamsV1>(findResult, options.fields, false);

        return res.ok({
          body: responseBody,
        });
      })
    )
  );
};

function searchFieldsAsArray(searchFields: string | string[] | undefined): string[] | undefined {
  if (!searchFields) {
    return;
  }
  return Array.isArray(searchFields) ? searchFields : [searchFields];
}
