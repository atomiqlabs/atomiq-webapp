import { Card, ListGroup, Spinner } from 'react-bootstrap';
import * as React from 'react';
import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { Icon } from 'react-icons-kit';
import { ic_not_interested } from 'react-icons-kit/md/ic_not_interested';

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
    allData: any[]; // Store all loaded data
    maxPages: number;
    loading: boolean;
    hasMore: boolean;
  }>({
    page: 0,
    sortedBy: null,
    sortedDescending: false,
    allData: [],
    maxPages: 0,
    loading: false,
    hasMore: true,
  });

  const loading = props.loading || state.loading;
  const itemsPerPage = props.itemsPerPage || 10;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState((val) => {
      return { ...val, page: 0, allData: [], hasMore: true };
    });
  }, [props.getPage]);

  const loadNextPageRef = useRef<() => void>();

  loadNextPageRef.current = () => {
    if (state.loading || !state.hasMore) return;

    const maybePromise = props.getPage(state.page, itemsPerPage);

    if (maybePromise instanceof Promise) {
      setState((val) => {
        return { ...val, loading: true };
      });
      maybePromise.then((obj) => {
        setState((val) => {
          const newData = [...val.allData, ...obj.data];
          const hasMore = val.page + 1 < obj.maxPages;
          return {
            ...val,
            maxPages: obj.maxPages,
            allData: newData,
            loading: false,
            hasMore: hasMore,
            page: hasMore ? val.page + 1 : val.page,
          };
        });
      });
    } else {
      setState((val) => {
        const newData = [...val.allData, ...maybePromise.data];
        const hasMore = val.page + 1 < maybePromise.maxPages;
        return {
          ...val,
          maxPages: maybePromise.maxPages,
          allData: newData,
          hasMore: hasMore,
          page: hasMore ? val.page + 1 : val.page,
        };
      });
    }
  };

  const resetAndLoad = useCallback(() => {
    setState({
      page: 0,
      sortedBy: null,
      sortedDescending: false,
      allData: [],
      maxPages: 0,
      loading: false,
      hasMore: true,
    });
  }, []);

  if (props.refresh != null) props.refresh.current = resetAndLoad;

  // Load first page on mount, when getPage changes, or after reset
  useEffect(() => {
    if (state.allData.length === 0 && state.hasMore && !state.loading) {
      loadNextPageRef.current?.();
    }
  }, [props.getPage, state.allData.length, state.hasMore, state.loading]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || state.loading || !state.hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;

      // Load more when within 300px of bottom
      if (scrollBottom < 300) {
        loadNextPageRef.current?.();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [state.loading, state.hasMore]);

  const tbody = [];

  // Render all loaded data
  for (let i = 0; i < state.allData.length; i++) {
    const obj = state.allData[i];
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

  return (
    <div ref={containerRef}>
      <div className="position-relative">
        <Card className="bg-transparent border-0">
          <ListGroup variant="flush">{tbody}</ListGroup>
        </Card>
        {loading && (
          <div className="table-loading-pane d-flex align-items-center justify-content-center flex-row gap-3 mt-5 mb-5 text-white">
            <Spinner animation="border" role="status" style={{ width: '24px', height: '24px' }} />
            <span>Loading {state.allData.length > 0 ? 'more' : ''} Swaps...</span>
          </div>
        )}
      </div>
    </div>
  );
}
