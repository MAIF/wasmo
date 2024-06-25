/*
  The "matcher" is a tool that allows filtering a route during the routing phase. 
  In practice, you can create two routes that are identical from a frontend perspective 
  but have different "route matchers." 
  These matchers will select one route or the other based on a specific criterion.
*/
export function execute() {
    let context = JSON.parse(Host.inputString())

    Host.outputString(JSON.stringify({
        result: context.request.headers.foo === "bar"
    }))

    return 0
}