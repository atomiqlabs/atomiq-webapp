import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef } from 'react';
import { PaginatedList } from './PaginatedList';
export function BackendDataPaginatedList(props) {
    const abortSignal = useRef(null);
    const sortedData = useRef(null);
    const tableRefreshRef = useRef();
    if (props.refreshFunc != null)
        props.refreshFunc.current = () => {
            sortedData.current = null;
            if (tableRefreshRef.current != null)
                tableRefreshRef.current();
        };
    useEffect(() => {
        return () => {
            if (abortSignal.current != null) {
                abortSignal.current.abort();
                abortSignal.current = null;
            }
        };
    }, []);
    const memoizedGetter = useCallback(async (page, pageSize) => {
        if (sortedData.current == null ||
            sortedData.current.additionalData !== props.additionalData) {
            sortedData.current = {
                pages: [],
                endTime: null,
                last: false,
                additionalData: props.additionalData,
            };
        }
        if (sortedData.current.pages[page] != null)
            return {
                data: sortedData.current.pages[page],
                maxPages: sortedData.current.last
                    ? sortedData.current.pages.length
                    : sortedData.current.pages.length + 1,
            };
        if (abortSignal.current != null) {
            abortSignal.current.abort();
            abortSignal.current = null;
        }
        const _abortSignal = new AbortController();
        abortSignal.current = _abortSignal;
        try {
            const params = {
                limit: props.itemsPerPage || 10,
            };
            if (sortedData.current.endTime != null)
                params.endTime = sortedData.current.endTime;
            if (props.additionalData != null) {
                for (let key in props.additionalData) {
                    params[key] = props.additionalData[key];
                }
            }
            const httpResponse = await fetch(props.endpoint +
                '?' +
                Object.keys(params)
                    .map((e) => e + '=' + encodeURIComponent('' + params[e]))
                    .join('&'), {
                signal: _abortSignal.signal,
            });
            if (httpResponse == null || httpResponse.status !== 200) {
                throw new Error('Backend get response code not 200');
            }
            const obj = await httpResponse.json();
            const data = obj.data;
            if (props.dataPostProcessor != null) {
                await props.dataPostProcessor(data);
            }
            sortedData.current.last = obj.last;
            sortedData.current.endTime = obj.last ? null : obj.endTime;
            sortedData.current.pages[page] = data;
            return {
                data: sortedData.current.pages[page],
                maxPages: sortedData.current.last
                    ? sortedData.current.pages.length
                    : sortedData.current.pages.length + 1,
            };
        }
        catch (e) {
            console.error(e);
        }
        return {
            data: [],
            maxPages: 1,
        };
    }, [props.endpoint, props.additionalData, props.dataPostProcessor]);
    return _jsx(PaginatedList, { getPage: memoizedGetter, refresh: tableRefreshRef, ...props });
}
