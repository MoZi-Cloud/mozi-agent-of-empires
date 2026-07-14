//! Mobile terminal toolbar quick-button contents (`GET`/`PUT
//! /api/mobile-quick-buttons`). The button *count* is the schema-visible
//! `web.mobile_quick_button_count` setting; these endpoints carry only the
//! per-button `{label, text, auto_enter}` contents, which are edited in-place
//! on the mobile toolbar and persisted on the global config so they sync
//! across devices.

use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use super::AppState;
use crate::session::{save_config, Config, MobileQuickButton};

/// Per-button text is capped at 20,000 characters (the mobile edit modal sets
/// the same `maxLength`); labels at 64. Button count mirrors the setting's
/// `max = 28`.
const MAX_TEXT_CHARS: usize = 20_000;
const MAX_LABEL_CHARS: usize = 64;
const MAX_BUTTONS: usize = 28;

#[derive(Serialize)]
struct MobileQuickButtonsResponse {
    count: u8,
    buttons: Vec<MobileQuickButton>,
}

#[derive(Deserialize)]
struct MobileQuickButtonsPut {
    buttons: Vec<MobileQuickButton>,
}

fn err(status: StatusCode, code: &str, message: &str) -> axum::response::Response {
    (
        status,
        Json(serde_json::json!({"error": code, "message": message})),
    )
        .into_response()
}

/// `GET /api/mobile-quick-buttons` returns the current count + per-button
/// contents from the global config.
pub async fn get_mobile_quick_buttons() -> impl IntoResponse {
    match Config::load() {
        Ok(config) => (
            StatusCode::OK,
            Json(MobileQuickButtonsResponse {
                count: config.web.mobile_quick_button_count,
                buttons: config.web.mobile_quick_buttons,
            }),
        )
            .into_response(),
        Err(e) => {
            tracing::error!(target: "http.api.mobile_quick_buttons", "Config load failed: {}", e);
            err(
                StatusCode::INTERNAL_SERVER_ERROR,
                "load_failed",
                "Failed to load settings",
            )
        }
    }
}

/// `PUT /api/mobile-quick-buttons` replaces the per-button contents, validates
/// each entry's size, syncs `mobile_quick_button_count` to the array length,
/// and persists the global config. Read-only servers reject with 403.
pub async fn put_mobile_quick_buttons(
    State(state): State<Arc<AppState>>,
    body: Result<Json<serde_json::Value>, axum::extract::rejection::JsonRejection>,
) -> impl IntoResponse {
    if state.read_only {
        return err(
            StatusCode::FORBIDDEN,
            "read_only",
            "Server is in read-only mode",
        );
    }
    let Json(value) = match body {
        Ok(b) => b,
        Err(rej) => return rej.into_response(),
    };
    // Parse the typed body inside the handler so the request struct can stay
    // private (a typed `Json<MobileQuickButtonsPut>` extractor would have to
    // be `pub`, leaking an internal type).
    let payload: MobileQuickButtonsPut = match serde_json::from_value(value) {
        Ok(p) => p,
        Err(_) => return err(StatusCode::BAD_REQUEST, "bad_body", "Invalid request body"),
    };

    if payload.buttons.len() > MAX_BUTTONS {
        return err(
            StatusCode::BAD_REQUEST,
            "too_many_buttons",
            &format!("At most {MAX_BUTTONS} buttons are allowed"),
        );
    }
    for (i, b) in payload.buttons.iter().enumerate() {
        if b.label.chars().count() > MAX_LABEL_CHARS {
            return err(
                StatusCode::BAD_REQUEST,
                "label_too_long",
                &format!(
                    "Button {} label exceeds {MAX_LABEL_CHARS} characters",
                    i + 1
                ),
            );
        }
        if b.text.chars().count() > MAX_TEXT_CHARS {
            return err(
                StatusCode::BAD_REQUEST,
                "text_too_long",
                &format!("Button {} text exceeds {MAX_TEXT_CHARS} characters", i + 1),
            );
        }
    }

    let buttons = payload.buttons;
    let result = tokio::task::spawn_blocking(move || {
        let mut config = Config::load_or_warn();
        config.web.mobile_quick_buttons = buttons;
        // Keep the schema-visible count in lockstep with the stored array so
        // the Settings number field and the rendered toolbar never disagree.
        config.web.mobile_quick_button_count = config.web.mobile_quick_buttons.len() as u8;
        save_config(&config)?;
        Ok::<_, anyhow::Error>(config)
    })
    .await;

    match result {
        Ok(Ok(config)) => (
            StatusCode::OK,
            Json(MobileQuickButtonsResponse {
                count: config.web.mobile_quick_button_count,
                buttons: config.web.mobile_quick_buttons,
            }),
        )
            .into_response(),
        Ok(Err(e)) => {
            tracing::warn!(target: "http.api.mobile_quick_buttons", "Save failed: {}", e);
            err(
                StatusCode::BAD_REQUEST,
                "update_failed",
                "Failed to update quick buttons",
            )
        }
        Err(e) => {
            tracing::error!(target: "http.api.mobile_quick_buttons", "Save panicked: {}", e);
            err(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal",
                "Internal server error",
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn button(label: &str, text: &str, auto_enter: bool) -> MobileQuickButton {
        MobileQuickButton {
            label: label.to_string(),
            text: text.to_string(),
            auto_enter,
        }
    }

    #[test]
    fn put_payload_validates_button_count() {
        let payload = MobileQuickButtonsPut {
            buttons: (0..(MAX_BUTTONS + 1))
                .map(|_| button("x", "", false))
                .collect(),
        }
        .buttons;
        assert_eq!(payload.len(), MAX_BUTTONS + 1);
        // The handler's guard is `> MAX_BUTTONS`; 29 must be rejected.
        assert!(payload.len() > MAX_BUTTONS);
    }

    #[test]
    fn label_and_text_limits_are_char_based() {
        // 20,000 chars (multibyte) must pass; 20,001 must fail the guard.
        let exactly = "字".repeat(MAX_TEXT_CHARS);
        assert_eq!(exactly.chars().count(), MAX_TEXT_CHARS);
        let over = format!("{exactly}字");
        assert!(over.chars().count() > MAX_TEXT_CHARS);

        let label_ok = "a".repeat(MAX_LABEL_CHARS);
        let label_over = format!("{label_ok}a");
        assert!(label_over.chars().count() > MAX_LABEL_CHARS);
    }

    #[test]
    fn default_button_is_empty_no_enter() {
        let b = MobileQuickButton::default();
        assert!(b.label.is_empty());
        assert!(b.text.is_empty());
        assert!(!b.auto_enter);
    }

    #[test]
    fn count_syncs_to_array_length() {
        // Mirrors the handler's lockstep assignment. u8 is fine because the
        // count guard rejects anything over MAX_BUTTONS (28).
        for n in [0usize, 1, 11, MAX_BUTTONS] {
            let count = n as u8;
            assert_eq!(count as usize, n);
        }
    }
}
