use futures_util::StreamExt;
use std::fmt;
use tokio::io::AsyncReadExt;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

#[derive(PartialEq, Clone, Copy, Debug)]
pub enum BuildResult {
    Success,
    Failed,
    InProgress,
}

impl fmt::Display for BuildResult {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

static mut COMMUNICATION_ENDED: BuildResult = BuildResult::InProgress;

fn strip_trailing_newline(input: &str) -> String {
    input
        .replace("\"", "")
        .replace("\\n", "")
        .replace("\\", "")
        .replace("\"n", "")
        .replace("\"", "")
        .replace("[BUILD]", "")
}

async fn read_stdin(tx: futures_channel::mpsc::UnboundedSender<Message>) {
    let mut stdin = tokio::io::stdin();
    loop {
        let mut buf = vec![0; 1024];
        let n = match stdin.read(&mut buf).await {
            Err(_) | Ok(0) => break,
            Ok(n) => n,
        };
        buf.truncate(n);
        tx.unbounded_send(Message::binary(buf)).unwrap();
    }
}

pub async fn ws_listen(url: &String, channel: &String) -> BuildResult {
    crate::logger::loading(format!("<yellow>Listening</> websocket from {}", url));

    let (stdin_tx, _) = futures_channel::mpsc::unbounded();
    tokio::spawn(read_stdin(stdin_tx));

    let (ws_stream, _) = connect_async(format!(
        "{}/{}",
        url.replace("http://", "ws://")
            .replace("https://", "wss://"),
        channel
    ))
    .await
    .expect("Failed to connect");

    let (_write, mut read) = ws_stream.split();

    let fut = (&mut read).for_each(|message| async {
        let data = message.unwrap().into_data();
        let message = String::from_utf8(data).unwrap();

        crate::logger::indent_println(format!("{}", strip_trailing_newline(&message)));

        if message.contains("RELEASE") {
            unsafe {
                COMMUNICATION_ENDED = BuildResult::Success;
            }
        } else if message.contains("ERROR") {
            unsafe {
                COMMUNICATION_ENDED = BuildResult::Failed;
            }
        }
    });

    fut.await;

    unsafe { COMMUNICATION_ENDED }
}
