import {MutableRefObject, useCallback} from "react";
import * as React from "react";
import {PaginatedList} from "./PaginatedList";

export function ArrayDataPaginatedList<T>(props: {
  renderer: (row: T) => string | JSX.Element;
  className?: any;
  itemsPerPage?: number;
  numPageButtons?: number;

  data?: T[];
  loading?: boolean;
  refreshFunc?: MutableRefObject<() => void>;
}) {
  const pageCbk = useCallback(
    async (page: number, pageSize: number) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });

      return {
        data: props.data.slice(page * pageSize, (page + 1) * pageSize),
        maxPages: Math.ceil(props.data.length / pageSize),
      };
    },
    [props.data]
  );

  return <PaginatedList<T> getPage={pageCbk} refresh={props.refreshFunc} {...props} />;
}
