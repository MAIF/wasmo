use std::net::TcpListener;

pub fn get_available_port() -> Option<u16> {
    (10000..12000)
        .find(|port| port_is_available(*port))
}

fn port_is_available(port: u16) -> bool {
    match TcpListener::bind(("0.0.0.0", port)) {
        Ok(_) => true,
        Err(_) => false,
    }
}