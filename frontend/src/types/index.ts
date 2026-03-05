export interface Job {
  job_id: string
  job_name: string
  user_name: string
  partition_name: string
  account: string
  state: string
  nodes: string
  num_nodes: number
  num_cpus: number
  num_gpus: number
  submit_time: string
  start_time: string
  end_time: string
  time_limit: string
  work_dir: string
  command: string
  stdout_path: string
  stderr_path: string
  exit_code: number | null
}

export interface JobListResponse {
  jobs: Job[]
  total: number
}

export interface JobSubmitRequest {
  script?: string
  command?: string
  partition?: string
  account?: string
  job_name?: string
  num_nodes?: number
  num_cpus?: number
  num_gpus?: number
  time_limit?: string
  memory?: string
  extra_args?: string[]
}

export interface CommandPreset {
  id?: number
  name: string
  description: string
  command: string
  category: string
}

export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

export interface LogContent {
  path: string
  content: string
  total_lines: number
  offset: number
  limit: number
}

export interface LogSearchResult {
  path: string
  line_number: number
  line: string
}

export interface NodeInfo {
  name: string
  state: string
  cpus_total: number
  cpus_alloc: number
  memory_total: number
  memory_alloc: number
  gpus_total: number
  gpus_alloc: number
  partitions: string[]
  features: string[]
}

export interface ClusterSummary {
  total_nodes: number
  available_nodes: number
  total_cpus: number
  allocated_cpus: number
  total_gpus: number
  allocated_gpus: number
  nodes: NodeInfo[]
  partitions: PartitionInfo[]
}

export interface PartitionInfo {
  name: string
  state: string
  total_nodes: number
  available_nodes: number
  total_cpus: number
  allocated_cpus: number
}

export interface ResourceSnapshot {
  id: number
  timestamp: string
  total_nodes: number
  available_nodes: number
  total_cpus: number
  allocated_cpus: number
  total_gpus: number
  allocated_gpus: number
}

export interface TerminalSession {
  id: string
  pid: number
  created_at: string
  title: string
  cols: number
  rows: number
}

export interface CalendarEvent {
  id: string
  summary: string
  description: string
  start: string
  end: string
  location: string
  all_day: boolean
  source: string
}

export interface Note {
  id?: number
  title: string
  content: string
  job_id: string
  notion_page_id: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface NotificationRule {
  id?: number
  name: string
  enabled: boolean
  event_type: string
  condition_json: string
  action_type: string
  action_config: string
}

export interface NotificationLogEntry {
  id: number
  rule_id: number | null
  event_type: string
  message: string
  sent_at: string
  success: boolean
  error_message: string
}
