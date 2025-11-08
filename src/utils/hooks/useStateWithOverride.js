import { useState } from 'react';
export function useStateWithOverride(defaultValue, override) {
    const [value, setValue] = useState(defaultValue);
    return [override ?? value, setValue];
}
