import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from "react";
import { PaginatedList } from "./PaginatedList";
export function ArrayDataPaginatedList(props) {
    const pageCbk = useCallback(async (page, pageSize) => {
        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
        return {
            data: props.data.slice(page * pageSize, (page + 1) * pageSize),
            maxPages: Math.ceil(props.data.length / pageSize),
        };
    }, [props.data]);
    return _jsx(PaginatedList, { getPage: pageCbk, refresh: props.refreshFunc, ...props });
}
