import * as React from 'react';
import { Col, Row } from 'react-bootstrap';
import { ArrayDataPaginatedList } from '../list/ArrayDataPaginatedList';
import { ISwap } from '@atomiqlabs/sdk';
import { TransactionEntry } from '../history/TransactionEntry';

interface TransactionsTableProps {
  data: ISwap[];
  itemsPerPage?: number;
}

export function TransactionsTable({ data, itemsPerPage = 100 }: TransactionsTableProps) {
  return (
    <div className="transactions-table">
      <div className="transactions-table__head">
        <Row className="history-entry gx-1 gy-1">
          <Col md={4} sm={12} className="is-token">
            From
          </Col>
          <Col md={3} sm={12} className="is-token">
            To
          </Col>
          <Col md={1} sm={12} className="is-value is-right">
            Value
          </Col>
          <Col md={2} sm={12} className="d-flex text-end flex-column is-date is-right">
            Date
          </Col>
          <Col md={1} sm={12} className="d-flex text-end flex-column is-status">
            Status
          </Col>
        </Row>
      </div>
      <ArrayDataPaginatedList<ISwap>
        renderer={(row) => <TransactionEntry swap={row} />}
        data={data}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}
