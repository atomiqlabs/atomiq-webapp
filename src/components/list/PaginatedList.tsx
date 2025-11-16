import { ButtonGroup, Card, ListGroup, Spinner } from 'react-bootstrap';
import * as React from 'react';
import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';

import { Icon } from 'react-icons-kit';
import { angleRight } from 'react-icons-kit/fa/angleRight';
import { angleLeft } from 'react-icons-kit/fa/angleLeft';
import { angleDoubleRight } from 'react-icons-kit/fa/angleDoubleRight';
import { angleDoubleLeft } from 'react-icons-kit/fa/angleDoubleLeft';
import { ic_not_interested } from 'react-icons-kit/md/ic_not_interested';
import { BaseButton } from '../common/BaseButton';

function PaginationButton(props: {
  page: number;
  onClick: (page: number) => void;
  currentPage: number;
  disabled: boolean;
}) {
  return (
    <BaseButton
      onClick={() => {
        props.onClick(props.page);
      }}
      key={'page-' + props.page}
      variant={props.currentPage === props.page ? 'secondary' : 'clear'}
      disabled={props.disabled}
      className={'px-3'}
    >
      {props.page + 1}
    </BaseButton>
  );
}

export type GetPageResponse = {
  data: any[];
  maxPages: number;
};

export function PaginatedList<T>(props: {
  renderer: (row: T) => string | JSX.Element;
  className?: any;
  getPage: (page: number, pageSize: number) => Promise<GetPageResponse> | GetPageResponse;
  itemsPerPage?: number;
  numPageButtons?: number;
  loading?: boolean;
  getTdProps?: (row: any, column: string) => any;
  refresh?: MutableRefObject<() => void>;
}) {
  const [state, setState] = React.useState<{
    sortedBy: string;
    sortedDescending: boolean;
    page: number;
    pageData: any[];
    maxPages: number;
    loading: boolean;
  }>({
    page: 0,
    sortedBy: null,
    sortedDescending: false,
    pageData: [],
    maxPages: 0,
    loading: false,
  });

  const loading = props.loading || state.loading;

  const itemsPerPage = props.itemsPerPage || 10;

  useEffect(() => {
    setState((val) => {
      return { ...val, page: 0 };
    });
  }, [props.getPage]);

  const renderFunc = () => {
    const maybePromise = props.getPage(state.page, itemsPerPage);

    if (maybePromise instanceof Promise) {
      setState((val) => {
        return { ...val, loading: true };
      });
      maybePromise.then((obj) => {
        setState((val) => {
          return {
            ...val,
            maxPages: obj.maxPages,
            pageData: obj.data,
            loading: false,
          };
        });
      });
    } else {
      setState((val) => {
        return {
          ...val,
          maxPages: maybePromise.maxPages,
          pageData: maybePromise.data,
        };
      });
    }
  };

  if (props.refresh != null) props.refresh.current = renderFunc;

  useEffect(renderFunc, [state.page, props.getPage]);

  const tbody = [];

  for (let i = 0; i < itemsPerPage; i++) {
    const obj = state.pageData[i];
    if (obj != null)
      tbody.push(<ListGroup.Item key={i.toString()}>{props.renderer(obj)}</ListGroup.Item>);
  }

  if (tbody.length === 0 && !loading) {
    tbody.push(
      <ListGroup.Item key={'0'} className="bg-dark bg-opacity-25 text-white">
        <div className="d-flex align-items-center justify-content-center text-light text-opacity-75">
          <Icon size={24} className="pb-1 me-2" icon={ic_not_interested} />
          <h4 className="my-3">No data</h4>
        </div>
      </ListGroup.Item>
    );
  }

  const numPageButtons = props.numPageButtons || 5;

  const buttons = [];

  const numPages = state.maxPages;

  const handlePageClick = (page: number) => {
    if (page < 0) return;
    if (page > numPages - 1) return;
    setState((val) => {
      return { ...val, page: page };
    });
  };

  if (numPages <= numPageButtons) {
    for (let i = 0; i < numPages; i++) {
      buttons.push(
        <PaginationButton
          page={i}
          key={'page' + i}
          currentPage={state.page}
          onClick={handlePageClick}
          disabled={loading}
        />
      );
    }
  } else if (state.page < numPageButtons / 2) {
    for (let i = 0; i < numPageButtons / 2 + 1; i++) {
      buttons.push(
        <PaginationButton
          page={i}
          key={'page' + i}
          currentPage={state.page}
          onClick={handlePageClick}
          disabled={loading}
        />
      );
    }
    buttons.push(
      <BaseButton key={'ellipsis2'} variant="clear">
        ...
      </BaseButton>
    );
  } else if (numPages - state.page - 1 < numPageButtons / 2) {
    for (let i = 0; i < numPageButtons / 2 + 1; i++) {
      buttons.push(
        <PaginationButton
          page={numPages - i - 1}
          key={'page' + (numPages - i - 1)}
          currentPage={state.page}
          onClick={handlePageClick}
          disabled={loading}
        />
      );
    }
    buttons.push(
      <BaseButton key={'ellipsis1'} variant="clear">
        ...
      </BaseButton>
    );
    buttons.reverse();
  } else {
    buttons.push(
      <BaseButton key={'ellipsis1'} variant="clear">
        ...
      </BaseButton>
    );
    for (let i = state.page - 1; i <= state.page + 1; i++) {
      buttons.push(
        <PaginationButton
          page={i}
          key={'page' + i}
          currentPage={state.page}
          onClick={handlePageClick}
          disabled={loading}
        />
      );
    }
    buttons.push(
      <BaseButton key={'ellipsis2'} variant="clear">
        ...
      </BaseButton>
    );
  }

  return (
    <div>
      <div className="position-relative">
        <Card className="bg-transparent border-0">
          <ListGroup variant="flush">{tbody}</ListGroup>
        </Card>
        {loading ? (
          <div className="table-loading-pane d-flex align-items-center justify-content-center flex-row gap-3 mt-4">
            <Spinner animation="border" role="status" />
            <span>Loading Swaps...</span>
          </div>
        ) : (
          ''
        )}
      </div>
      {numPages > 1 && (
        <div className="d-flex align-items-center justify-content-center mt-5 mb-4">
          <ButtonGroup className="bg-dark bg-opacity-25" aria-label="Second group">
            <BaseButton variant="clear" onClick={() => handlePageClick(0)} disabled={loading}>
              <Icon size={20} style={{ marginTop: '-8px' }} icon={angleDoubleLeft} />
            </BaseButton>
            <BaseButton
              variant="clear"
              onClick={() => handlePageClick(state.page - 1)}
              disabled={loading}
            >
              <Icon size={20} style={{ marginTop: '-8px' }} icon={angleLeft} />
            </BaseButton>
            {buttons}
            <BaseButton
              variant="clear"
              onClick={() => handlePageClick(state.page + 1)}
              disabled={loading}
            >
              <Icon size={20} style={{ marginTop: '-8px' }} icon={angleRight} />
            </BaseButton>
            <BaseButton
              variant="clear"
              onClick={() => handlePageClick(numPages - 1)}
              disabled={loading}
            >
              <Icon size={20} style={{ marginTop: '-8px' }} icon={angleDoubleRight} />
            </BaseButton>
          </ButtonGroup>
        </div>
      )}
    </div>
  );
}
