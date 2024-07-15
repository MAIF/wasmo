export declare var Host: any;

export function execute() {
    let name = Host.inputString() as String;

    Host.outputString(`Hello, ${name}`);

    return 0;
}