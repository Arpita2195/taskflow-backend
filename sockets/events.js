const EVENTS = {
  // Board presence
  JOIN_BOARD: 'join-board',
  LEAVE_BOARD: 'leave-board',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Tasks
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_MOVED: 'task:moved',
  TASK_DELETED: 'task:deleted',

  // Comments
  COMMENT_ADDED: 'comment:added',
  COMMENT_DELETED: 'comment:deleted',

  // Projects
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Cursor (optional)
  CURSOR_MOVE: 'cursor:move',

  // Collaboration
  LIVE_SYNC_STARTED: 'live-sync:started',
};

module.exports = { EVENTS };
