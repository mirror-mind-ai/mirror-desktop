use serde::Serialize;
use serde_json::Value;

pub const MAX_STEERING_CHARS: usize = 16_384;
pub const MAX_STEERING_REQUEST_ID_CHARS: usize = 256;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RpcCommandResponse {
    pub id: String,
    pub command: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RpcObservation {
    Settled,
    Response(RpcCommandResponse),
    Other,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PromptCommand<'a> {
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'static str,
    message: &'a str,
}

#[derive(Serialize)]
struct SteeringModeCommand<'a> {
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'static str,
    mode: &'static str,
}

pub fn validate_request_id(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > MAX_STEERING_REQUEST_ID_CHARS
        || !value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.' | ':')
        })
    {
        return Err("Steering request id is invalid.".to_string());
    }
    Ok(())
}

pub fn validate_steering_text(value: &str) -> Result<&str, String> {
    let text = value.trim();
    if text.is_empty() || text.chars().count() > MAX_STEERING_CHARS {
        return Err("Steering text is outside the bounded range.".to_string());
    }
    if text.starts_with('/') {
        return Err(
            "Steering commands, templates and skills are outside this delivery boundary."
                .to_string(),
        );
    }
    Ok(text)
}

pub fn prompt_line(id: &str, message: &str) -> Result<String, String> {
    validate_request_id(id)?;
    if message.trim().is_empty() {
        return Err("Pi invocation requires a non-empty prompt packet.".to_string());
    }
    serde_json::to_string(&PromptCommand {
        id,
        kind: "prompt",
        message,
    })
    .map(|line| format!("{}\n", line))
    .map_err(|error| error.to_string())
}

pub fn steer_line(id: &str, message: &str) -> Result<String, String> {
    validate_request_id(id)?;
    let message = validate_steering_text(message)?;
    serde_json::to_string(&PromptCommand {
        id,
        kind: "steer",
        message,
    })
    .map(|line| format!("{}\n", line))
    .map_err(|error| error.to_string())
}

pub fn one_at_a_time_line(run_id: &str) -> Result<String, String> {
    let id = format!("steering-mode-{}", run_id);
    validate_request_id(&id)?;
    serde_json::to_string(&SteeringModeCommand {
        id: &id,
        kind: "set_steering_mode",
        mode: "one-at-a-time",
    })
    .map(|line| format!("{}\n", line))
    .map_err(|error| error.to_string())
}

pub fn observe_line(line: &str) -> RpcObservation {
    let Ok(value) = serde_json::from_str::<Value>(line.trim_end_matches(['\r', '\n'])) else {
        return RpcObservation::Other;
    };
    if value.get("type").and_then(Value::as_str) == Some("agent_settled") {
        return RpcObservation::Settled;
    }
    if value.get("type").and_then(Value::as_str) != Some("response") {
        return RpcObservation::Other;
    }
    let (Some(id), Some(command), Some(success)) = (
        value.get("id").and_then(Value::as_str),
        value.get("command").and_then(Value::as_str),
        value.get("success").and_then(Value::as_bool),
    ) else {
        return RpcObservation::Other;
    };
    RpcObservation::Response(RpcCommandResponse {
        id: id.to_string(),
        command: command.to_string(),
        success,
        error: value
            .get("error")
            .and_then(Value::as_str)
            .map(str::to_string),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        observe_line, one_at_a_time_line, prompt_line, steer_line, RpcCommandResponse,
        RpcObservation,
    };

    #[test]
    fn encodes_lf_delimited_prompt_and_steering_commands() {
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(
                prompt_line("prompt-run-1", "Begin").unwrap().trim()
            )
            .unwrap(),
            serde_json::json!({"id":"prompt-run-1","type":"prompt","message":"Begin"}),
        );
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(
                steer_line("steer-run-1-1", "Change course").unwrap().trim()
            )
            .unwrap(),
            serde_json::json!({"id":"steer-run-1-1","type":"steer","message":"Change course"}),
        );
        assert!(prompt_line("prompt-run-1", "Begin")
            .unwrap()
            .ends_with('\n'));
    }

    #[test]
    fn fixes_one_at_a_time_order_and_rejects_command_like_or_unbounded_input() {
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(one_at_a_time_line("run-1").unwrap().trim())
                .unwrap(),
            serde_json::json!({"id":"steering-mode-run-1","type":"set_steering_mode","mode":"one-at-a-time"}),
        );
        assert!(steer_line("steer-1", "/skill:unsafe").is_err());
        assert!(steer_line("steer-1", &"a".repeat(16_385)).is_err());
        assert!(steer_line("bad id", "valid").is_err());
    }

    #[test]
    fn distinguishes_acceptance_from_full_agent_settlement() {
        assert_eq!(
            observe_line(r#"{"id":"steer-1","type":"response","command":"steer","success":true}"#),
            RpcObservation::Response(RpcCommandResponse {
                id: "steer-1".to_string(),
                command: "steer".to_string(),
                success: true,
                error: None,
            })
        );
        assert_eq!(
            observe_line(r#"{"type":"agent_end","willRetry":false}"#),
            RpcObservation::Other
        );
        assert_eq!(
            observe_line(r#"{"type":"agent_settled"}"#),
            RpcObservation::Settled
        );
    }
}
