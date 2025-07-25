/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useMemo, useState, useEffect, useRef, RefObject } from 'react';
import {
  css,
  GenericDataType,
  getTimeFormatter,
  safeHtmlSpan,
  styled,
  t,
  TimeFormats,
  useTheme,
} from '@superset-ui/core';
import { Column } from 'react-table';
import { debounce } from 'lodash';
import {
  Constants,
  Button,
  Icons,
  Input,
  Popover,
  Radio,
} from '@superset-ui/core/components';
import { CopyToClipboard } from 'src/components';
import { prepareCopyToClipboardTabularData } from 'src/utils/common';
import { getTimeColumns, setTimeColumns } from './utils';

export const CellNull = styled('span')`
  color: ${({ theme }) => theme.colors.grayscale.light1};
`;

export const CopyButton = styled(Button)`
  font-size: ${({ theme }) => theme.fontSizeSM}px;

  // needed to override button's first-of-type margin: 0
  && {
    margin: 0 ${({ theme }) => theme.sizeUnit * 2}px;
  }

  i {
    padding: 0 ${({ theme }) => theme.sizeUnit}px;
  }
`;

export const CopyToClipboardButton = ({
  data,
  columns,
}: {
  data?: Record<string, any>;
  columns?: string[];
}) => (
  <CopyToClipboard
    text={
      data && columns ? prepareCopyToClipboardTabularData(data, columns) : ''
    }
    wrapped={false}
    copyNode={
      <Icons.CopyOutlined
        iconSize="l"
        aria-label={t('Copy')}
        role="button"
        css={css`
          &.anticon > * {
            line-height: 0;
          }
        `}
      />
    }
  />
);

export const FilterInput = ({
  onChangeHandler,
  shouldFocus = false,
}: {
  onChangeHandler(filterText: string): void;
  shouldFocus?: boolean;
}) => {
  const inputRef: RefObject<any> = useRef(null);

  useEffect(() => {
    // Focus the input element when the component mounts
    if (inputRef.current && shouldFocus) {
      inputRef.current.focus();
    }
  }, []);

  const theme = useTheme();
  const debouncedChangeHandler = debounce(
    onChangeHandler,
    Constants.SLOW_DEBOUNCE,
  );
  return (
    <Input
      prefix={<Icons.SearchOutlined iconSize="l" />}
      placeholder={t('Search')}
      onChange={(event: any) => {
        const filterText = event.target.value;
        debouncedChangeHandler(filterText);
      }}
      css={css`
        width: 200px;
        margin-right: ${theme.sizeUnit * 2}px;
      `}
      ref={inputRef}
    />
  );
};

enum FormatPickerValue {
  Formatted = 'formatted',
  Original = 'original',
}

const FormatPicker = ({
  onChange,
  value,
}: {
  onChange: any;
  value: FormatPickerValue;
}) => (
  <Radio.GroupWrapper
    spaceConfig={{
      direction: 'vertical',
      align: 'start',
      size: 15,
      wrap: false,
    }}
    size="large"
    value={value}
    onChange={onChange}
    options={[
      { label: t('Formatted date'), value: FormatPickerValue.Formatted },
      { label: t('Original value'), value: FormatPickerValue.Original },
    ]}
  />
);

const FormatPickerContainer = styled.div`
  display: flex;
  flex-direction: column;

  padding: ${({ theme }) => `${theme.sizeUnit * 4}px`};
`;

const FormatPickerLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  color: ${({ theme }) => theme.colors.grayscale.base};
  margin-bottom: ${({ theme }) => theme.sizeUnit * 2}px;
`;

const DataTableTemporalHeaderCell = ({
  columnName,
  onTimeColumnChange,
  datasourceId,
  isOriginalTimeColumn,
}: {
  columnName: string;
  onTimeColumnChange: (
    columnName: string,
    columnType: FormatPickerValue,
  ) => void;
  datasourceId?: string;
  isOriginalTimeColumn: boolean;
}) => {
  const theme = useTheme();

  const onChange = (e: any) => {
    onTimeColumnChange(columnName, e.target.value);
  };

  const overlayContent = useMemo(
    () =>
      datasourceId ? ( // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <FormatPickerContainer
          onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
        >
          {/* hack to disable click propagation from popover content to table header, which triggers sorting column */}
          <FormatPickerLabel>{t('Column Formatting')}</FormatPickerLabel>
          <FormatPicker
            onChange={onChange}
            value={
              isOriginalTimeColumn
                ? FormatPickerValue.Original
                : FormatPickerValue.Formatted
            }
          />
        </FormatPickerContainer>
      ) : null,
    [datasourceId, isOriginalTimeColumn],
  );

  return datasourceId ? (
    <span>
      <Popover
        trigger="click"
        content={overlayContent}
        placement="bottomLeft"
        arrow={{ pointAtCenter: true }}
      >
        <Icons.SettingOutlined
          iconSize="m"
          iconColor={theme.colors.grayscale.light1}
          css={{ marginRight: `${theme.sizeUnit}px` }}
          onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
        />
      </Popover>
      {columnName}
    </span>
  ) : (
    <span>{columnName}</span>
  );
};

export const useFilteredTableData = (
  filterText: string,
  data?: Record<string, any>[],
) => {
  const rowsAsStrings = useMemo(
    () =>
      data?.map((row: Record<string, any>) =>
        Object.values(row).map(value =>
          value ? value.toString().toLowerCase() : t('N/A'),
        ),
      ) ?? [],
    [data],
  );

  return useMemo(() => {
    if (!data?.length) {
      return [];
    }
    return data.filter((_, index: number) =>
      rowsAsStrings[index].some(value =>
        value?.includes(filterText.toLowerCase()),
      ),
    );
  }, [data, filterText, rowsAsStrings]);
};

const timeFormatter = getTimeFormatter(TimeFormats.DATABASE_DATETIME);

export const useTableColumns = (
  colnames?: string[],
  coltypes?: GenericDataType[],
  data?: Record<string, any>[],
  datasourceId?: string,
  isVisible?: boolean,
  moreConfigs?: { [key: string]: Partial<Column> },
  allowHTML?: boolean,
) => {
  const [originalFormattedTimeColumns, setOriginalFormattedTimeColumns] =
    useState<string[]>(getTimeColumns(datasourceId));

  const onTimeColumnChange = (
    columnName: string,
    columnType: FormatPickerValue,
  ) => {
    if (!datasourceId) {
      return;
    }
    if (
      columnType === FormatPickerValue.Original &&
      !originalFormattedTimeColumns.includes(columnName)
    ) {
      const cols = getTimeColumns(datasourceId);
      cols.push(columnName);
      setTimeColumns(datasourceId, cols);
      setOriginalFormattedTimeColumns(cols);
    } else if (
      columnType === FormatPickerValue.Formatted &&
      originalFormattedTimeColumns.includes(columnName)
    ) {
      const cols = getTimeColumns(datasourceId);
      cols.splice(cols.indexOf(columnName), 1);
      setTimeColumns(datasourceId, cols);
      setOriginalFormattedTimeColumns(cols);
    }
  };

  useEffect(() => {
    if (isVisible) {
      setOriginalFormattedTimeColumns(getTimeColumns(datasourceId));
    }
  }, [datasourceId, isVisible]);

  return useMemo(
    () =>
      colnames && data?.length
        ? colnames
            .filter((column: string) => Object.keys(data[0]).includes(column))
            .map((key, index) => {
              const colType = coltypes?.[index];
              const firstValue = data[0][key];
              const originalFormattedTimeColumnIndex =
                colType === GenericDataType.Temporal
                  ? originalFormattedTimeColumns.indexOf(key)
                  : -1;
              const isOriginalTimeColumn =
                originalFormattedTimeColumns.includes(key);
              return {
                // react-table requires a non-empty id, therefore we introduce a fallback value in case the key is empty
                id: key || index,
                accessor: (row: Record<string, any>) => row[key],
                Header:
                  colType === GenericDataType.Temporal &&
                  typeof firstValue !== 'string' ? (
                    <DataTableTemporalHeaderCell
                      columnName={key}
                      datasourceId={datasourceId}
                      onTimeColumnChange={onTimeColumnChange}
                      isOriginalTimeColumn={isOriginalTimeColumn}
                    />
                  ) : (
                    key
                  ),
                Cell: ({ value }) => {
                  if (value === true) {
                    return Constants.BOOL_TRUE_DISPLAY;
                  }
                  if (value === false) {
                    return Constants.BOOL_FALSE_DISPLAY;
                  }
                  if (value === null) {
                    return <CellNull>{Constants.NULL_DISPLAY}</CellNull>;
                  }
                  if (
                    colType === GenericDataType.Temporal &&
                    originalFormattedTimeColumnIndex === -1 &&
                    typeof value === 'number'
                  ) {
                    return timeFormatter(value);
                  }
                  if (typeof value === 'string' && allowHTML) {
                    return safeHtmlSpan(value);
                  }
                  return String(value);
                },
                ...moreConfigs?.[key],
              } as Column;
            })
        : [],
    [
      colnames,
      data,
      coltypes,
      datasourceId,
      moreConfigs,
      originalFormattedTimeColumns,
    ],
  );
};
