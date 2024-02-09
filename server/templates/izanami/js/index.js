export function execute() {
    // feature information : ...
    let _context = JSON.parse(Host.inputString());

    // 
    Host.outputString(JSON.stringify({
        active: "true"
    }));

    return 0;
}