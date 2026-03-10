export const QUEUE_NAMES = {
  repoMaintenance: "repo-maintenance",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
