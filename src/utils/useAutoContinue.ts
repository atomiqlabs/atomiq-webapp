import {useEffect, useState} from "react";


export function useAutoContinue() {

    const [autoContinue, setAutoContinue] = useState<boolean>(false);

    useEffect(() => {
        const config = window.localStorage.getItem("crossLightning-autoContinue");
        setAutoContinue(config==null ? false : config==="true");
    }, []);

    const setAndSaveAutoContinue = (value: boolean) => {
        setAutoContinue(value);
        window.localStorage.setItem("crossLightning-autoContinue", ""+value);
    };

    return {autoContinue, setAutoContinue: setAndSaveAutoContinue};

}