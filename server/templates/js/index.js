function greet() {
    const name = Host.inputString()
    Host.outputString(`Hello, ${name}`)
}

module.exports = { greet }