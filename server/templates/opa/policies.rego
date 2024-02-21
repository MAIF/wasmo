package example

default can_access = false

can_access {
    input.foo == "bar"
}
