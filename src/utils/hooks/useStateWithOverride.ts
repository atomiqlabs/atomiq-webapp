import {Dispatch, SetStateAction, useState} from "react";


export function useStateWithOverride<S>(defaultValue: S, override?: S): [S | undefined, Dispatch<SetStateAction<S | undefined>>] {
    const [value, setValue] = useState<S>(defaultValue);
    return [override ?? value, setValue];
}
