export function execute() {
    let context = JSON.parse(Host.inputString())

    if (context.request.headers["bar"] === "foo") {
        Host.outputString(JSON.stringify({
            error: false
        }))
    } else {
        Host.outputString(JSON.stringify({
            error: true,
            headers: {
                'Content-Type': 'text/plain'
            },
            status: 401,
            body: "you're not authorized"
        }))
    }

    return 0
}