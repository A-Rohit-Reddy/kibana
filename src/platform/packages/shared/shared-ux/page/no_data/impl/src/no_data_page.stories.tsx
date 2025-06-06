/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { NoDataPageStorybookMock } from '@kbn/shared-ux-page-no-data-mocks';
import type { NoDataPageStorybookParams } from '@kbn/shared-ux-page-no-data-mocks';

import { NoDataPage as Component } from './no_data_page';

import { NoDataPageProvider } from './services';
import mdx from '../README.mdx';

const mock = new NoDataPageStorybookMock();

export default {
  title: 'No Data/Page/No Data Page',
  description: 'A component to display when there is no data available',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const NoDataPage = {
  render: (params: NoDataPageStorybookParams) => {
    return (
      <NoDataPageProvider {...mock.getServices(params)}>
        <Component {...mock.getProps(params)} />
      </NoDataPageProvider>
    );
  },

  argTypes: mock.getArgumentTypes(),
};
