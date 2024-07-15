function execute() {
    const name = Host.inputString()
    Host.outputString(`Hello, ${name}`)
}

module.exports = { execute }