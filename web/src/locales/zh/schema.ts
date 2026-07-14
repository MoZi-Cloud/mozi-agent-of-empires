// 简体中文,`schema` 命名空间。覆盖后端 `GET /api/settings/schema` 下发的
// 字段标签/描述/下拉选项/分区徽标。键为稳定的 `${section}.${field}`;缺项
// 优雅回退为后端英文(见 useLocalizedSchema),所以部分翻译也不会破坏页面。
//
// en 不需要此命名空间:英文是 schema 的线上格式本身。
export interface ZhFieldEntry {
  // 覆盖 FieldDescriptor.label
  label?: string;
  // 覆盖 FieldDescriptor.description(对应 Rust 字段上方的 /// 文档注释)
  desc?: string;
  // 覆盖 select 控件 options[value].label(按选项 value 映射)
  options?: Record<string, string>;
}

export interface ZhSchemaCatalog {
  // 按后端 category 英文串映射到中文徽标
  categories: Record<string, string | undefined>;
  // 按 `${section}.${field}` 映射到字段级覆盖
  fields: Record<string, ZhFieldEntry | undefined>;
}

export const categories: Record<string, string | undefined> = {
  Acp: "结构化视图",
  Web: "网页",
  Diff: "差异对比",
  Logging: "日志",
  Sandbox: "沙盒",
  Session: "会话",
  Sound: "声音",
  "Status Hooks": "状态钩子",
  Telemetry: "遥测",
  Theme: "主题",
  Tmux: "Tmux",
  Updates: "更新",
  Worktree: "工作树",
  Agents: "智能体",
  Interaction: "交互",
};

// 字段级目录:每个核心 `#[setting(label=…, desc=…)]` 字段一条,键为稳定的
// `${section}.${field}`。共 118 条,覆盖 14 个分区。缺项由 useLocalizedSchema
// 优雅回退为后端英文,所以这里的完整性决定中文覆盖率,但遗漏不会破坏页面。
export const fields: Record<string, ZhFieldEntry | undefined> = {
  // ===== logging =====
  "logging.default_level": {
    label: "默认级别",
    desc: "应用于所有已知 target 根的基线级别。按 target 的覆盖优先。",
    options: { trace: "trace", debug: "debug", info: "info", warn: "warn", error: "error" },
  },
  "logging.file_path": {
    label: "文件路径（需重启）",
    desc: "日志文件位置。相对路径会基于应用数据目录解析；绝对路径原样使用。更改后需重启 aoe 生效。",
  },
  "logging.keep_count": { label: "保留数量（需重启）", desc: "保留多少个轮转文件（.1 到 .keep_count）。" },
  "logging.max_size_mib": { label: "最大大小 MiB（需重启）", desc: "轮转阈值，单位 MiB。rotation = never 时忽略。" },
  "logging.output": {
    label: "输出（需重启）",
    desc: "tracing 输出位置：file（默认）或 stdout。TUI / daemon 子进程 / runner 一律强制为 file。更改后需重启 aoe 生效。",
    options: { file: "file", stdout: "stdout" },
  },
  "logging.rotation": {
    label: "轮转（需重启）",
    desc: "size 在当前文件超过阈值时轮转；never 禁用轮转。更改后需重启 aoe。",
    options: { size: "size", never: "never" },
  },
  "logging.show_spans": {
    label: "显示 span 上下文（需重启）",
    desc: "开启后，每条日志行都会带上包裹它的 span 的名称与字段（例如来自每请求中间件的 `http_request{request_id=... method=GET path=...}`）。排查时便于跨异步边界用 grep 关联；但在空闲轮询端点上会比较嘈杂。默认关闭以保持日志可读。",
  },
  "logging.targets": {
    label: "按 target 覆盖",
    desc: "按 target 的日志级别覆盖。每一条将一个 tracing target 根映射到一个级别；(default) 继承基线。",
  },

  // ===== acp =====
  "acp.acp_defaults": {
    label: "结构化视图默认值",
    desc: '每个智能体的结构化视图启动默认值，按智能体名索引（`{"<agent>": {"model": "...", "effort": "...", "mode": "...", "effort_by_model": {"<model>": "..."}}}`）。`model` 在 spawn 时转发；`effort` 和 `mode` 在对应 ACP config option 上线时通过它应用。`effort_by_model` 在匹配的模型上覆盖 `effort`。通过 `acp-defaults` 自定义控件按智能体编辑（web 上为组合器风格下拉菜单，TUI 中为内联 JSON 字段）。',
  },
  "acp.allow_agent_install": {
    label: "允许从 web 安装智能体",
    desc: "允许 web dashboard 的“更新并重启”控件在宿主机上执行智能体的 `npm install -g <pkg>` 并重启 worker。默认关闭：daemon 执行全局包安装属于宿主机级别能力（会以 daemon 用户身份运行任意 npm 生命周期脚本），因此保持可选开启，在只读模式下始终被阻止，并且为 `local_only`，远程 dashboard 客户端无法开启它。仅可被 npm 安装的智能体适用；其他智能体保留手动安装提示。见 #2109。",
  },
  "acp.auto_stop_idle_secs": {
    label: "自动停止空闲 worker（秒）",
    desc: "自动停止空闲的 acp worker：达到指定秒数的不活跃（无 acp 事件且无进行中的 turn）后，daemon 会关闭该 worker 并将其会话标记为休眠，使 reconciler 不再重新拉起它。下一次用户提示会唤醒会话，reconciler 会重新 spawn 一个 worker。默认 3600（1 小时）；`0` 表示完全禁用该功能，不会因不活跃而停止任何 worker。",
  },
  "acp.default_agent": {
    label: "默认智能体",
    desc: "未指定 --agent 时使用的 acp 智能体（例如 aoe-agent、claude-code、gemini）。",
  },
  "acp.force_end_turn_threshold_secs": {
    label: "强制结束 turn 阈值（秒）",
    desc: '流式输出持续不活跃达到该秒数后，acp web UI 会显示"强制结束 turn"按钮。当 `turnActive=true` 且这段时间内没有 frame 到达时，spinner 很可能因漏掉 `Stopped` 而卡住（#1100）；该按钮会在本地清除 spinner 并 POST 到 force_end_turn，使 daemon 发布一个合成的 `Stopped { reason: "user_forced" }`，并尽力 `session/cancel` 该智能体。默认 30 秒。',
  },
  "acp.max_concurrent_resumes": {
    label: "最大并发恢复数",
    desc: "`aoe serve` 冷启动时 reconciler 并行执行的 acp worker 恢复（spawn 或 attach）最大数量。运行时受 `min(max_concurrent_resumes, max_concurrent_workers).max(1)` 约束，因此该旋钮永远不会超过活跃 worker 总上限。默认为 4：Node.js 启动内存开销大，4 个并发 claude-agent-acp 进程瞬时约 200-320MB。在资源受限的宿主机上降低；在更强的机器上调高。见 #1088。",
  },
  "acp.max_concurrent_workers": {
    label: "最大并发 worker 数",
    desc: "同时运行的 acp 智能体子进程的硬性上限；超出部分进入队列。",
  },
  "acp.node_path": {
    label: "Node 路径",
    desc: "覆盖 Node.js 二进制位置。留空时依次通过 AOE_ACP_NODE、PATH、内置回退解析。",
  },
  "acp.queue_drain_mode": {
    label: "队列排空模式",
    desc: "web 组合器如何在智能体忙碌时分发排队中的后续提示（见 #1031）。Combined（默认）将所有排队项用空行连接，在下一次 Stopped 时作为单个提示发送；Serial 逐条发送，每条各有一个响应。",
    options: { combined: "合并", serial: "逐条" },
  },
  "acp.rate_limit_auto_resume": {
    label: "限流后自动恢复",
    desc: '在 provider 用量/速率限制重置后自动恢复（可选）。当 acp worker 以 `Stopped { reason: "rate_limited" }` 停止时，会话被挂起，并（默认）等待用户通过 `/acp/spawn` 或智能体交接来显式恢复（#1281 的行为）。开启后，reconciler 会在适配器上报的重置时间（加上 `rate_limit_auto_resume_grace_secs`）过后自动重启同一个 worker，并发布 `RateLimitAutoResumed` 面包屑以便时间线可追溯。恢复时机从持久化的 `RateLimit` 事件读取，因此在 daemon 重启后仍然有效；再次限流会写入新的重置时间，不会形成紧密的重启循环。与厂商无关：任何上报 `kind == "rate_limit"` 的 ACP 后端都适用。默认关闭，保持手动优先的行为。见 #1722。',
  },
  "acp.rate_limit_auto_resume_grace_secs": {
    label: "自动恢复宽限（秒）",
    desc: "在自动恢复触发前，叠加到适配器上报的 `resets_at` 之上的秒数，用于吸收时钟偏差和适配器抖动。仅在 `rate_limit_auto_resume` 为 true 时有意义。默认 15。reconciler 还会从限流记录时刻起强制一个硬编码的最小挂起窗口，因此即便一个有 bug 的适配器上报了一个过去的 `resets_at` 且 grace 为 0，也不会造成紧密的重启循环。见 #1722。",
  },
  "acp.replay_bytes": { label: "回放缓冲字节", desc: "每个会话回放缓冲中保留的 acp 事件最大字节数。" },
  "acp.replay_events": {
    label: "历史上限（事件数）",
    desc: "每个会话 acp 事件的保留上限。0 = 无限制（默认）；设置非零值以限制长时间运行会话的磁盘占用。",
  },
  "acp.show_tool_durations": {
    label: "显示工具调用耗时",
    desc: "在每个 acp 工具卡片上渲染该工具的耗时标签。可通过 config.toml 跨设备同步。由于 claude-agent-acp 当前没有 `status: in_progress` 信号，底层测量并不精确，耗时包含流到达偏差；如果偏大的数字更令人困惑，可以关闭。",
  },
  "acp.silent_orphan_fast_grace_secs": {
    label: "静默孤儿快速宽限（秒）",
    desc: "静默孤儿看门狗：当当前提示已收到带成本字段的 `UsageUpdate` 通知（claude-agent-acp 在 `PromptResponse` 之前发出的“收尾核算”标记）时使用的加速宽限。在不削弱与厂商无关的基线的前提下，降低已知适配器卡死的 MTTR。默认 20 秒。如果 `silent_orphan_grace_secs` 为 0（禁用），此项无效。见 #1240。",
  },
  "acp.silent_orphan_grace_secs": {
    label: "静默孤儿宽限（秒）",
    desc: "静默孤儿看门狗：与厂商无关的正确性宽限。当有提示在进行、`tool_calls_in_flight` 为空、且已收到至少一条进度通知，此后超过该秒数仍未收到新的进度时，daemon 会尽力 `session/cancel` 并启动既有的取消升级宽限。用于填补 claude-agent-acp 流式结束却从不发送 `PromptResponse` 的漏洞（上游 agentclientprotocol/claude-agent-acp#688）。上游 agentclientprotocol/claude-agent-acp#706（已在 0.37.0 发布）在某些场景下能在失败的 turn 之后恢复提示流，降低了误报率，但无法挽救所有卡死（传输层停滞、子进程挂起、丢失的终端 frame），因此该看门狗仍作为与厂商无关的兜底。默认 120 秒；在 #1360 中从 60 秒上调，使异步智能体流程（Claude SDK 中带 `isAsync: true` 的 `Agent` 工具）在看门狗取消它们之前有更长的等待窗口。`0` 禁用看门狗。长时间运行的工具不受影响；看门狗仅在没有任何进行中的工具调用时触发。当 daemon 观察到当前提示中有异步智能体启动时，异步智能体扩展会将有效宽限提升到至少 30 分钟。低于 120 的非零值会在运行时被向上取整，以免手误禁用看门狗。见 #1240、#1360。",
  },

  // ===== session =====
  "session.agent_acp_cmd": {
    label: "智能体 Acp 命令",
    desc: '自定义智能体的 ACP 启动命令，使其能在结构化 acp UI 中运行（例如 "oc-superpowers" = "ocp run sp acp"）。在此有条目的自定义智能体具备 acp 能力；没有条目则仅限 tmux。注意：与 `custom_agents`（在 tmux 面板中运行的 shell 命令）不同，此值会按 shell-word 规则拆分为 argv 并直接执行，不经过 shell。如需 shell 特性，请显式包裹，例如 `sh -lc \'source ~/.profile && ocp run sp acp\'`。',
  },
  "session.agent_command_override": {
    label: "智能体命令覆盖",
    desc: "按智能体替换二进制的命令覆盖（例如 claude=my-wrapper）。",
  },
  "session.agent_detect_as": {
    label: "智能体检测为",
    desc: "状态检测映射：agent=builtin（例如 lenovo-claude=claude）。将一个自定义（或内置）智能体映射到另一个智能体的状态检测启发式。",
  },
  "session.agent_extra_args": {
    label: "智能体额外参数",
    desc: "按智能体追加到二进制之后的额外参数（例如 opencode=--port 8080）。",
  },
  "session.agent_status_hooks": {
    label: "智能体状态钩子",
    desc: "将状态检测钩子安装到智能体的配置文件中（例如 ~/.claude/settings.json）。禁用时 AoE 不会修改智能体的设置文件；状态检测会回退到 tmux 面板内容解析，可靠性较低。",
  },
  "session.auto_resume_on_restart": {
    label: "重启/重连时自动恢复",
    desc: "在重启（`e`）或重新连接（`Enter`）一个带有已存储会话 id 的终端模式会话时，传递 `--resume <sid>`（或智能体的等价参数）。禁用则会始终全新启动这些会话，例如通过智能体自带的 `/resume` 选择器手动恢复。不影响 Send Message 或 Live Send，它们在重新拉起已死面板时始终尝试保留上下文。见 #2609。",
  },
  "session.auto_stop_idle_secs": {
    label: "自动停止空闲会话（秒）",
    desc: "普通 TUI/tmux 会话进入 `Idle` 状态后，达到该秒数的不活跃即被自动停止（其 tmux 会话和任何沙盒容器都会被杀掉，该行变为可重启的 `Stopped` 行）。`0` 禁用（默认）；不会因不活跃而停止任何会话。空闲时长以“最后一次进入 `Idle`”和“最后一次用户交互”中较晚者起算，并且当前有 tmux 客户端连接的会话永远不会被停止，因此用户正在阅读的会话会被保留。约每分钟检查一次，所以停止可能比阈值最多晚一分钟。acp worker 使用单独的 `acp.auto_stop_idle_secs` 旋钮；见 #1689 和 #1690。",
  },
  "session.click_action": {
    label: "鼠标单击动作",
    desc: "在智能体视图中，单击会话行时的行为。Live mode（默认）为点击的行进入 live-send，即历史行为。Select only 仅移动光标，便于在不进入 live-send 的情况下阅读预览。无论此设置如何，双击仍按“默认连接模式”激活。",
    options: { live_send: "Live 模式", select_only: "仅选中" },
  },
  "session.confirm_before_quit": {
    label: "退出前确认",
    desc: "在主屏幕按 `q` 退出 aoe 前给出警告（该对话框也可关闭此项）。Ctrl+C 始终强制退出。",
  },
  "session.confirm_delete": {
    label: "删除前确认",
    desc: "使用 TUI `d` 键删除会话前要求确认。默认关闭，以保持“先入回收站”流程的低摩擦：`d` 直接把会话移入回收站。开启后，`d` 会先打开确认对话框，防止误按把错误的（可能正在运行的）会话丢进回收站。仅影响 TUI 的回收站路径；web 的删除对话框已自带确认，永久删除/强制移除路径无论本设置都由各自的对话框把关。见 #2583。",
  },
  "session.custom_agents": {
    label: "自定义智能体",
    desc: "用户自定义智能体：name=command（例如 lenovo-claude=ssh -t lenovo claude）。自定义智能体名称会与内置智能体一同出现在 TUI 智能体选择器中。",
  },
  "session.default_attach_mode": {
    label: "默认连接模式",
    desc: "在智能体视图中，对会话行按 Enter（及双击）时的行为：连接到 tmux（默认，历史行为），或进入 live-send 模式，使主列表保持可见并把按键直接传给智能体。Terminal/Tool 视图和 acp 会话忽略此设置。",
    options: { tmux: "Tmux", live_send: "Live 模式" },
  },
  "session.default_tool": {
    label: "默认工具",
    desc: "新会话的默认编码工具。未设置或工具不可用时，回退到第一个可用工具。",
  },
  "session.delete_to_trash": {
    label: "删除到回收站",
    desc: "将删除的会话移入回收站，而不是立即清除。开启（默认）时，`delete`/`rm` 以及 TUI/web 的删除操作会停止会话并将其隐藏到一个可恢复的回收站中；持久化状态（transcript、worktree、分支、容器）会保留，直到会话被清除或其保留窗口到期。禁用时，删除会执行历史上的不可逆清除。显式清除（`aoe rm --purge`、web 的“永久删除”操作）无论本设置都会清除。",
  },
  "session.live_send_exit_chord": {
    label: "Live-Send 退出组合键",
    desc: "以逗号分隔、用于退出 live-send 模式的组合键规格。tmux 风格：C-q、M-x、F12。列表中第一个匹配事件的组合键会结束 live 模式。默认 `C-q` 在我们适配的所有终端上均可用；如果需要把 C-q 透传给智能体，可添加额外的退出键。",
  },
  "session.live_send_leader": {
    label: "Live-Send 前导组合键",
    desc: "live-send 模式命令的前导（prefix）组合键，tmux 风格（`C-b`、`C-a`、`M-Space`、`F1` 等）。在 live 模式下，前导会启动一个一次性菜单：前导然后 `k` 打开命令面板，`b` 切换侧栏，`q` 退出。按两次前导会向智能体发送一个字面前导按键（对应 tmux 的 `send-prefix`）。默认 `C-b` 与 tmux 和 herdr 一致；它从智能体那里“偷走”的唯一组合键就是前导本身，而双击仍会送达。留空则完全禁用前导（每个按键，包括 `C-b`，都直接透传）。专用退出键（`live_send_exit_chord`，默认 `C-q`）独立于前导，始终是单按的快速退出。",
  },
  "session.merge_hooks_into_selected_agent": {
    label: "将钩子合并进所选智能体",
    desc: "对于钩子限定在用户所选命名智能体上的智能体（例如 Kiro 的 `--agent NAME`），将 AoE 的状态钩子安装到该智能体自己的配置文件中，使状态检测在宿主和沙盒会话上都继续生效。这类 CLI 没有全局钩子，若不如此，AoE 的独立 hooks 智能体在用户所选智能体上永远不会被加载，状态检测将失效。禁用时，AoE 会改为安装其独立 hooks 智能体，并保持用户的智能体文件不变。",
  },
  "session.mouse_capture": {
    label: "鼠标捕获",
    desc: "请求 xterm 鼠标追踪，使 TUI 处理滚轮（预览面板滚动）和点击选中行。禁用可将滚轮和文本选择交还给终端，例如 iOS Mosh + Termius/Blink 这类无法可靠转发鼠标追踪转义序列的环境。AOE_MOUSE_CAPTURE 环境变量仍作为退出兜底，设置后仍可强制关闭捕获。",
  },
  "session.new_session_attach_mode": {
    label: "新会话连接模式",
    desc: "新会话创建完成后 TUI 立即执行的动作。`Tmux`（默认）进入 tmux 连接视图，即历史行为。`LiveSend` 则对新会话的面板进入 live-send 模式，使不想直接处于 tmux 内的用户可以无需额外按键即创建并输入。acp 模式会话忽略此设置，因为 tmux 和 live-send 都不适用于它们。",
    options: { tmux: "Tmux", live_send: "Live 模式" },
  },
  "session.restart_wake_message": {
    label: "重启唤醒消息",
    desc: "在成功的 `aoe session restart` / `e` 快捷键重启后、且重启后的就绪探测显示面板已存活时，发送给智能体的文本。重启会在空白提示符处重新执行智能体；这条提示让智能体从上次中断处继续。设为空字符串可完全禁用唤醒消息（重启本身仍会执行）。",
  },
  "session.row_tag": {
    label: "行标签",
    desc: "在每个会话标题旁显示什么：Auto（在所有 profile 视图中显示 profile）、None、Profile（始终）、Sandbox（在沙盒行上显示 sb）或 Branch。",
    options: { none: "无", auto: "自动", profile: "Profile", sandbox: "Sandbox", branch: "Branch" },
  },
  "session.session_id_poller_max_threads": {
    label: "最大会话 ID 轮询线程数",
    desc: "为活跃会话轮询 tmux session ID 的进程级线程上限（每个会话一个线程）。达到上限时，新会话不会被轮询，其会话 ID 也不会刷新。",
  },
  "session.show_tips": {
    label: "显示提示",
    desc: "偶尔显示探索提示：页脚的 `💡` 徽标、可浏览的提示浮层，以及一次性的达成弹窗。关闭可隐藏徽标并停止提示弹出；已看/已达成状态仍记录在 `app_state` 中。属于全局 UX 偏好，不可按 profile 覆盖。见 `crate::tips`。",
  },
  "session.smart_rename": {
    label: "智能会话重命名",
    desc: "使用会话自身的智能体以 one-shot 模式（例如 `claude -p`），根据新结构化视图（ACP）会话的第一条消息自动重命名该会话。仅在该会话仍沿用自动生成名称时生效；手动命名的会话永不会被改动。仅重命名标题：worktree 目录不会被移动（运行中的智能体持有它）。没有 one-shot 模式的智能体、沙盒会话以及命令被覆盖的智能体仍保留生成名称。",
  },
  "session.smart_rename_agent": {
    label: "智能重命名智能体",
    desc: "用于 one-shot 智能重命名标题调用的智能体。留空表示使用会话自身的智能体。可将其指向一个更便宜或更顺从的标题模型（例如 codex 或 opencode），而不改变会话的工作智能体。仅具备 one-shot 模式的智能体适用；未知或不支持 one-shot 的值会回退为保留生成名称。选择器会列出已安装的、支持 one-shot 的智能体。",
  },
  "session.snooze_duration_minutes": {
    label: "暂挂时长（分钟）",
    desc: "`aoe session snooze` 的默认暂挂时长（1-43200 分钟，选择器可覆盖）。在暂挂窗口内，会话被视作归档：沉到底部，以斜体+暗色渲染并带 `z ` 前缀，被 attention 排序忽略，计时到期后重新加入活跃列表。",
  },
  "session.strict_hotkeys": {
    label: "严格快捷键",
    desc: "要求基于字母的 TUI 快捷键加按 SHIFT（例如 SHIFT+N 新建、SHIFT+D 删除）。防止因听写软件、焦点丢失或误触按键导致的意外破坏性操作。导航键（h/j/k/l、方向键、Enter、Esc）、标点（/、?）和数字修饰键仍不加 SHIFT。原先大写的绑定（P、R、T、N、D、G）迁移到 Ctrl+字母，不会丢失任何功能。注意：Ctrl+D（diff 视图）在某些 tmux 配置下可能与终端 EOF 冲突；如遇此情况，请重新绑定 tmux 的 send-prefix 或使用帮助浮层中的 `D` 键。默认关闭；既有用户保留旧的单字母交互。",
  },
  "session.tie_workdir_to_name": {
    label: "将 worktree 目录与会话名绑定",
    desc: "使 aoe 管理的 worktree 会话的目录叶节点与其标题保持同步。开启（默认）时，重命名会话也会移动其 worktree 目录，新会话的目录叶节点从标题派生。重命名一个已绑定的 worktree 会话需要先将其停止。git 分支永远不会被牵连；它有单独的可选开关。对非 worktree 会话无效。",
  },
  "session.trash_retention_days": {
    label: "回收站保留（天）",
    desc: "会话在回收站中保留的天数，超过后会被自动清除，自其被移入回收站时起算。`0` 表示永久保留回收站中的会话（仅手动清除）。自动清除由 `aoe serve` daemon 执行（启动时扫描加每小时一次）；若无运行中的 daemon，过期回收站会在下一次 daemon 启动时或显式手动清除（`aoe rm --purge`、`aoe session empty-trash`）时被清除。",
  },
  "session.unread_indicator": {
    label: "未读会话指示",
    desc: "在会话上显示未读指示。开启（默认）时，一个 turn 刚结束的会话会以主题的未读色绘制，直到你查看它（Tab 进入 live-send 或 Enter 连接）；你也可以用 `U` 将会话标记为未读留待以后查看；在 attention 排序中，未读行排在 Waiting 之下。关闭可禁用指示、自动标记以及 `U` 切换。`global_only`：该开关是单个进程级标志（`crate::session::unread_enabled`），从活动 profile 的已解析配置刷新，因此无法遵循按 profile 的覆盖。将其暴露为可按 profile 覆盖会静默忽略该覆盖；为保持 schema 诚实，限定为全局。",
  },
  "session.yolo_mode_default": { label: "YOLO 模式默认", desc: "为新会话默认启用 YOLO 模式（跳过权限提示）。" },

  // ===== diff =====
  "diff.context_lines": { label: "上下文行数", desc: "在改动周围显示的上下文行数。" },
  "diff.default_branch": {
    label: "默认分支",
    desc: "用于比较的默认分支（例如 “main”、“master”）。未设置时会尝试从仓库自动检测。",
  },
  "diff.split_view": { label: "并排 diff", desc: "以并排（split）而非合并（unified）方式渲染 diff。" },

  // ===== web =====
  "web.notifications_enabled": {
    label: "推送通知",
    desc: "允许 web dashboard 投递浏览器推送通知（全服务器级总开关）。关闭时，`/api/push/*` 返回 404，状态变更消费者会丢弃事件而不发送。已有订阅在切换后依然保留，因此重新开启时无需用户重新订阅即可恢复投递。",
  },
  "web.notify_on_error": { label: "出错时通知", desc: "默认：会话出错时（Running 到 Error）发送推送。" },
  "web.notify_on_idle": {
    label: "空闲时通知",
    desc: "默认：会话结束时（Running 到 Idle）发送推送。默认关闭，因为短会话会让它过于嘈杂；可按会话单独开启。",
  },
  "web.notify_on_waiting": {
    label: "等待时通知",
    desc: "默认：会话从 Running 转为 Waiting 时（智能体在请求输入）发送推送。可按会话单独覆盖。",
  },
  "web.notify_on_wake_fire": {
    label: "计划唤醒时通知",
    desc: "默认：当 acp 会话的 ScheduleWakeup 计时器触发时（下一个 /loop turn 开始）发送推送。若 TUI 或 web dashboard 在最近 30 秒内活跃过则抑制。见 #1091。",
  },
  "web.mobile_quick_button_count": {
    label: "手机快捷按钮数",
    desc: "手机终端工具栏显示的自定义快捷按钮数量（每行最多 7 个，最多 28 个）。长按某个按钮可编辑其标题、要发送的文本（≤2 万字符）以及是否在发送后自动加回车；按钮内容随服务器配置跨设备同步。",
  },

  // ===== auth =====
  "auth.persist_sessions": {
    label: "持久化登录会话",
    desc: "在 `aoe serve` 重启之间保留 dashboard 登录会话。开启时，已登录的设备在 daemon 重启后仍保持登录，而无需再次输入口令；会话以仅所有者可读（0600）存储在应用目录下，并在口令变更时丢弃。关闭则使每次重启都强制重新认证。见 #1235。",
  },
  "auth.serve_token_ttl_days": {
    label: "Token 有效期（天）",
    desc: "serve auth token 在重启之间复用的天数。服务器重启时，若磁盘上既有 `serve.token` 的年龄（以天计）低于此阈值，则保留；否则生成新 token。例如设为 365 可使同一 dashboard URL 在一年内的重启中都有效。默认为 1 天（旧行为）。最大 999 天。",
  },

  // ===== theme =====
  "theme.color_mode": {
    label: "颜色模式",
    desc: "Truecolor（24 位 RGB）或 palette（xterm-256）。如果终端会破坏 RGB 转义序列，请使用 palette。与主题本身一样为全局设置。",
    options: { truecolor: "truecolor", palette: "palette" },
  },
  "theme.idle_decay_minutes": {
    label: "空闲衰减（分钟）",
    desc: "默认关闭（0）。设置正值以开启：刚停止的 Idle 会话会保持新鲜空闲的色调和动画呼吸图标，持续该分钟数，之后回到静态外观，并被 `w` 快捷键视为可操作。无论此设置如何，Idle 行上的“停止后时长”列始终显示。",
  },
  "theme.name": {
    label: "主题",
    desc: "TUI 的颜色主题。全局偏好：无论当前活动的会话 profile 是什么，一个主题会绘制所有界面（见 `config::resolve_theme_name`），因此不可按 profile 覆盖。",
  },

  // ===== updates =====
  "updates.auto_update_plugins": {
    label: "自动更新插件",
    desc: "在 TUI 和 `aoe serve` 启动时自动更新已安装的外部插件。默认关闭。该扫描仅应用无需新授权的更新；任何改变了能力、构建步骤或 UI 槽位的版本都会留给手动 `aoe plugin update`，以便审核其新的授权。",
  },
  "updates.check_interval_hours": { label: "检查间隔（小时）", desc: "多久检查一次更新。" },
  "updates.notify_in_cli": { label: "在 CLI 中通知", desc: "在 CLI 输出中显示更新通知。" },
  "updates.update_check_mode": {
    label: "更新检查模式",
    desc: "auto = 检测到后在后台安装（下次启动生效）。notify = 显示横幅 / CLI 提示（默认）。off = 跳过所有检查。",
    options: { auto: "auto", notify: "notify", off: "off" },
  },
  "updates.web_poll_interval_minutes": {
    label: "Web 轮询间隔（分钟）",
    desc: "web dashboard 重新轮询新版本的频率。服务端缓存由 `check_interval_hours` 控制；此旋钮仅控制前端请求的激进程度。请保持低于 `check_interval_hours * 60`，否则每次轮询都会命中缓存。见 #984。",
  },

  // ===== telemetry =====
  "telemetry.enabled": { label: "匿名使用遥测", desc: "用户已加入匿名使用遥测。默认为 `false`。" },

  // ===== worktree =====
  "worktree.auto_cleanup": { label: "自动清理", desc: "删除会话时自动清理 worktree。" },
  "worktree.bare_repo_path_template": {
    label: "裸仓库模板",
    desc: '裸仓库 worktree 路径的模板。默认为 "./{branch}"，使 worktree 作为兄弟项保留在仓库目录内。',
  },
  "worktree.default_base_branch": {
    label: "默认基础分支",
    desc: "新 worktree 分支的默认基础分支。留空时回退到仓库检测到的默认分支。注册表中按项目的条目，或在会话创建时显式提供的基础分支，优先于此设置。",
  },
  "worktree.delete_branch_on_cleanup": {
    label: "清理时删除分支",
    desc: "删除 worktree 时同时删除 git 分支。默认：false（删除对话框中未勾选）。",
  },
  "worktree.enabled": { label: "默认启用", desc: "为新会话默认启用 worktree 模式。" },
  "worktree.init_submodules": {
    label: "初始化子模块",
    desc: "当检出的内容包含 `.gitmodules` 文件时，在创建 worktree 后运行 `git submodule update --init --recursive`。对于在智能体会话内不需要的大型或深层嵌套子模块树可以禁用；新会话随后会完成创建，而不是在子模块克隆时卡在 `Creating`。",
  },
  "worktree.path_template": { label: "路径模板", desc: "worktree 路径模板（{repo-name}、{branch}）。" },
  "worktree.show_branch_in_tui": { label: "在 TUI 中显示分支", desc: "在 TUI 会话列表中显示 worktree 分支名。" },
  "worktree.workspace_path_template": {
    label: "工作区路径模板",
    desc: "多仓库工作区目录的模板（{branch}、{session-id}）。",
  },

  // ===== sandbox =====
  "sandbox.auto_cleanup": { label: "自动清理", desc: "删除会话时移除容器。" },
  "sandbox.container_runtime": {
    label: "容器运行时",
    desc: "用于沙盒的容器运行时。",
    options: { docker: "Docker", podman: "Podman", apple_container: "Apple Container" },
  },
  "sandbox.cpu_limit": { label: "CPU 限制", desc: "容器的 CPU 限制（例如 “4”）。" },
  "sandbox.custom_instruction": {
    label: "自定义指令",
    desc: "在沙盒会话中追加到智能体系统提示词的自定义指令文本（仅 Claude、Codex）。",
  },
  "sandbox.default_image": { label: "默认镜像", desc: "沙盒使用的容器镜像。" },
  "sandbox.default_terminal_mode": {
    label: "默认终端模式",
    desc: "沙盒会话的默认终端（用 'c' 键切换）。",
    options: { host: "宿主机", container: "容器" },
  },
  "sandbox.enabled_by_default": { label: "默认启用", desc: "为新会话默认启用沙盒模式。" },
  "sandbox.environment": {
    label: "沙盒环境",
    desc: "注入容器的环境变量：KEY=value（字面量，出现在 argv 中）、KEY=$VAR（从宿主机透传，对 argv 隐藏）、KEY=$$literal（转义开头的 $）或裸 KEY（透传）。对于宿主（非沙盒）会话，请参见 Session > Host Environment。",
  },
  "sandbox.extra_volumes": { label: "额外卷", desc: "额外的卷挂载（host:container 或 host:container:ro）。" },
  "sandbox.memory_limit": { label: "内存限制", desc: "容器的内存限制（例如 “8g”、“512m”）。" },
  "sandbox.mount_ssh": { label: "挂载 SSH", desc: "将 ~/.ssh 挂载到沙盒容器中（用于 git SSH 访问）。" },
  "sandbox.port_mappings": { label: "端口映射", desc: "将容器端口暴露到宿主机（例如 3000:3000）。" },
  "sandbox.selinux_relabel": {
    label: "SELinux 重标记",
    desc: "为沙盒 bind 挂载追加 :z SELinux 重标记标志（Fedora/RHEL 需要；会重标记宿主机路径）。默认关闭；仅对 Docker/Podman 输出。",
  },
  "sandbox.volume_ignores": {
    label: "卷忽略",
    desc: "从宿主机挂载中排除的目录（例如 target、node_modules）。",
  },
  "sandbox.volume_ignores_strategy": {
    label: "卷忽略策略",
    desc: "anonymous：默认，在 Linux 上可用。named：使用确定性的 Docker/Podman 命名卷，在 macOS/VirtioFS 上要可靠地遮蔽 bind 挂载子目录时必需。",
    options: { anonymous: "anonymous", named: "named" },
  },

  // ===== tmux =====
  "tmux.clipboard": {
    label: "剪贴板透传",
    desc: "将来自智能体的 OSC 52 剪贴板转发到你的终端（Auto 会尊重你的 tmux 配置）。控制 `set-clipboard on` 和 `allow-passthrough on`，使被包裹智能体的 OSC 52 能到达终端。",
    options: { auto: "自动", enabled: "启用", disabled: "禁用" },
  },
  "tmux.mouse": {
    label: "鼠标支持",
    desc: "控制鼠标滚动（Auto 会尊重你的 tmux 配置）。",
    options: { auto: "自动", enabled: "启用", disabled: "禁用" },
  },
  "tmux.status_bar": {
    label: "状态栏",
    desc: "控制 tmux 状态栏样式（Auto 会尊重你的 tmux 配置）。",
    options: { auto: "自动", enabled: "启用", disabled: "禁用" },
  },

  // ===== sound =====
  "sound.enabled": { label: "启用", desc: "在智能体状态切换时播放声音。" },
  "sound.mode": { label: "模式", desc: "如何选择声音（随机或指定文件名）。" },
  "sound.on_approval": {
    label: "批准时",
    desc: "仅 acp。当会话需要权限时在浏览器中播放。指定带扩展名的文件名。由 acp 的 approval 钩子触发（宿主机侧故意没有 approval 切换；当用户在另一台机器上运行 dashboard 时，宿主机音频设备位于线路错误的一侧）。见 #1038。",
  },
  "sound.on_error": { label: "出错时", desc: "指定带扩展名的文件名。" },
  "sound.on_idle": { label: "空闲时", desc: "指定带扩展名的文件名。" },
  "sound.on_running": { label: "运行时", desc: "指定带扩展名的文件名。" },
  "sound.on_start": { label: "开始时", desc: "指定带扩展名的文件名。" },
  "sound.on_waiting": { label: "等待时", desc: "指定带扩展名的文件名。" },
  "sound.volume": {
    label: "音量",
    desc: "播放音量（0.1 = 最小，1.0 = 正常，1.5 = 最大），步长 0.1。当 Linux 后端为 aplay 时忽略。",
  },

  // ===== status_hooks =====
  "status_hooks.debounce_ms": {
    label: "防抖（毫秒）",
    desc: "状态必须保持稳定多少毫秒后才运行钩子命令。始终序列化（无 skip-at-default），因此每个读取配置 JSON 的界面，包括 settings schema 消费者，都会看到一个具体值，而不是一个会显示为 0 的缺失叶子（#1692）。",
  },
  "status_hooks.enabled": { label: "启用", desc: "TUI 会话状态变更时运行本地命令。" },
  "status_hooks.on_change": { label: "任意变更时", desc: "每次状态变更时，在针对该状态的命令之后运行的 shell 命令。" },
  "status_hooks.on_error": { label: "出错时", desc: "会话进入 Error 时运行的 shell 命令。" },
  "status_hooks.on_idle": { label: "空闲时", desc: "会话进入 Idle 时运行的 shell 命令。" },
  "status_hooks.on_running": { label: "运行时", desc: "会话进入 Running 时运行的 shell 命令。" },
  "status_hooks.on_starting": { label: "启动时", desc: "会话进入 Starting 时运行的 shell 命令。" },
  "status_hooks.on_waiting": { label: "等待时", desc: "会话进入 Waiting 时运行的 shell 命令。" },
};

export const schema: ZhSchemaCatalog = { categories, fields };
