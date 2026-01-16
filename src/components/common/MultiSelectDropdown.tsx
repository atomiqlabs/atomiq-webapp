import * as React from 'react';
import { Dropdown, Form } from 'react-bootstrap';

export interface MultiSelectOption {
  id: string;
  label: string;
  icon?: string;
}

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  allLabel: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
  show: boolean;
  onShowChange: (show: boolean) => void;
}

export function MultiSelectDropdown({
  id,
  label,
  allLabel,
  options,
  selectedValues,
  onToggle,
  onClear,
  show,
  onShowChange,
}: MultiSelectDropdownProps) {
  return (
    <Dropdown show={show} onToggle={onShowChange} autoClose="outside" className="multi-select-dropdown">
      <Dropdown.Toggle id={`${id}-dropdown`}>
        {selectedValues.length > 0 ? (
          <>
            <span className="sc-count">{selectedValues.length}</span>
            {label}
            {onClear && (
              <span
                className="clear-filter icon icon-circle-x-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              ></span>
            )}
          </>
        ) : (
          allLabel
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {options.map((option) => (
          <Dropdown.Item
            key={option.id}
            as="div"
            onClick={(e) => {
              e.preventDefault();
              onToggle(option.id);
            }}
          >
            <Form.Check
              type="checkbox"
              id={`${id}-${option.id}`}
              label={
                <span className="flex align-items-center">
                  {option.icon && (
                    <img src={option.icon} alt={option.label} className="chain-icon" />
                  )}
                  {option.label}
                </span>
              }
              checked={selectedValues.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}