import {ButtonGroup, Card, ListGroup, Spinner} from "react-bootstrap";
import * as React from "react";
import {MutableRefObject, useCallback, useEffect, useRef} from "react";
import Button from "react-bootstrap/Button";

import { Icon } from "react-icons-kit";
import {angleRight} from 'react-icons-kit/fa/angleRight';
import {angleLeft} from 'react-icons-kit/fa/angleLeft';
import {angleDoubleRight} from 'react-icons-kit/fa/angleDoubleRight';
import {angleDoubleLeft} from 'react-icons-kit/fa/angleDoubleLeft';
import {ic_not_interested} from 'react-icons-kit/md/ic_not_interested';

function PaginationButton(props : {
    page: number,
    onClick: (page: number) => void,
    currentPage: number,
    disabled: boolean
}) {

    return (
        <Button onClick={() => {props.onClick(props.page)}} key={"page-"+props.page} variant={props.currentPage===props.page ? "light" : "outline-light"} disabled={props.disabled} className={"px-3"} size="lg">{props.page+1}</Button>
    );
}

export type TableColumn<T> = {
    renderer?: (row: T) => string | JSX.Element,
};

export type GetPageResponse = {
    data: any[],
    maxPages: number
}

export function SingleColumnTable<T>(props : {
    className?: any,
    getPage: (page: number, pageSize: number) => (Promise<GetPageResponse> | GetPageResponse),
    itemsPerPage?: number,
    column: TableColumn<T>,
    numPageButtons?: number,
    loading?: boolean,
    getTdProps?: (row: any, column: string) => any,
    refresh?: MutableRefObject<() => void>
}) {

    const [state, setState] = React.useState<{
        sortedBy: string,
        sortedDescending: boolean,
        page: number,
        pageData: any[],
        maxPages: number,
        loading: boolean
    }>({
        page: 0,
        sortedBy: null,
        sortedDescending: false,
        pageData: [],
        maxPages: 0,
        loading: false
    });

    const loading = props.loading || state.loading;

    const itemsPerPage = props.itemsPerPage || 10;

    useEffect(() => {
        setState((val) => {
            return {...val, page: 0};
        });
    }, [props.getPage]);

    const renderFunc = () => {
        console.log("Table re-render: ", [state.page, props.getPage]);

        const maybePromise = props.getPage(state.page, itemsPerPage);

        if(maybePromise instanceof Promise) {
            setState((val) => {
                return {...val, loading: true};
            });
            maybePromise.then((obj) => {
                setState((val) => {
                    return {...val, maxPages: obj.maxPages, pageData: obj.data, loading: false};
                });
            });
        } else {
            setState((val) => {
                return {...val, maxPages: maybePromise.maxPages, pageData: maybePromise.data};
            });
        }
    };

    if(props.refresh!=null) props.refresh.current = renderFunc;

    useEffect(renderFunc, [state.page, props.getPage]);

    const tbody = [];

    for(let i=0;i<itemsPerPage;i++) {
        const obj = state.pageData[i];
        if(obj!=null) tbody.push((
            <ListGroup.Item className="bg-dark bg-opacity-25 border-light border-opacity-25 text-white" key={i.toString()}>{props.column.renderer(obj)}</ListGroup.Item>
        ));
    }

    if(tbody.length===0) {
        tbody.push((
            <ListGroup.Item key={"0"} className="bg-dark bg-opacity-25 border-light border-opacity-25 text-white">
                <div className="d-flex align-items-center justify-content-center text-light text-opacity-75">
                    <Icon size={24} className="pb-1 me-2" icon={ic_not_interested}/>
                    <h4 className="my-3">No data</h4>
                </div>
            </ListGroup.Item>
        ));
    }

    const numPageButtons = props.numPageButtons || 5;

    const buttons = [];

    const numPages = state.maxPages;

    const handlePageClick = (page: number) => {
        if(page<0) return;
        if(page>numPages-1) return;
        setState((val) => {return {...val, page: page}})
    };

    if(numPages<=numPageButtons) {
        for(let i=0;i<numPages;i++) {
            buttons.push((
                <PaginationButton page={i} key={"page"+i} currentPage={state.page} onClick={handlePageClick} disabled={loading}/>
            ));
        }
    } else if(state.page<(numPageButtons/2)) {
        for(let i=0;i<(numPageButtons/2)+1;i++) {
            buttons.push((
                <PaginationButton page={i} key={"page"+i} currentPage={state.page} onClick={handlePageClick} disabled={loading}/>
            ));
        }
        buttons.push((
            <Button key={"ellipsis2"} variant="outline-light px-2" size="lg">...</Button>
        ));
    } else if((numPages-state.page-1)<(numPageButtons/2)) {
        for(let i=0;i<(numPageButtons/2)+1;i++) {
            buttons.push((
                <PaginationButton page={numPages-i-1} key={"page"+(numPages-i-1)} currentPage={state.page} onClick={handlePageClick} disabled={loading}/>
            ));
        }
        buttons.push((
            <Button key={"ellipsis1"} variant="outline-light px-2" size="lg">...</Button>
        ));
        buttons.reverse();
    } else {
        buttons.push((
            <Button key={"ellipsis1"} variant="outline-light px-2" size="lg">...</Button>
        ));
        for(let i=state.page-1;i<=state.page+1;i++) {
            buttons.push((
                <PaginationButton page={i} key={"page"+i}  currentPage={state.page} onClick={handlePageClick} disabled={loading}/>
            ));
        }
        buttons.push((
            <Button key={"ellipsis2"} variant="outline-light px-2" size="lg">...</Button>
        ));
    }

    return (
        <div>
            <div className="position-relative">
                <Card className="bg-transparent border-0">
                    <ListGroup variant="flush">
                        {tbody}
                    </ListGroup>
                </Card>
                {loading ? (
                    <div className="table-loading-pane d-flex align-items-center justify-content-center flex-column">
                    <Spinner animation="border" role="status"/>
                    <span>Loading...</span>
                    </div>
                ) : ""}
            </div>
            <div className="d-flex align-items-center justify-content-center mt-2 mb-4">
                <ButtonGroup className="bg-dark bg-opacity-25" aria-label="Second group">
                    <Button variant="outline-light px-2" onClick={() => handlePageClick(0)} size="lg" disabled={loading}><Icon size={20} style={{marginTop: "-8px"}} icon={angleDoubleLeft}/></Button>
                    <Button variant="outline-light px-2" onClick={() => handlePageClick(state.page-1)} size="lg" disabled={loading}><Icon size={20} style={{marginTop: "-8px"}} icon={angleLeft}/></Button>
                    {buttons}
                    <Button variant="outline-light px-2" onClick={() => handlePageClick(state.page+1)} size="lg" disabled={loading}><Icon size={20} style={{marginTop: "-8px"}} icon={angleRight}/></Button>
                    <Button variant="outline-light px-2" onClick={() => handlePageClick(numPages-1)} size="lg" disabled={loading}><Icon size={20} style={{marginTop: "-8px"}} icon={angleDoubleRight}/></Button>
                </ButtonGroup>
            </div>
        </div>
    );

}

export function SingleColumnStaticTable<T>(props: {
    className?: any,
    itemsPerPage?: number,
    column: TableColumn<T>,
    numPageButtons?: number,

    data?: T[],
    loading?: boolean
    refreshFunc?: MutableRefObject<() => void>
}) {

    const pageCbk = useCallback(async (page: number, pageSize: number) => {

        await new Promise((resolve) => {setTimeout(resolve, 250)});

        return {
            data: props.data.slice(page*pageSize, (page+1)*pageSize),
            maxPages: Math.ceil(props.data.length/pageSize)
        };

    }, [props.data]);

    return (
        <SingleColumnTable<T> getPage={pageCbk} refresh={props.refreshFunc} {...props}/>
    )
}
