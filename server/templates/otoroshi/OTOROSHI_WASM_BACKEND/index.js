export function execute() {
  const str = Host.inputString()
  const context = JSON.parse(str)

  let headers = { ...context.request.headers }
  headers["foo"] = "bar"

  const response = {
    headers,
    'Content-Type': "text/html",
    body: `<html lang="en">

            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            
            <body style="
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                height: 100vh;
                font-family: monospace;
            ">
                <h1>This HTML comes from the Wasmo plugin</h1>
                <img src="https://maif.github.io/wasmo/wasmo.png" style="
                width: 200;
            ">
            
            </body>
            </html>`,
    status: 200
  }

  Host.outputString(JSON.stringify(response))

  return 0
}