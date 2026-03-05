CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT UNIQUE NOT NULL,
    job_name TEXT DEFAULT '',
    user_name TEXT DEFAULT '',
    partition_name TEXT DEFAULT '',
    account TEXT DEFAULT '',
    state TEXT DEFAULT '',
    nodes TEXT DEFAULT '',
    num_nodes INTEGER DEFAULT 0,
    num_cpus INTEGER DEFAULT 0,
    num_gpus INTEGER DEFAULT 0,
    submit_time TEXT DEFAULT '',
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    time_limit TEXT DEFAULT '',
    work_dir TEXT DEFAULT '',
    command TEXT DEFAULT '',
    stdout_path TEXT DEFAULT '',
    stderr_path TEXT DEFAULT '',
    exit_code INTEGER,
    raw_json TEXT DEFAULT '{}',
    first_seen TEXT DEFAULT (datetime('now')),
    last_updated TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_name);

CREATE TABLE IF NOT EXISTS job_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    old_state TEXT DEFAULT '',
    new_state TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    notified INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_job_events_job ON job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_events_notified ON job_events(notified);

CREATE TABLE IF NOT EXISTS resource_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    total_nodes INTEGER DEFAULT 0,
    available_nodes INTEGER DEFAULT 0,
    total_cpus INTEGER DEFAULT 0,
    allocated_cpus INTEGER DEFAULT 0,
    total_gpus INTEGER DEFAULT 0,
    allocated_gpus INTEGER DEFAULT 0,
    raw_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    event_type TEXT NOT NULL,
    condition_json TEXT DEFAULT '{}',
    action_type TEXT DEFAULT 'email',
    action_config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER,
    event_type TEXT NOT NULL,
    message TEXT DEFAULT '',
    sent_at TEXT DEFAULT (datetime('now')),
    success INTEGER DEFAULT 1,
    error_message TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    job_id TEXT DEFAULT '',
    notion_page_id TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS command_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    command TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS local_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT DEFAULT '',
    all_day INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
