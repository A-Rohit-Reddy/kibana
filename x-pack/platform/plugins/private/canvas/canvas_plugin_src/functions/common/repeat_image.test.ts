/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { elasticLogo, elasticOutline } from '../../../public/lib';
import { functionWrapper } from '@kbn/presentation-util-plugin/test_helpers';
import { repeatImage } from './repeat_image';

describe('repeatImage', () => {
  const fn = functionWrapper(repeatImage);

  it('returns a render as repeatImage', async () => {
    const result = await fn(10, {}, {} as ExecutionContext);
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'repeatImage');
  });

  describe('args', () => {
    describe('image', () => {
      it('sets the source of the repeated image', async () => {
        const result = (await fn(10, { image: elasticLogo }, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('image', elasticLogo);
      });

      it('defaults to the Elastic outline logo', async () => {
        const result = (await fn(100000, {}, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('image', elasticOutline);
      });
    });

    describe('size', () => {
      it('sets the size of the image', async () => {
        const result = (await fn(-5, { size: 200 }, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('size', 200);
      });

      it('defaults to 100', async () => {
        const result = (await fn(-5, {}, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('size', 100);
      });
    });

    describe('max', () => {
      it('sets the maximum number of a times the image is repeated', async () => {
        const result = (await fn(100000, { max: 20 }, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('max', 20);
      });
      it('defaults to 1000', async () => {
        const result = (await fn(100000, {}, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('max', 1000);
      });
    });

    describe('emptyImage', () => {
      it('returns repeatImage object with emptyImage as undefined', async () => {
        const result = (await fn(100000, { emptyImage: elasticLogo }, {} as ExecutionContext))
          .value;
        expect(result).toHaveProperty('emptyImage', elasticLogo);
      });
      it('sets emptyImage to null', async () => {
        const result = (await fn(100000, {}, {} as ExecutionContext)).value;
        expect(result).toHaveProperty('emptyImage', null);
      });
    });
  });
});
