/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { LazyPackagePolicyInputVarField, type NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { NewPackagePolicyAssetInput } from '../types';
import { CLOUDBEAT_GCP, GCP_ORGANIZATION_ACCOUNT } from './constants';
import type { AssetRadioOption } from '../asset_boxed_radio_group';
import { RadioGroup } from '../asset_boxed_radio_group';
import {
  fieldIsInvalid,
  findVariableDef,
  getAssetCloudShellDefaultValue,
  getAssetPolicy,
} from '../utils';
import { assetIntegrationDocsNavigation } from '../../../constants';
import { ReadDocumentation } from '../aws_credentials_form/aws_credentials_form';
import {
  CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS,
  GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ,
} from '../test_subjects';
import type { GcpCredentialsType } from './types';

export const GCP_SETUP_ACCESS = {
  CLOUD_SHELL: 'google_cloud_shell',
  MANUAL: 'manual',
} as const;

export const GCP_CREDENTIALS_TYPE = {
  CREDENTIALS_FILE: 'credentials-file',
  CREDENTIALS_JSON: 'credentials-json',
  CREDENTIALS_NONE: 'credentials-none',
} as const;

type SetupFormatGCP = typeof GCP_SETUP_ACCESS.CLOUD_SHELL | typeof GCP_SETUP_ACCESS.MANUAL;

export const GCPSetupInfoContent = ({ isAgentless }: { isAgentless: boolean }) => (
  <>
    <EuiHorizontalRule margin="xl" />
    <EuiTitle size="xs">
      <h2>
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.setupInfoContentTitle"
          defaultMessage="Setup Access"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="l" />
    <EuiText color={'subdued'} size="s">
      {isAgentless ? (
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.agentlessSetupInfoContent"
          defaultMessage="You can follow these step-by-step instructions to generate the necessary credentials. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={assetIntegrationDocsNavigation.gcpGetStartedPath} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.gettingStarted.agentlessSetupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.setupInfoContent"
          defaultMessage="Select your preferred method of providing the GCP credentials this integration will use. You can follow these step-by-step instructions to generate the necessary credentials. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={assetIntegrationDocsNavigation.gcpGetStartedPath} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      )}
    </EuiText>
  </>
);

const GoogleCloudShellSetup = ({
  fields,
  onChange,
  input,
  disabled,
  hasInvalidRequiredVars,
}: {
  fields: Array<GcpFields[keyof GcpFields] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
  input: NewPackagePolicyInput;
  disabled: boolean;
  hasInvalidRequiredVars: boolean;
}) => {
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const getFieldById = (id: keyof GcpInputFields['fields']) => {
    return fields.find((element) => element.id === id);
  };
  const projectIdFields = getFieldById('gcp.project_id');
  const organizationIdFields = getFieldById('gcp.organization_id');
  return (
    <>
      <EuiText
        color="subdued"
        size="s"
        data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.GOOGLE_CLOUD_SHELL_SETUP}
      >
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.cloudShellSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.cloudShellSetupStep.login"
              defaultMessage="Log into your Google Cloud Console"
            />
          </li>
          {accountType === GCP_ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.organizationCloudShellSetupStep.save"
                defaultMessage="Note down the GCP organization ID of the organization you wish to monitor and project ID where you want to provision resources for monitoring purposes and provide them in the input boxes below"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.cloudShellSetupStep.save"
                defaultMessage="Note down the GCP project ID of the project you wish to monitor"
              />
            </li>
          )}

          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.cloudShellSetupStep.launch"
              defaultMessage='Click "Save and Continue" at the bottom right of the page. Then, on the pop-up modal, click "Launch Google Cloud Shell"'
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiForm component="form">
        {organizationIdFields && accountType === GCP_ORGANIZATION_ACCOUNT && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.organization_id'].label}>
            <EuiFieldText
              disabled={disabled}
              data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID}
              id={organizationIdFields.id}
              fullWidth
              value={organizationIdFields.value || ''}
              onChange={(event) => onChange(organizationIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
        {projectIdFields && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.project_id'].label}>
            <EuiFieldText
              disabled={disabled}
              data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID}
              id={projectIdFields.id}
              fullWidth
              value={projectIdFields.value || ''}
              onChange={(event) => onChange(projectIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
      </EuiForm>
      <EuiSpacer size="m" />
    </>
  );
};

const credentialOptionsList = [
  {
    text: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.credentialsFileOption',
      {
        defaultMessage: 'Credentials File',
      }
    ),
    value: GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
    'data-test-subj': 'credentials_file_option_test_id',
  },
  {
    text: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.credentialsJsonOption',
      {
        defaultMessage: 'Credentials JSON',
      }
    ),
    value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
    'data-test-subj': 'credentials_json_option_test_id',
  },
];

type GcpFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; value?: string; isSecret?: boolean }
>;

interface GcpInputFields {
  fields: GcpFields;
}

export const gcpField: GcpInputFields = {
  fields: {
    'gcp.organization_id': {
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.organizationIdFieldLabel',
        {
          defaultMessage: 'Organization ID',
        }
      ),
      type: 'text',
    },
    'gcp.project_id': {
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.projectidFieldLabel',
        {
          defaultMessage: 'Project ID',
        }
      ),
      type: 'text',
    },
    'gcp.credentials.file': {
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.gcpInputText.credentialFileText',
        {
          defaultMessage: 'Path to JSON file containing the credentials and key used to subscribe',
        }
      ),
      type: 'text',
    },
    'gcp.credentials.json': {
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.gcpInputText.credentialJSONText',
        {
          defaultMessage: 'JSON blob containing the credentials and key used to subscribe',
        }
      ),
      type: 'password',
      isSecret: true,
    },
    'gcp.credentials.type': {
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.gcpInputText.credentialSelectBoxTitle',
        {
          defaultMessage: 'Credential',
        }
      ),
      type: 'text',
    },
  },
};

const getSetupFormatOptions = (): AssetRadioOption[] => [
  {
    id: GCP_SETUP_ACCESS.CLOUD_SHELL,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.setupFormatOptions.googleCloudShell',
      {
        defaultMessage: 'Google Cloud Shell',
      }
    ),
    disabled: false,
    testId: GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUD_SHELL,
  },
  {
    id: GCP_SETUP_ACCESS.MANUAL,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.gcpIntegration.setupFormatOptions.manual',
      {
        defaultMessage: 'Manual',
      }
    ),
    disabled: false,
    testId: GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL,
  },
];

export interface GcpFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  // setIsValid?: (isValid: boolean) => void;
  // onChange?: (opts: { updatedPolicy: NewPackagePolicy; isValid: boolean }) => void;
  disabled: boolean;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
}

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: GcpFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
      } as const;
    });

const getSetupFormatFromInput = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>
): SetupFormatGCP => {
  const credentialsType = getGcpCredentialsType(input);

  // Google Cloud shell is the default value
  if (!credentialsType) {
    return GCP_SETUP_ACCESS.CLOUD_SHELL;
  }

  if (credentialsType !== GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE) {
    return GCP_SETUP_ACCESS.MANUAL;
  }

  return GCP_SETUP_ACCESS.CLOUD_SHELL;
};

const getGoogleCloudShellUrl = (newPolicy: NewPackagePolicy) => {
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === CLOUDBEAT_GCP)
    ?.config?.cloud_shell_url?.value;

  return template || undefined;
};

const updateCloudShellUrl = (
  newPolicy: NewPackagePolicy,
  updatePolicy: (policy: NewPackagePolicy) => void,
  templateUrl: string | undefined
) => {
  updatePolicy?.({
    ...newPolicy,
    inputs: newPolicy.inputs.map((input) => {
      if (input.type === CLOUDBEAT_GCP) {
        return {
          ...input,
          config: { cloud_shell_url: { value: templateUrl } },
        };
      }
      return input;
    }),
  });
};

const useCloudShellUrl = ({
  packageInfo,
  newPolicy,
  updatePolicy,
  setupFormat,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy) => void;
  setupFormat: SetupFormatGCP;
}) => {
  useEffect(() => {
    const policyInputCloudShellUrl = getGoogleCloudShellUrl(newPolicy);

    if (setupFormat === GCP_SETUP_ACCESS.MANUAL) {
      if (policyInputCloudShellUrl) {
        updateCloudShellUrl(newPolicy, updatePolicy, undefined);
      }
      return;
    }
    const templateUrl = getAssetCloudShellDefaultValue(packageInfo);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    // If the template is already set, do not update the policy
    if (policyInputCloudShellUrl === templateUrl) return;

    updateCloudShellUrl(newPolicy, updatePolicy, templateUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_shell_url, newPolicy, packageInfo, setupFormat]);
};

export const getGcpCredentialsType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>
): GcpCredentialsType | undefined => input.streams[0].vars?.['gcp.credentials.type'].value;

export const GcpCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
  isEditPage,
  hasInvalidRequiredVars,
}: GcpFormProps) => {
  /* Create a subset of properties from GcpField to use for hiding value of credentials json and credentials file when user switch from Manual to Cloud Shell, we wanna keep Project and Organization ID */
  const subsetOfGcpField = (({ 'gcp.credentials.file': a, 'gcp.credentials.json': b }) => ({
    'gcp.credentials.file': a,
    'gcp.credentials.json': b,
  }))(gcpField.fields);
  const fieldsToHide = getInputVarsFields(input, subsetOfGcpField);
  const fields = getInputVarsFields(input, gcpField.fields);
  const fieldsSnapshot = useRef({});
  const lastCredentialsType = useRef<string | undefined>(undefined);
  const setupFormat = getSetupFormatFromInput(input);
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === 'organization-account';

  useCloudShellUrl({
    packageInfo,
    newPolicy,
    updatePolicy,
    setupFormat,
  });

  const onSetupFormatChange = (newSetupFormat: SetupFormatGCP) => {
    if (newSetupFormat === GCP_SETUP_ACCESS.CLOUD_SHELL) {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fieldsToHide.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastCredentialsType.current = getGcpCredentialsType(input);

      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.credentials.type': {
            value: GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fieldsToHide.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.credentials.type': {
            // Restoring last manual credentials type
            value: lastCredentialsType.current || GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        })
      );
    }
  };

  return (
    <>
      <GCPSetupInfoContent isAgentless={false} />
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(idSelected: SetupFormatGCP) =>
          idSelected !== setupFormat && onSetupFormatChange(idSelected)
        }
      />
      <EuiSpacer size="l" />
      {setupFormat === GCP_SETUP_ACCESS.CLOUD_SHELL ? (
        <GoogleCloudShellSetup
          disabled={disabled}
          fields={fields}
          onChange={(key, value) =>
            updatePolicy(getAssetPolicy(newPolicy, input.type, { [key]: { value } }))
          }
          input={input}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      ) : (
        <GcpInputVarFields
          disabled={disabled}
          fields={fields}
          onChange={(key, value) =>
            updatePolicy(getAssetPolicy(newPolicy, input.type, { [key]: { value } }))
          }
          isOrganization={isOrganization}
          packageInfo={packageInfo}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}

      <EuiSpacer size="s" />
      <ReadDocumentation url={assetIntegrationDocsNavigation.gcpGetStartedPath} />
      <EuiSpacer />
    </>
  );
};

// eslint-disable-next-line complexity
export const GcpInputVarFields = ({
  fields,
  onChange,
  isOrganization,
  disabled,
  packageInfo,
  isEditPage,
  hasInvalidRequiredVars,
}: {
  fields: Array<GcpFields[keyof GcpFields] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
  isOrganization: boolean;
  disabled: boolean;
  packageInfo: PackageInfo;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
}) => {
  const getFieldById = (id: keyof GcpInputFields['fields']) => {
    return fields.find((element) => element.id === id);
  };

  const organizationIdFields = getFieldById('gcp.organization_id');

  const projectIdFields = getFieldById('gcp.project_id');

  const credentialsTypeFields = getFieldById('gcp.credentials.type');

  const credentialFilesFields = getFieldById('gcp.credentials.file');
  const credentialFilesFieldsInvalid = fieldIsInvalid(
    credentialFilesFields?.value,
    hasInvalidRequiredVars
  );
  const credentialFilesError = i18n.translate(
    'xpack.securitySolution.assetInventory.fleetIntegration.assetIntegration.integration.fieldRequired',
    {
      defaultMessage: '{field} is required',
      values: {
        field: credentialFilesFields?.label,
      },
    }
  );

  const credentialJSONFields = getFieldById('gcp.credentials.json');
  const credentialJSONFieldsInvalid = fieldIsInvalid(
    credentialJSONFields?.value,
    hasInvalidRequiredVars
  );
  const credentialJSONError = i18n.translate(
    'xpack.securitySolution.assetInventory.fleetIntegration.assetIntegration.integration.fieldRequired',
    {
      defaultMessage: '{field} is required',
      values: {
        field: credentialJSONFields?.label,
      },
    }
  );

  const credentialFieldValue = credentialOptionsList[0].value;
  const credentialJSONValue = credentialOptionsList[1].value;

  const credentialsTypeValue =
    credentialsTypeFields?.value ||
    (credentialFilesFields && credentialFieldValue) ||
    (credentialJSONFields && credentialJSONValue);

  return (
    <div>
      <EuiForm component="form">
        {organizationIdFields && isOrganization && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.organization_id'].label}>
            <EuiFieldText
              disabled={disabled}
              data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID}
              id={organizationIdFields.id}
              fullWidth
              value={organizationIdFields.value || ''}
              onChange={(event) => onChange(organizationIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
        {projectIdFields && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.project_id'].label}>
            <EuiFieldText
              disabled={disabled}
              data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID}
              id={projectIdFields.id}
              fullWidth
              value={projectIdFields.value || ''}
              onChange={(event) => onChange(projectIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
        {credentialsTypeFields && credentialFilesFields && credentialJSONFields && (
          <EuiFormRow fullWidth label={gcpField.fields['gcp.credentials.type'].label}>
            <EuiSelect
              data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE}
              fullWidth
              options={credentialOptionsList}
              value={credentialsTypeFields?.value || credentialOptionsList[0].value}
              onChange={(optionElem) => {
                onChange(credentialsTypeFields?.id, optionElem.target.value);
              }}
            />
          </EuiFormRow>
        )}
        {credentialsTypeValue === credentialFieldValue && credentialFilesFields && (
          <EuiFormRow
            fullWidth
            label={gcpField.fields['gcp.credentials.file'].label}
            isInvalid={credentialFilesFieldsInvalid}
            error={credentialFilesFieldsInvalid ? credentialFilesError : undefined}
          >
            <EuiFieldText
              data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE}
              id={credentialFilesFields.id}
              fullWidth
              value={credentialFilesFields.value || ''}
              onChange={(event) => onChange(credentialFilesFields.id, event.target.value)}
              isInvalid={credentialFilesFieldsInvalid}
            />
          </EuiFormRow>
        )}
        {credentialsTypeValue === credentialJSONValue && credentialJSONFields && (
          <div
            css={css`
              width: 100%;
              .euiFormControlLayout,
              .euiFormControlLayout__childrenWrapper,
              .euiFormRow,
              input {
                max-width: 100%;
                width: 100%;
              }
            `}
          >
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={gcpField.fields['gcp.credentials.json'].label}
              isInvalid={credentialJSONFieldsInvalid}
              error={credentialJSONFieldsInvalid ? credentialJSONError : undefined}
            >
              <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                <LazyPackagePolicyInputVarField
                  data-test-subj={CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON}
                  varDef={{
                    ...findVariableDef(packageInfo, credentialJSONFields.id),
                    name: credentialJSONFields.id, // Ensure 'name' is explicitly set
                    required: true,
                    type: 'textarea',
                    secret: true,
                    full_width: true,
                  }}
                  value={credentialJSONFields.value || ''}
                  onChange={(value) => {
                    onChange(credentialJSONFields.id, value);
                  }}
                  isEditPage={isEditPage}
                />
              </Suspense>
            </EuiFormRow>
          </div>
        )}
      </EuiForm>
    </div>
  );
};
