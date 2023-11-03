use futures_util::FutureExt;
use rust_socketio::{
    asynchronous::{Client, ClientBuilder},
    Payload,
};

#[derive(PartialEq, Clone, Copy)]
pub enum BuildResult {
    Success,
    Failed,
    InProgress,
}

static mut COMMUNICATION_ENDED: BuildResult = BuildResult::InProgress;

fn strip_trailing_newline(input: &str) -> String {
    input
        .replace("\"", "")
        .replace("\\n", "")
        .replace("\\", "")
        .replace("\"n", "")
        .replace("\"", "")
}

pub async fn ws_listen(url: &String, channel: &String) -> BuildResult {
    crate::logger::loading(format!("<yellow>Listening</> websocket from {}", url));

    let callback = |payload: Payload, _: Client| {
        async move {
            let message = match payload {
                Payload::String(str) => str,
                Payload::Binary(bin_data) => String::from_utf8(bin_data.to_vec()).unwrap(),
            };

            crate::logger::indent_println(format!("{}", strip_trailing_newline(&message)));
            if message.contains("You can now use the generated wasm") {
                unsafe {
                    COMMUNICATION_ENDED = BuildResult::Success;
                }
            } else if message.contains("ERROR") {
                unsafe {
                    COMMUNICATION_ENDED = BuildResult::Failed;
                }
            }
        }
        .boxed()
    };

    // get a socket that is connected to the admin namespace
    let socket = ClientBuilder::new(url)
        // .namespace("/admin")
        .on(channel.as_str(), callback)
        .on("error", |err, _| {
            async move {
                unsafe {
                    if COMMUNICATION_ENDED == BuildResult::InProgress {
                        crate::logger::error(format!("{:#?}", err));
                    }

                    COMMUNICATION_ENDED = BuildResult::Failed;
                }
            }
            .boxed()
        })
        .connect()
        .await
        .expect("Connection failed");

    loop {
        unsafe {
            if COMMUNICATION_ENDED != BuildResult::InProgress {
                socket.disconnect().await.expect("Disconnect failed");
                break;
            }
        }
    }

    unsafe { COMMUNICATION_ENDED }
}
