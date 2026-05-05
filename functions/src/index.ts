import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 5});

export {searchProperty} from "./searchProperty";
export {getAucklandBinDates} from "./getAucklandBinDates";
