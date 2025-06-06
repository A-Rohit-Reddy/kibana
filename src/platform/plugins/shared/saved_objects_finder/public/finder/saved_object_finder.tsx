/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import PropTypes from 'prop-types';
import React, { ReactElement, ReactNode } from 'react';
import { getTagFindReferences, parseQuery } from '@kbn/saved-objects-management-plugin/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiSearchBarProps,
  EuiTableFieldDataColumnType,
  EuiText,
  EuiToolTip,
  EuiIconTip,
  IconType,
  Query,
  SearchFilterConfig,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import {
  withEuiTablePersist,
  type EuiTablePersistInjectedProps,
} from '@kbn/shared-ux-table-persist/src';

import { FinderAttributes, SavedObjectCommon, LISTING_LIMIT_SETTING } from '../../common';

const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];

export interface SavedObjectMetaData<T extends FinderAttributes = FinderAttributes> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SavedObjectCommon<T>): IconType;
  getTooltipForSavedObject?(savedObject: SavedObjectCommon<T>): string;
  showSavedObject?(savedObject: SavedObjectCommon<T>): boolean;
  getSavedObjectSubType?(savedObject: SavedObjectCommon<T>): string;
  /** @deprecated doesn't do anything, the full object is returned **/
  includeFields?: string[];
}

export interface SavedObjectFinderItem extends SavedObjectCommon {
  title: string | null;
  name: string | null;
  simple: SavedObjectCommon<FinderAttributes>;
}

interface SavedObjectFinderState {
  items: SavedObjectFinderItem[];
  query: Query;
  isFetchingItems: boolean;
}

interface SavedObjectFinderServices {
  savedObjectsTagging?: SavedObjectsTaggingApi;
  contentClient: ContentClient;
  uiSettings: IUiSettingsClient;
}

interface BaseSavedObjectFinder {
  id: string;
  services: SavedObjectFinderServices;
  onChoose?: (
    id: SavedObjectCommon['id'],
    type: SavedObjectCommon['type'],
    name: string,
    savedObject: SavedObjectCommon
  ) => void;
  noItemsMessage?: ReactNode;
  savedObjectMetaData: Array<SavedObjectMetaData<FinderAttributes>>;
  showFilter?: boolean;
  leftChildren?: ReactElement | ReactElement[];
  children?: ReactElement | ReactElement[];
  helpText?: string;
  getTooltipText?: (item: SavedObjectFinderItem) => string | undefined;
}

interface SavedObjectFinderFixedPage extends BaseSavedObjectFinder {
  initialPageSize?: undefined;
  fixedPageSize: number;
}

interface SavedObjectFinderInitialPageSize extends BaseSavedObjectFinder {
  initialPageSize?: 5 | 10 | 15 | 25;
  fixedPageSize?: undefined;
}

export type SavedObjectFinderProps = SavedObjectFinderFixedPage | SavedObjectFinderInitialPageSize;

class SavedObjectFinderUiClass extends React.Component<
  SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>,
  SavedObjectFinderState
> {
  public static propTypes = {
    onChoose: PropTypes.func,
    noItemsMessage: PropTypes.node,
    savedObjectMetaData: PropTypes.array.isRequired,
    initialPageSize: PropTypes.oneOf([5, 10, 15, 25]),
    fixedPageSize: PropTypes.number,
    showFilter: PropTypes.bool,
  };
  private isComponentMounted: boolean = false;

  private debouncedFetch = debounce(async (query: Query) => {
    const metaDataMap = this.getSavedObjectMetaDataMap();
    const { contentClient, uiSettings } = this.props.services;

    const { queryText, visibleTypes, selectedTags } = parseQuery(
      query,
      Object.values(metaDataMap).map((metadata) => ({
        name: metadata.type,
        namespaceType: 'single',
        hidden: false,
        displayName: metadata.name,
      }))
    );
    const includeTags = getTagFindReferences({
      selectedTags,
      taggingApi: this.props.services.savedObjectsTagging,
    })?.map(({ id, type }) => id);

    const types = visibleTypes ?? Object.keys(metaDataMap);

    const response = await contentClient.mSearch<SavedObjectCommon<FinderAttributes>>({
      contentTypes: types.map((type) => ({ contentTypeId: type })),
      query: {
        text: queryText ? `${queryText}*` : undefined,
        ...(includeTags?.length ? { tags: { included: includeTags } } : {}),
        limit: uiSettings.get(LISTING_LIMIT_SETTING), // TODO: support pagination,
      },
    });

    const savedObjects = response.hits
      .map((savedObject) => {
        const {
          attributes: { name, title, description },
        } = savedObject;
        const titleToUse = typeof title === 'string' ? title : '';
        const nameToUse = name ? name : titleToUse;
        return {
          ...savedObject,
          version: savedObject.version,
          title: titleToUse,
          name: nameToUse,
          simple: savedObject,
          description,
        };
      })
      .filter((savedObject) => {
        const metaData = metaDataMap[savedObject.type];
        if (metaData.showSavedObject) {
          return metaData.showSavedObject(savedObject.simple);
        }
        return true;
      });

    if (!this.isComponentMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (query.text === this.state.query.text) {
      this.setState({
        isFetchingItems: false,
        items: savedObjects,
      });
    }
  }, 300);

  constructor(props: SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      query: Query.parse(''),
    };
  }

  public componentWillUnmount() {
    this.isComponentMounted = false;
    this.debouncedFetch.cancel();
  }

  public componentDidMount() {
    this.isComponentMounted = true;
    this.fetchItems();
  }

  private getSavedObjectMetaDataMap(): Record<string, SavedObjectMetaData> {
    return this.props.savedObjectMetaData.reduce(
      (map, metaData) => ({ ...map, [metaData.type]: metaData }),
      {}
    );
  }

  private fetchItems = () => {
    this.setState(
      {
        isFetchingItems: true,
      },
      this.debouncedFetch.bind(null, this.state.query)
    );
  };

  public render() {
    const {
      onChoose,
      savedObjectMetaData,
      euiTablePersist: { pageSize, sorting, onTableChange },
    } = this.props;
    const taggingApi = this.props.services.savedObjectsTagging;
    const originalTagColumn = taggingApi?.ui.getTableColumnDefinition();
    const tagColumn: EuiTableFieldDataColumnType<SavedObjectCommon> | undefined = originalTagColumn
      ? {
          ...originalTagColumn,
          sortable: (item) =>
            typeof originalTagColumn.sortable === 'function'
              ? originalTagColumn.sortable(item) ?? ''
              : '',
          ['data-test-subj']: 'savedObjectFinderTags',
        }
      : undefined;
    const typeColumn: EuiTableFieldDataColumnType<SavedObjectFinderItem> | undefined =
      savedObjectMetaData.length > 1
        ? {
            field: 'type',
            name: i18n.translate('savedObjectsFinder.typeName', {
              defaultMessage: 'Type',
            }),
            width: '70px',
            align: 'center',
            description: i18n.translate('savedObjectsFinder.typeDescription', {
              defaultMessage: 'Type of the saved object',
            }),
            sortable: ({ type }) => {
              const currentSavedObjectMetaData = savedObjectMetaData.find(
                (metaData) => metaData.type === type
              );

              return currentSavedObjectMetaData?.name ?? '';
            },
            'data-test-subj': 'savedObjectFinderType',
            render: (_, item) => {
              const currentSavedObjectMetaData = savedObjectMetaData.find(
                (metaData) => metaData.type === item.type
              )!;
              const iconType = (
                currentSavedObjectMetaData ||
                ({
                  getIconForSavedObject: () => 'document',
                } as Pick<SavedObjectMetaData, 'getIconForSavedObject'>)
              ).getIconForSavedObject(item.simple);

              return (
                <EuiIconTip
                  position="top"
                  content={currentSavedObjectMetaData.name}
                  aria-label={currentSavedObjectMetaData.name}
                  type={iconType}
                  size="s"
                  data-test-subj="objectType"
                />
              );
            },
          }
        : undefined;
    const columns: Array<EuiTableFieldDataColumnType<SavedObjectFinderItem>> = [
      ...(typeColumn ? [typeColumn] : []),
      {
        field: 'title',
        name: i18n.translate('savedObjectsFinder.titleName', {
          defaultMessage: 'Title',
        }),
        width: tagColumn ? '55%' : '100%',
        description: i18n.translate('savedObjectsFinder.titleDescription', {
          defaultMessage: 'Title of the saved object',
        }),
        dataType: 'string',
        sortable: ({ name }) => name?.toLowerCase(),
        'data-test-subj': 'savedObjectFinderTitle',
        render: (_, item) => {
          const currentSavedObjectMetaData = savedObjectMetaData.find(
            (metaData) => metaData.type === item.type
          )!;
          const fullName = currentSavedObjectMetaData.getTooltipForSavedObject
            ? currentSavedObjectMetaData.getTooltipForSavedObject(item.simple)
            : `${item.name} (${currentSavedObjectMetaData!.name})`;

          const link = (
            <EuiLink
              onClick={
                onChoose
                  ? () => {
                      onChoose(item.id, item.type, fullName, item.simple);
                    }
                  : undefined
              }
              title={fullName}
              data-test-subj={`savedObjectTitle${(item.title || '').split(' ').join('-')}`}
            >
              {item.name}
            </EuiLink>
          );

          const tooltipText = this.props.getTooltipText?.(item);
          const description = !!item.simple.attributes.description && (
            <EuiText size="xs" color="subdued">
              {item.simple.attributes.description}
            </EuiText>
          );
          return tooltipText ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip position="left" content={tooltipText}>
                {link}
              </EuiToolTip>
              {description}
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              {link}
              {description}
            </EuiFlexItem>
          );
        },
      },
      ...(tagColumn ? [tagColumn] : []),
    ];
    const pagination = {
      initialPageSize: !!this.props.fixedPageSize ? this.props.fixedPageSize : pageSize ?? 10,
      pageSize: !!this.props.fixedPageSize ? undefined : pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showPerPageOptions: !this.props.fixedPageSize,
    };
    const typeFilter: SearchFilterConfig = {
      type: 'field_value_selection',
      field: 'type',
      name: i18n.translate('savedObjectsFinder.filterButtonLabel', {
        defaultMessage: 'Types',
      }),
      multiSelect: 'or',
      options: this.props.savedObjectMetaData.map((metaData) => ({
        value: metaData.type,
        name: metaData.name,
      })),
    };
    const search: EuiSearchBarProps = {
      onChange: ({ query }) => {
        this.setState({ query: query ?? Query.parse('') }, this.fetchItems);
      },
      box: {
        incremental: true,
        'data-test-subj': 'savedObjectFinderSearchInput',
        autoFocus: true,
        inputRef: (node) => {
          requestAnimationFrame(() => {
            // preventing focus loss on the second rendering of the flyout
            // which seems to steal focus from the input
            node?.focus({ preventScroll: true });
          });
        },
        schema: {
          recognizedFields: ['type', 'tag'],
        },
      },
      filters: this.props.showFilter
        ? [
            ...(savedObjectMetaData.length > 1 ? [typeFilter] : []),
            ...(taggingApi ? [taggingApi.ui.getSearchBarFilter({ useName: true })] : []),
          ]
        : undefined,
      toolsRight: this.props.children ? <>{this.props.children}</> : undefined,
      toolsLeft: this.props.leftChildren ? <>{this.props.leftChildren}</> : undefined,
    };

    return (
      <EuiFlexGroup direction="column">
        {this.props.helpText ? (
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {this.props.helpText}
            </EuiText>
          </EuiFlexItem>
        ) : undefined}
        <EuiFlexItem>
          <EuiInMemoryTable
            loading={this.state.isFetchingItems}
            itemId="id"
            items={this.state.items}
            columns={columns}
            data-test-subj="savedObjectsFinderTable"
            message={this.props.noItemsMessage}
            search={search}
            pagination={pagination}
            sorting={!!this.state.query?.text ? undefined : sorting}
            onTableChange={onTableChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

export const SavedObjectFinderUi = withEuiTablePersist(SavedObjectFinderUiClass, {
  get: (props) => ({
    tableId: `soFinder-${props.id}`,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    initialPageSize: props.initialPageSize ?? props.fixedPageSize ?? 10,
  }),
});

export const SavedObjectFinderWithoutPersist = SavedObjectFinderUiClass; // For testing

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default SavedObjectFinderUi;
