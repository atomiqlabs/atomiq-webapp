import {useEffect, useState} from "react";


export function useAutoClaim() {

    const [autoClaim, setAutoClaim] = useState<boolean>(false);

    useEffect(() => {
        const config = window.localStorage.getItem("crossLightning-autoClaim");
        setAutoClaim(config==null ? false : config==="true");
    }, []);

    const setAndSaveAutoClaim = (value: boolean) => {
        setAutoClaim(value);
        window.localStorage.setItem("crossLightning-autoClaim", ""+value);
    };

    return {autoClaim, setAutoClaim: setAndSaveAutoClaim};

}