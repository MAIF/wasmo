import { IzanamiResponse } from './types';

export declare var Host: any;

export function execute() {
    const result: IzanamiResponse = {
        active: true
    };
    
    Host.outputString(JSON.stringify(result));

    return 0;
}