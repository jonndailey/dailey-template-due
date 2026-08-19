import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaChartBar,
  FaChevronDown,
  FaChevronRight,
  FaCog,
  FaListUl,
  FaLock,
  FaMinus,
  FaPlus,
  FaThumbtack,
  FaTimes,
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch, downloadFile } from './api.js';
import { useAuth } from './auth/AuthContext.jsx';
import LoginView from './components/LoginView.jsx';

/* Inline SVG icon — Lucide-style, stroke 1.75 */
function Icon({ name, size = 16, style }) {
  const paths = {
    clipboard: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z M9 14l2 2 4-4',
    check:     'M20 6 9 17l-5-5',
    zap:       'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
    chart:     'M3 3v16a2 2 0 0 0 2 2h16 M7 16l4-4 3 3 5-5',
    settings:  'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    moon:      'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
    sun:       'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4',
    folder:    'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
    logout:    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    chevron:   'M6 9l6 6 6-6',
    layers:    'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z M2 12l8.6 3.91a2 2 0 0 0 1.66 0L22 12 M2 17l8.6 3.91a2 2 0 0 0 1.66 0L22 17',
    plus:      'M5 12h14 M12 5v14',
    x:         'M18 6 6 18 M6 6l12 12',
    pin:       'M12 17v5 M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1Z',
    user:      'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    flag:      'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7',
    calendar:  'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
    clock:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
    paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
  };
  const d = paths[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0, display: 'inline-block', ...style }} aria-hidden="true">
      {d.split(' M').map((seg, i) => <path key={i} d={(i ? 'M' : '') + seg} />)}
    </svg>
  );
}

/* Dailey Due logo mark + wordmark */
function DdLogo() {
  return (
    <div className="dd-logo">
      <span className="dd-mark" style={{ width: 26, height: 26 }}>
        <Icon name="clipboard" size={14} />
      </span>
      <span className="dd-logo-text">Dailey<span> Due</span></span>
    </div>
  );
}

/* Chip + popover component for modal property fields */
function ChipField({ color, iconName, label, tone, isOpen, onOpen, children }) {
  return (
    <div className="chip-wrap">
      <button
        type="button"
        className={`chip${isOpen ? ' active' : ''}`}
        onClick={onOpen}
      >
        {color && <span className="chip-dot" style={{ background: color }} />}
        {!color && iconName && <Icon name={iconName} size={13} />}
        <span className={`chip-v${tone ? ` ${tone}` : ''}`}>{label}</span>
      </button>
      {isOpen && <div className="chip-pop">{children}</div>}
    </div>
  );
}

function priorityMeta(priority) {
  if (priority === 'high')   return { label: 'High', tone: 'bad',  arrow: '↑' };
  if (priority === 'medium') return { label: 'Med',  tone: 'warn', arrow: '→' };
  return                            { label: 'Low',  tone: '',     arrow: '↓' };
}

/* Vim-style status line */
function StatusLine({ view, projectName, activeCount, blitzActive }) {
  const hints = view === 'list'
    ? [['j','k','move'], ['x','done'], ['p','pin'], ['c','new'], ['b','blitz'], ['f','filter']]
    : [['esc','back']];
  return (
    <div className="dd-statusline">
      <span className="sl-mode">{blitzActive ? 'BLITZ' : view === 'list' ? 'NORMAL' : view.toUpperCase()}</span>
      <span className="sl-sep">|</span>
      <span className="sl-seg">
        <Icon name="folder" size={11} />
        <b>{projectName || 'All Projects'}</b>
      </span>
      {view === 'list' && (
        <>
          <span className="sl-sep">|</span>
          <span className="sl-seg">{activeCount} open</span>
        </>
      )}
      <div className="sl-hints">
        {hints.map(([k, k2, lbl]) => lbl
          ? <span className="sl-hint" key={k}><span className="sk">{k}</span><span className="sk">{k2}</span>{lbl}</span>
          : <span className="sl-hint" key={k}><span className="sk">{k}</span>{k2}</span>
        )}
      </div>
    </div>
  );
}

const SECTION_COLLAPSE_STORAGE_KEY = 'dailey-assignments:collapsed-sections';
const DEFAULT_COLLAPSED_SECTIONS = {
  pinned: false,
  ready: false,
  tomorrow: false,
  thisWeek: false,
  later: false,
  holding: false,
  completed: true,
};

function formatDueDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);

  const isToday = dueDate.getTime() === today.getTime();
  const isOverdue = dueDate.getTime() < today.getTime();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = dueDate.getTime() === tomorrow.getTime();

  if (isOverdue) {
    const diffDays = Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? 'Overdue 1 day' : `Overdue ${diffDays} days`;
  }
  if (isToday) return 'Due today';
  if (isTomorrow) return 'Tomorrow';

  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);

  if (diffDays <= 7) return `${dateStr} · in ${diffDays} days`;
  return dateStr;
}

function isDueUrgent(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() <= today.getTime();
}

function isDueOverdue(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() < today.getTime();
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDateInput(date);
}

function daysFromToday(value) {
  if (!value) return null;
  const dueDate = startOfDay(value);
  if (Number.isNaN(dueDate.getTime())) return null;
  const today = startOfDay();
  return Math.round((dueDate - today) / (24 * 60 * 60 * 1000));
}

function fromDateInputValue(value) {
  if (!value) return null;
  const date = new Date(`${value}T17:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getDuePresetValue(preset) {
  const date = new Date();

  switch (preset) {
    case 'tomorrow':
      date.setDate(date.getDate() + 1);
      break;
    case 'end-of-week': {
      const day = date.getDay();
      const daysUntilFriday = (5 - day + 7) % 7;
      date.setDate(date.getDate() + daysUntilFriday);
      break;
    }
    case 'next-week': {
      const day = date.getDay();
      const daysUntilNextMonday = ((8 - day) % 7) || 7;
      date.setDate(date.getDate() + daysUntilNextMonday);
      break;
    }
    default:
      break;
  }

  return formatDateInput(date);
}

function isDueTodayOrEarlier(value) {
  if (!value) return true;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return true;
  return formatDateInput(dueDate) <= formatDateInput(new Date());
}

function isDueTomorrow(value) {
  return daysFromToday(value) === 1;
}

function isDueThisWeek(value) {
  const days = daysFromToday(value);
  return days !== null && days >= 2 && days <= 7;
}

function isDueLater(value) {
  const days = daysFromToday(value);
  return days !== null && days > 7;
}

function countDescendantTasks(task) {
  if (!task?.children?.length) return 0;
  return task.children.reduce((total, child) => total + 1 + countDescendantTasks(child), 0);
}

function countOpenDescendantTasks(task) {
  if (!task?.children?.length) return 0;
  return task.children.reduce((total, child) => (
    total
    + (child.status === 'completed' ? 0 : 1)
    + countOpenDescendantTasks(child)
  ), 0);
}

function loadCollapsedSections() {
  if (typeof window === 'undefined') return DEFAULT_COLLAPSED_SECTIONS;

  try {
    const raw = window.localStorage.getItem(SECTION_COLLAPSE_STORAGE_KEY);
    if (!raw) return DEFAULT_COLLAPSED_SECTIONS;
    return {
      ...DEFAULT_COLLAPSED_SECTIONS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_COLLAPSED_SECTIONS;
  }
}

function shuffleTasks(tasks) {
  const next = [...tasks];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function attachmentLabel(attachment) {
  const icon = attachment.mime_type?.startsWith('image/') ? 'PHOTO' : 'FILE';
  const size = formatBytes(attachment.file_size);
  return size ? `${icon} ${attachment.file_name} (${size})` : `${icon} ${attachment.file_name}`;
}

function isTextMode() {
  const active = document.activeElement;
  if (!active) return false;
  return active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.tagName === 'SELECT';
}

function makeCreateDraft(projectId = '', assigneeId = '') {
  return {
    title: '',
    description: '',
    project_id: projectId,
    assigned_to: assigneeId,
    priority: 'low',
    due_date: getDuePresetValue('today'),
    remind_at: '',
    is_pinned: false,
  };
}

function makeTaskDraft(task) {
  return {
    title: task?.title || '',
    description: task?.description || '',
    project_id: task?.project_id || '',
    assigned_to: task?.assigned_to || '',
    status: task?.status || 'active',
    priority: task?.priority || 'low',
    due_date: toDateInputValue(task?.due_date),
    is_pinned: Boolean(task?.is_pinned),
  };
}

function makeProjectDraft() {
  return {
    name: '',
    color_hex: '#73D1F6',
    blitz_enabled: false,
  };
}

function makeMemberDraft() {
  return {
    display_name: '',
    email: '',
    role: 'member',
  };
}

function buildTaskPatch(task, draft) {
  const patch = {};
  const nextTitle = draft.title.trim();
  const currentDescription = task.description || '';
  const nextDescription = draft.description || '';

  if (nextTitle && nextTitle !== task.title) {
    patch.title = nextTitle;
  }
  if (nextDescription !== currentDescription) {
    patch.description = nextDescription;
  }
  if (draft.project_id && draft.project_id !== task.project_id) {
    patch.project_id = draft.project_id;
  }
  if (draft.assigned_to && draft.assigned_to !== task.assigned_to) {
    patch.assigned_to = draft.assigned_to;
  }
  // Skip status if the draft wants 'active' but the task is already 'completed'.
  // This happens when handleToggleTaskComplete marks the task completed via the
  // separate API endpoint, but the draft still holds the old 'active' status.
  // Without this guard the 500ms auto-save fires a PUT with status:'active'
  // and reverts the completion.
  if (draft.status !== task.status) {
    const draftRevertingCompletion = draft.status === 'active' && task.status === 'completed';
    if (!draftRevertingCompletion) {
      patch.status = draft.status;
    }
  }
  if (draft.priority !== task.priority) {
    patch.priority = draft.priority;
  }
  if (Boolean(draft.is_pinned) !== Boolean(task.is_pinned)) {
    patch.is_pinned = Boolean(draft.is_pinned);
  }
  if (draft.due_date !== toDateInputValue(task.due_date)) {
    patch.due_date = fromDateInputValue(draft.due_date);
  }

  return patch;
}

function buildTaskMeta(task) {
  const parts = [
    task.project_name,
    task.assigned_to_name || task.assigned_to,
  ];
  const due = formatDueDate(task.due_date);
  if (due) parts.push(due);
  return parts.filter(Boolean).join(' • ');
}

function getProjectColor(project) {
  return project?.color_hex || '#73D1F6';
}

function groupTasksByProject(tasks, projectById) {
  const groups = new Map();

  for (const task of tasks) {
    const project = projectById[task.project_id] || {
      id: task.project_id,
      name: task.project_name || 'Unsorted',
      color_hex: '#73D1F6',
    };

    if (!groups.has(project.id)) {
      groups.set(project.id, {
        project,
        tasks: [],
      });
    }

    groups.get(project.id).tasks.push(task);
  }

  return [...groups.values()].sort((left, right) => left.project.name.localeCompare(right.project.name));
}

function flattenTaskGroups(groups) {
  return groups.flatMap((group) => group.tasks);
}

function formatMinutes(minutes) {
  const total = Number(minutes || 0);
  if (!total) return '0m';
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

const BLITZ_QUOTES = [
  'The secret of getting ahead is getting started.',
  'Done is better than perfect.',
  'Small progress is still progress.',
  "You don't have to be great to start, but you have to start to be great.",
  'Focus on being productive instead of busy.',
  'The only way to do great work is to love what you do.',
  'Action is the foundational key to all success.',
  'It always seems impossible until it\'s done.',
  'Your future self will thank you.',
  'Discipline is choosing between what you want now and what you want most.',
  'The best time to plant a tree was 20 years ago. The second best time is now.',
  "Don't count the days, make the days count.",
];

const BLITZ_CONGRATS = [
  'Crushed it.',
  'One down. Keep moving.',
  "That's the momentum.",
  'Shipped.',
  'Done. What\'s next?',
  'Unstoppable.',
  'Another one bites the dust.',
  "You're on fire.",
];

const CONFETTI_COLORS = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

function ConfettiEffect() {
  const pieces = useMemo(() => {
    const result = [];
    for (let i = 0; i < 40; i++) {
      result.push({
        left: `${Math.random() * 100}%`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: `${Math.random() * 1}s`,
        size: 6 + Math.random() * 6,
        isCircle: Math.random() > 0.5,
      });
    }
    return result;
  }, []);

  return (
    <div className="confetti-container">
      {pieces.map((piece, index) => (
        <div
          key={index}
          className="confetti-piece"
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.isCircle ? '50%' : '2px',
            animationDelay: piece.delay,
          }}
        />
      ))}
    </div>
  );
}

function BlitzBoltIcon({ className = 'blitz-bolt-icon' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M9.4 1.5 3.6 8.3h3L5.9 14.5l6.5-7.1H8.9L9.4 1.5Z" fill="currentColor" />
    </svg>
  );
}

function getPriorityDisplay(priority = 'low') {
  switch (priority) {
    case 'high':
      return {
        label: 'High',
        className: 'priority-high',
        Icon: FaArrowUp,
      };
    case 'medium':
      return {
        label: 'Medium',
        className: 'priority-medium',
        Icon: FaMinus,
      };
    default:
      return {
        label: 'Low',
        className: 'priority-low',
        Icon: FaArrowDown,
      };
  }
}

function PriorityBadge({ priority = 'low', subtle = false, dot = false }) {
  const { label, className, Icon } = getPriorityDisplay(priority);

  if (dot) {
    return (
      <span className={`priority-dot ${className}`} title={label} aria-label={`${label} priority`} />
    );
  }

  return (
    <span className={`priority-badge ${className} ${subtle ? 'subtle' : ''}`.trim()}>
      <Icon className="priority-badge-icon" aria-hidden="true" focusable="false" />
      <span>{label}</span>
    </span>
  );
}

function NotesPreview({ value }) {
  if (!value?.trim()) {
    return <div className="empty-inline">Markdown preview appears here as you write.</div>;
  }

  return (
    <div className="markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {value}
      </ReactMarkdown>
    </div>
  );
}

function ToolbarButtonContent({ label, hint, icon = null }) {
  return (
    <span className="toolbar-button-content">
      <span className="toolbar-button-main">
        {icon ? <span className="toolbar-button-icon">{icon}</span> : null}
        <span>{label}</span>
      </span>
      {hint ? <span className="toolbar-button-hint">{hint}</span> : null}
    </span>
  );
}

function MobileNavButton({ label, icon, active = false, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className={`mobile-nav-button ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="mobile-nav-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const DUE_PRESET_OPTIONS = [
  { key: 'today', label: 'Today', hint: 'T' },
  { key: 'tomorrow', label: 'Tmrw', hint: 'Y' },
  { key: 'end-of-week', label: 'Fri', hint: 'E' },
  { key: 'next-week', label: 'Mon', hint: 'W' },
];

function KeyHint({ keys, subtle = false }) {
  return (
    <span className={`keyhint ${subtle ? 'keyhint-subtle' : ''}`}>
      {keys}
    </span>
  );
}

function DuePresetButtons({ onSelect }) {
  return (
    <div className="due-preset-row">
      {DUE_PRESET_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className="due-preset-button"
          onClick={() => onSelect(option.key)}
        >
          <span>{option.label}</span>
          <span className="due-preset-hint">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

function ProjectPopover({
  open,
  options,
  query,
  setQuery,
  highlightedIndex,
  onSelect,
  onClose,
  searchRef,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="popover project-popover" role="dialog" aria-modal="false">
      <div className="popover-header">
        <div>
          <div className="detail-label">Projects</div>
          <h3>Jump to a project</h3>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close project chooser">Close</button>
      </div>
      <input
        ref={searchRef}
        className="popover-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search projects..."
      />
      <div className="popover-meta">Press J to open, arrows to move, Enter to select.</div>
      <div className="popover-list">
        {loading ? (
          <>
            <div className="skeleton-line popover-skeleton" />
            <div className="skeleton-line popover-skeleton" />
            <div className="skeleton-line popover-skeleton" />
          </>
        ) : options.length ? (
          options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={`popover-option ${index === highlightedIndex ? 'active' : ''}`}
              onClick={() => onSelect(option.id)}
            >
              <span className="project-option-left">
                <span className="project-swatch" style={{ background: option.color_hex || '#73D1F6' }} />
                <span>{option.name}</span>
              </span>
              {option.id ? <span className="mini-meta">Project</span> : <span className="mini-meta">All</span>}
            </button>
          ))
        ) : (
          <div className="empty-inline">No projects match that search.</div>
        )}
      </div>
    </div>
  );
}

function TaskSectionSkeleton() {
  return (
    <section className="task-section skeleton-block">
      <div className="task-section-header">
        <div>
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-copy" />
        </div>
        <div className="task-section-count skeleton-pill" />
      </div>
      <div className="project-groups">
        {[0, 1].map((groupIndex) => (
          <div key={groupIndex} className="project-group">
            <div className="project-group-header">
              <div className="project-group-title">
                <span className="project-swatch skeleton-pill" />
                <div className="skeleton-line skeleton-row-title" />
              </div>
            </div>
            {[0, 1, 2].map((rowIndex) => (
              <div key={rowIndex} className="task-row skeleton-row">
                <div className="skeleton-circle" />
                <div className="task-row-body">
                  <div className="skeleton-line skeleton-row-title" />
                  <div className="skeleton-line skeleton-row-meta" />
                </div>
                <div className="task-row-right">
                  <div className="skeleton-pill" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="expanded-detail task-detail-skeleton">
      <div className="detail-main">
        <div className="skeleton-line skeleton-title" />
        <div className="detail-section">
          <div className="skeleton-line skeleton-label" />
          <div className="skeleton-box skeleton-notes" />
        </div>
        <div className="detail-section">
          <div className="skeleton-line skeleton-label" />
          <div className="mini-list">
            <div className="attachment-item skeleton-box" />
            <div className="attachment-item skeleton-box" />
            <div className="attachment-item skeleton-box" />
          </div>
        </div>
      </div>
      <div className="detail-side">
        <div className="detail-grid">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="detail-section">
              <div className="skeleton-line skeleton-label" />
              <div className="skeleton-box skeleton-input" />
            </div>
          ))}
        </div>
        <div className="detail-section">
          <div className="skeleton-line skeleton-label" />
          <div className="skeleton-box skeleton-follow-up" />
        </div>
        <div className="action-buttons">
          <div className="skeleton-button" />
          <div className="skeleton-button" />
        </div>
      </div>
    </div>
  );
}

// Swipe-down-to-dismiss for bottom-sheet panels on mobile. Drag only begins
// when the panel is scrolled to the top, so it doesn't fight content scrolling.
function useSwipeDownToClose(onClose) {
  const [dragY, setDragY] = useState(0);
  const startRef = useRef(null);
  const draggingRef = useRef(false);

  function onTouchStart(e) {
    if (e.currentTarget.scrollTop > 0) return;
    startRef.current = e.touches[0].clientY;
    draggingRef.current = true;
  }
  function onTouchMove(e) {
    if (!draggingRef.current || startRef.current === null) return;
    const delta = e.touches[0].clientY - startRef.current;
    if (delta > 0) {
      setDragY(delta);
    } else if (dragY !== 0) {
      setDragY(0);
    }
  }
  function onTouchEnd() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    startRef.current = null;
    if (dragY > 110) onClose();
    else setDragY(0);
  }

  return {
    style: {
      transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
      transition: draggingRef.current ? 'none' : 'transform 0.24s cubic-bezier(0.22,1,0.36,1)',
    },
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

function WorkPanel({ open, onClose, loading = false, summary }) {
  const swipe = useSwipeDownToClose(onClose);
  if (!open) return null;

  const periods = summary?.periods || {};
  const trends = summary?.trends || {};
  const recommendations = summary?.recommendations || [];
  const weeklyPattern = trends.weekly_pattern || [];
  const hourlyPattern = trends.hourly_pattern || [];
  const weeklyMax = Math.max(...weeklyPattern.map((item) => item.total), 1);
  const topHours = [...hourlyPattern]
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total)
    .slice(0, 4);
  const cards = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div className="work-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}
        style={swipe.style} {...swipe.handlers}>
        <div className="settings-header">
          <div>
            <div className="detail-label">Dailey Work</div>
            <h2>Your work log</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <div className="work-grid">
            {[0, 1, 2, 3].map((index) => (
              <section key={index} className="settings-card skeleton-block">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-copy" />
                <div className="skeleton-box work-skeleton-card" />
              </section>
            ))}
          </div>
        ) : (
          <>
            <div className="work-grid">
              {cards.map((card) => {
                const period = periods[card.key] || {};
                return (
                  <section key={card.key} className="settings-card work-card accent-card">
                    <div className="section-heading">{card.label}</div>
                    <div className="work-metric-grid">
                      <div className="work-metric">
                        <strong>{period.created || 0}</strong>
                        <span>Created</span>
                      </div>
                      <div className="work-metric">
                        <strong>{period.completed || 0}</strong>
                        <span>Finished</span>
                      </div>
                      <div className="work-metric">
                        <strong>{period.delegated || 0}</strong>
                        <span>Delegated</span>
                      </div>
                      <div className="work-metric">
                        <strong>{period.blitzes || 0}</strong>
                        <span>Blitzes</span>
                      </div>
                    </div>
                    <div className="work-summary-list">
                      <div><span>App time</span><strong>{formatMinutes(period.active_minutes)}</strong></div>
                      <div><span>Estimated task effort</span><strong>{formatMinutes(period.estimated_task_minutes)}</strong></div>
                      <div><span>Tasks touched</span><strong>{period.tasks_touched || 0}</strong></div>
                      <div><span>Blitz completions</span><strong>{period.blitz_completed_count || 0}</strong></div>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="settings-grid work-detail-grid">
              <section className="settings-card">
                <div className="section-heading">Trends</div>
                <div className="mini-list">
                  <div className="mini-item">
                    <div>
                      <div className="mini-title">Best day</div>
                      <div className="mini-meta">Most logged task activity in the last 90 days.</div>
                    </div>
                    <strong>{trends.busiest_day ? `${trends.busiest_day.label} (${trends.busiest_day.total})` : 'No signal yet'}</strong>
                  </div>
                  <div className="mini-item">
                    <div>
                      <div className="mini-title">Best hour</div>
                      <div className="mini-meta">When you usually move the most work.</div>
                    </div>
                    <strong>{trends.busiest_hour ? `${trends.busiest_hour.label} (${trends.busiest_hour.total})` : 'No signal yet'}</strong>
                  </div>
                </div>
                <div className="pattern-heading">
                  <div className="mini-title">Weekly activity</div>
                  <div className="mini-meta">Scaled to your busiest day so the shape is readable.</div>
                </div>
                <div className="pattern-grid">
                  {weeklyPattern.map((item) => (
                    <div key={item.label} className="pattern-bar">
                      <span>{item.label}</span>
                      <div>
                        <i
                          style={{
                            height: `${item.total ? Math.max(6, Math.round((item.total / weeklyMax) * 100)) : 2}%`,
                          }}
                        />
                      </div>
                      <strong>{item.total}</strong>
                    </div>
                  ))}
                </div>
                <div className="trend-chip-row">
                  {topHours.length ? topHours.map((item) => (
                    <div key={item.label} className="trend-chip">
                      <span>{item.label}</span>
                      <strong>{item.total}</strong>
                    </div>
                  )) : (
                    <div className="empty-inline">Peak hours will show up once there is more activity history.</div>
                  )}
                </div>
              </section>

              <section className="settings-card">
                <div className="section-heading">Projects With The Most Work</div>
                <div className="mini-list">
                  {(trends.top_projects || []).length ? trends.top_projects.map((project) => (
                    <div key={project.id} className="mini-item">
                      <div>
                        <div className="mini-title">{project.name}</div>
                        <div className="mini-meta">
                          {project.created_count || 0} created • {project.completed_count || 0} completed
                        </div>
                      </div>
                      <strong>{project.total_activity}</strong>
                    </div>
                  )) : (
                    <div className="empty-inline">Not enough work history yet.</div>
                  )}
                </div>
              </section>

              <section className="settings-card">
                <div className="section-heading">Rolling To Do Suggestions</div>
                <div className="mini-list">
                  {recommendations.length ? recommendations.map((item) => (
                    <div key={item.key} className="mini-item">
                      <div>
                        <div className="mini-title">{item.title}</div>
                        <div className="mini-meta">
                          {item.project_name} • {item.occurrences} times • {item.cadence}
                        </div>
                      </div>
                      <strong>{item.next_window}</strong>
                    </div>
                  )) : (
                    <div className="empty-inline">Recurring work will appear here once the app sees enough repeated patterns.</div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TaskRow = React.memo(function TaskRow({
  task,
  expanded,
  onToggle,
  onToggleComplete,
  onTogglePin,
  onFocus,
  rowRefs,
  disabled = false,
  highlighted = false,
  projectColor = '#73D1F6',
}) {
  const subtaskCount = countDescendantTasks(task);
  const openSubtaskCount = countOpenDescendantTasks(task);
  const blockedBySubtasks = task.status !== 'completed' && openSubtaskCount > 0;

  function handleKeyDown(event) {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(task.id);
    }
  }

  const urgent = isDueUrgent(task.due_date);
  const overdue = isDueOverdue(task.due_date);

  const rowClassName = [
    'row',
    expanded ? 'selected' : '',
    disabled ? 'disabled' : '',
    highlighted ? 'selected' : '',
    overdue && task.status !== 'completed' ? 'overdue' : '',
    task.status === 'completed' ? 'done-row' : '',
  ].filter(Boolean).join(' ');

  const dueLabel = buildTaskMeta(task);

  return (
    <div
      className={rowClassName}
      style={{ '--project-accent': projectColor }}
      onClick={() => { if (!disabled) onToggle(task.id); }}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocus?.(task.id)}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      ref={(element) => {
        if (element) rowRefs.current[task.id] = element;
      }}
    >
      <input
        type="checkbox"
        className="row-check task-checkbox"
        checked={task.status === 'completed'}
        disabled={disabled || blockedBySubtasks}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onToggleComplete(task, event.target.checked)}
        aria-label={blockedBySubtasks ? `Finish subtasks before completing ${task.title}` : `Mark ${task.title} complete`}
        title={blockedBySubtasks ? 'Finish the open subtasks first.' : undefined}
      />

      <span className="project-swatch" style={{ background: projectColor }} />

      <span className="row-title">{task.title}</span>

      {task.status === 'completed' ? null : (
        <span className={`row-meta${urgent ? ' task-meta-urgent' : ''}`}>{dueLabel}</span>
      )}

      <div className="row-actions">
        <button
          type="button"
          className={`row-act${task.is_pinned ? ' pinned' : ''}`}
          disabled={disabled}
          aria-label={task.is_pinned ? 'Unpin task' : 'Pin task'}
          title={task.is_pinned ? 'Pinned' : 'Pin'}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin(task);
          }}
        >
          {task.is_pinned ? <FaThumbtack className="row-pin-icon" aria-hidden="true" focusable="false" /> : 'Pin'}
        </button>
        {subtaskCount ? (
          <div className={`subtask-badge${blockedBySubtasks ? ' blocked' : ''}`}>
            {blockedBySubtasks ? <FaLock aria-hidden="true" focusable="false" /> : null}
            <span>
              {blockedBySubtasks
                ? `${openSubtaskCount} sub`
                : `${subtaskCount} sub`}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
});

const SubtaskTodoRow = React.memo(function SubtaskTodoRow({
  task,
  members,
  onToggleComplete,
  onAssigneeChange,
}) {
  const due = formatDueDate(task.due_date) || 'Due today';
  const assignee = task.assigned_to_name || task.assigned_to || 'Unassigned';

  return (
    <div className={`subtask-todo-row ${task.status === 'completed' ? 'completed' : ''}`}>
      <label className="subtask-todo-check">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(event) => onToggleComplete(task, event.target.checked)}
        />
      </label>

      <div className="subtask-todo-body">
        <div className="subtask-todo-title-line">
          <span className="task-chip subtask-type-chip">Subtask</span>
          <span className="subtask-todo-title">{task.title}</span>
          <PriorityBadge priority={task.priority} subtle />
        </div>
        <div className="subtask-todo-meta">
          {assignee} • {due}
        </div>
      </div>

      <select
        className="subtask-assignee"
        value={task.assigned_to}
        onChange={(event) => onAssigneeChange(task, event.target.value)}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>{member.display_name}</option>
        ))}
      </select>
    </div>
  );
});

// Natural language date parsing
let chronoModule = null;
async function parseDateFromText(text) {
  if (!chronoModule) {
    try { chronoModule = await import('chrono-node'); } catch { return null; }
  }
  const results = chronoModule.parse(text, new Date(), { forwardDate: true });
  if (!results.length) return null;
  const parsed = results[0];
  const date = parsed.start.date();
  const dateStr = date.toISOString().split('T')[0];
  // Extract the matched text so we can strip it from the title
  return { date: dateStr, matchedText: parsed.text, index: parsed.index };
}

const CreateTaskDetail = React.memo(function CreateTaskDetail({
  draft,
  setDraft,
  projects,
  members,
  onCreate,
  onClose,
  titleRef,
}) {
  const projectFieldRef = useRef(null);
  const assigneeFieldRef = useRef(null);
  const priorityFieldRef = useRef(null);
  const dueDateFieldRef = useRef(null);
  const [dateHint, setDateHint] = useState(null); // { date, matchedText }
  const dateHintTimer = useRef(null);

  function handleTitleChange(event) {
    let value = event.target.value;
    let draftUpdates = { title: value };

    // Instant keyword: "today" → set due date immediately, strip from title
    const todayMatch = value.match(/\btoday\b/i);
    if (todayMatch) {
      draftUpdates.due_date = getDuePresetValue('today');
      value = value.replace(/\btoday\b/i, '').replace(/\s{2,}/g, ' ').trim();
      draftUpdates.title = value;
    }

    // Instant keyword: "tomorrow" / "tmrw" → set due date immediately
    const tmrwMatch = value.match(/\b(tomorrow|tmrw)\b/i);
    if (tmrwMatch) {
      draftUpdates.due_date = getDuePresetValue('tomorrow');
      value = value.replace(/\b(tomorrow|tmrw)\b/i, '').replace(/\s{2,}/g, ' ').trim();
      draftUpdates.title = value;
    }

    // Slash command: /projectname → match against projects, set project_id
    const slashMatch = value.match(/\/(\S+)/);
    if (slashMatch) {
      const query = slashMatch[1].toLowerCase();
      const matched = projects.find(p =>
        p.name.toLowerCase().startsWith(query) ||
        p.name.toLowerCase().replace(/\s+/g, '').startsWith(query) ||
        p.name.toLowerCase().replace(/\s+/g, '-').startsWith(query)
      );
      if (matched) {
        draftUpdates.project_id = matched.id;
        value = value.replace(slashMatch[0], '').replace(/\s{2,}/g, ' ').trim();
        draftUpdates.title = value;
      }
    }

    // Priority shortcuts: !high !medium !low !1 !2 !3
    const prioMatch = value.match(/!(high|medium|low|1|2|3)\b/i);
    if (prioMatch) {
      const prioMap = { high: 'high', '1': 'high', medium: 'medium', '2': 'medium', low: 'low', '3': 'low' };
      draftUpdates.priority = prioMap[prioMatch[1].toLowerCase()] || 'low';
      value = value.replace(prioMatch[0], '').replace(/\s{2,}/g, ' ').trim();
      draftUpdates.title = value;
    }

    setDraft((current) => ({ ...current, ...draftUpdates }));

    // Debounce chrono parsing for complex dates (skip if we already matched a keyword)
    if (!todayMatch && !tmrwMatch) {
      if (dateHintTimer.current) clearTimeout(dateHintTimer.current);
      dateHintTimer.current = setTimeout(async () => {
        const result = await parseDateFromText(draftUpdates.title || value);
        if (result) {
          setDateHint(result);
        } else {
          setDateHint(null);
        }
      }, 400);
    } else {
      setDateHint(null);
    }
  }

  function acceptDateHint() {
    if (!dateHint) return;
    setDraft((current) => ({
      ...current,
      due_date: dateHint.date,
      // Strip the date text from the title
      title: current.title.replace(dateHint.matchedText, '').replace(/\s{2,}/g, ' ').trim(),
    }));
    setDateHint(null);
  }

  function applyDuePreset(preset) {
    setDraft((current) => ({ ...current, due_date: getDuePresetValue(preset) }));
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const code = event.code || '';
      const codeKey = code.replace('Key', '').replace('Digit', '').toLowerCase();

      // Tab or Enter accepts the date hint
      if (dateHint && (event.key === 'Tab' || event.key === 'Enter') && document.activeElement === titleRef.current) {
        event.preventDefault();
        acceptDateHint();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        onCreate();
        return;
      }

      if (!event.altKey) return;

      const altActions = {
        l: () => { projectFieldRef.current?.focus(); projectFieldRef.current?.click(); },
        a: () => { assigneeFieldRef.current?.focus(); assigneeFieldRef.current?.click(); },
        d: () => dueDateFieldRef.current?.focus(),
        '1': () => { setDraft((c) => ({ ...c, priority: 'high' })); priorityFieldRef.current?.focus(); },
        '2': () => { setDraft((c) => ({ ...c, priority: 'medium' })); priorityFieldRef.current?.focus(); },
        '3': () => { setDraft((c) => ({ ...c, priority: 'low' })); priorityFieldRef.current?.focus(); },
        t: () => { applyDuePreset('today'); dueDateFieldRef.current?.focus(); },
        y: () => { applyDuePreset('tomorrow'); dueDateFieldRef.current?.focus(); },
        e: () => { applyDuePreset('end-of-week'); dueDateFieldRef.current?.focus(); },
        w: () => { applyDuePreset('next-week'); dueDateFieldRef.current?.focus(); },
      };

      const action = altActions[codeKey];
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        action();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCreate, setDraft]);

  const [openChip, setOpenChip] = useState(null);
  const prio = priorityMeta(draft.priority);
  const selProject = projects.find(p => p.id === draft.project_id);
  const selMember  = members.find(m => String(m.id) === String(draft.assigned_to));

  function toggleChip(name) {
    setOpenChip(c => (c === name ? null : name));
  }

  return (
    <>
      {openChip && <div className="chip-popcatch" onClick={() => setOpenChip(null)} />}

      {/* Header */}
      <div className="tm-head">
        <span className="section-label" style={{ color: 'var(--accent)' }}>New task</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="dd-icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="tm-body">
        <div style={{ padding: '4px 18px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            className="tm-title"
            value={draft.title}
            onChange={handleTitleChange}
            placeholder="What needs to happen next?"
            style={{ fontSize: 22, fontWeight: 700, paddingTop: 8 }}
          />

          {dateHint && (
            <button type="button" className="date-hint-bar" onClick={acceptDateHint}>
              <span className="date-hint-icon">📅</span>
              <span>Set due to <strong>{new Date(dateHint.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong></span>
              <span className="date-hint-from">"{dateHint.matchedText}"</span>
              <span className="date-hint-accept">↵</span>
            </button>
          )}

          {/* Property chips */}
          <div className="tm-chips">
            {/* Project */}
            <ChipField
              color={selProject ? selProject.color_hex : 'var(--fg-faint)'}
              label={selProject ? selProject.name : 'Project'}
              isOpen={openChip === 'project'}
              onOpen={() => toggleChip('project')}
            >
              {projects.map(p => (
                <button key={p.id} type="button" className={`pop-opt${draft.project_id === p.id ? ' on' : ''}`}
                  onClick={() => { setDraft(c => ({ ...c, project_id: p.id })); setOpenChip(null); }}>
                  <span className="chip-dot" style={{ background: p.color_hex }} />{p.name}
                </button>
              ))}
            </ChipField>

            {/* Assignee */}
            <ChipField
              iconName="user"
              label={selMember ? selMember.display_name : 'Assignee'}
              isOpen={openChip === 'assignee'}
              onOpen={() => toggleChip('assignee')}
            >
              {members.map(m => (
                <button key={m.id} type="button" className={`pop-opt${String(draft.assigned_to) === String(m.id) ? ' on' : ''}`}
                  onClick={() => { setDraft(c => ({ ...c, assigned_to: m.id })); setOpenChip(null); }}>
                  {m.display_name}<span className="pop-sub">{m.role || ''}</span>
                </button>
              ))}
            </ChipField>

            {/* Priority */}
            <ChipField
              iconName="flag"
              label={prio.label}
              tone={prio.tone}
              isOpen={openChip === 'priority'}
              onOpen={() => toggleChip('priority')}
            >
              {[['high','High','bad','↑'],['medium','Med','warn','→'],['low','Low','','↓']].map(([v, l, t, a]) => (
                <button key={v} type="button" className={`pop-opt${draft.priority === v ? ' on' : ''}`}
                  onClick={() => { setDraft(c => ({ ...c, priority: v })); setOpenChip(null); }}>
                  <span className={`mono ${t}`} style={{ width: 14, textAlign: 'center' }}>{a}</span>{l}
                </button>
              ))}
            </ChipField>

            {/* Due date */}
            <ChipField
              iconName="calendar"
              label={draft.due_date ? formatDueDate(new Date(draft.due_date + 'T12:00:00')) : 'No date'}
              isOpen={openChip === 'due'}
              onOpen={() => toggleChip('due')}
            >
              <div className="pop-quick">
                {[['today','Today'],['tomorrow','Tmrw'],['end-of-week','Fri'],['next-week','Mon']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { applyDuePreset(k); setOpenChip(null); }}>{l}</button>
                ))}
              </div>
              <input type="date" className="pop-date" value={draft.due_date}
                onChange={e => { setDraft(c => ({ ...c, due_date: e.target.value })); setOpenChip(null); }} />
              {draft.due_date && (
                <button type="button" className="pop-clear" onClick={() => { setDraft(c => ({ ...c, due_date: '' })); setOpenChip(null); }}>Clear date</button>
              )}
            </ChipField>

            {/* Pin */}
            <ChipField
              iconName="pin"
              label={draft.is_pinned ? 'Pinned' : 'Pin'}
              isOpen={false}
              onOpen={() => setDraft(c => ({ ...c, is_pinned: !c.is_pinned }))}
            />
          </div>

          {/* Notes */}
          <div className="tm-field">
            <div className="tm-flabel">Notes <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-faint)', textTransform: 'none', letterSpacing: 0 }}>⌥N · markdown</span></div>
            <textarea className="tm-notes" value={draft.description}
              onChange={e => setDraft(c => ({ ...c, description: e.target.value }))}
              placeholder="Add context, links, or a follow-up…" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="tm-foot">
        <span className="mono tm-foot-keys"><span className="kbd">⌘↵</span> create · <span className="kbd">esc</span> close</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="dd-ghostbtn" onClick={onClose}>Cancel</button>
        <button type="button" className="dd-keybtn primary" style={{ padding: '8px 18px' }} onClick={onCreate}>Create task</button>
      </div>
    </>
  );
});

const TaskDetail = React.memo(function TaskDetail({
  task,
  projects,
  members,
  canClose,
  onClose,
  onRefresh,
  onTaskUpdate,
  onToggleComplete,
  onError,
  onAfterSave,
  blitzActive = false,
  blitzRemainingSeconds = 0,
  blitzExpired = false,
}) {
  const [draft, setDraft] = useState(makeTaskDraft(task));
  const [saveState, setSaveState] = useState('idle');
  const [notesEditing, setNotesEditing] = useState(!task?.description?.trim());
  const [noteDraft, setNoteDraft] = useState(task?.description || '');
  const [subtaskDraft, setSubtaskDraft] = useState({
    title: '',
    assigned_to: task?.assigned_to || '',
  });
  const [waitingSubmitting, setWaitingSubmitting] = useState(false);
  const [waitingDraft, setWaitingDraft] = useState({
    waiting_on_user_id: '',
    expected_response_date: '',
  });
  const titleInputRef = useRef(null);
  const notesRef = useRef(null);
  const statusFieldRef = useRef(null);
  const priorityFieldRef = useRef(null);
  const assigneeFieldRef = useRef(null);
  const projectFieldRef = useRef(null);
  const dueDateFieldRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const saveRequestRef = useRef(0);
  const saveStateTimeoutRef = useRef(null);
  const skipAutosaveKeyRef = useRef('');
  const openSubtaskCount = countOpenDescendantTasks(task);
  const completionBlocked = task.status !== 'completed' && openSubtaskCount > 0;

  useEffect(() => {
    setDraft(makeTaskDraft(task));
    setSubtaskDraft({
      title: '',
      assigned_to: task?.assigned_to || '',
    });
    setWaitingDraft({
      waiting_on_user_id: '',
      expected_response_date: '',
    });
    setWaitingSubmitting(false);
    setSaveState('idle');
    window.clearTimeout(saveTimeoutRef.current);
    window.clearTimeout(saveStateTimeoutRef.current);
  }, [task?.id]);

  useEffect(() => {
    setNoteDraft(task?.description || '');
    setNotesEditing(!task?.description?.trim());
  }, [task?.id, task?.description]);

  // Grow the notes textarea to fit its content so nothing is hidden behind a scrollbar.
  function autoSizeNotes() {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (notesEditing) autoSizeNotes();
  }, [notesEditing, noteDraft]);

  useEffect(() => {
    window.setTimeout(() => {
      const el = titleInputRef.current;
      if (!el) return;
      // Don't auto-focus on mobile (keyboard pops up), just reset scroll to start
      const isMobile = window.innerWidth <= 640;
      if (!isMobile) el.focus();
      el.setSelectionRange(0, 0);
      el.scrollLeft = 0;
    }, 50);
  }, [task?.id]);

  const patch = buildTaskPatch(task, draft);
  const isDirty = Object.keys(patch).length > 0;
  const patchKey = JSON.stringify(patch);

  function setSavedNotice() {
    setSaveState('saved');
    window.clearTimeout(saveStateTimeoutRef.current);
    saveStateTimeoutRef.current = window.setTimeout(() => {
      setSaveState((current) => (current === 'saved' ? 'idle' : current));
    }, 1600);
  }

  function updateDraftValue(field, value, { immediate = false } = {}) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    if (immediate) {
      window.clearTimeout(saveTimeoutRef.current);
      const nextPatch = buildTaskPatch(task, nextDraft);
      if (Object.keys(nextPatch).length) {
        skipAutosaveKeyRef.current = JSON.stringify(nextPatch);
        void commitPatch(nextPatch);
      }
    }
  }

  function applyDuePreset(preset, { immediate = false } = {}) {
    updateDraftValue('due_date', getDuePresetValue(preset), { immediate });
  }

  async function commitPatch(patchToSave) {
    if (!Object.keys(patchToSave).length) return;

    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    setSaveState('saving');

    try {
      const response = await apiFetch(`/tasks/${task.id}`, {
        method: 'PUT',
        json: patchToSave,
      });

      const nextTask = {
        ...task,
        ...patchToSave,
        ...(response?.data || {}),
      };

      onTaskUpdate?.(nextTask);

      if (onAfterSave) {
        await onAfterSave({
          previousTask: task,
          nextTask,
          patch: patchToSave,
        });
      }

      if (saveRequestRef.current === requestId) {
        setSavedNotice();
      }
    } catch (error) {
      if (saveRequestRef.current === requestId) {
        setSaveState('error');
      }
      onError(error);
    }
  }

  function flushDraftSave() {
    window.clearTimeout(saveTimeoutRef.current);
    const nextPatch = buildTaskPatch(task, draft);
    if (Object.keys(nextPatch).length) {
      void commitPatch(nextPatch);
    }
  }

  async function handleSaveNote() {
    const nextDescription = noteDraft;
    const nextDraft = { ...draft, description: nextDescription };
    setDraft(nextDraft);
    window.clearTimeout(saveTimeoutRef.current);
    const nextPatch = buildTaskPatch(task, nextDraft);
    if (Object.keys(nextPatch).length) {
      skipAutosaveKeyRef.current = JSON.stringify(nextPatch);
      await commitPatch(nextPatch);
    }
    setNotesEditing(!nextDescription.trim());
  }

  function handleCancelNoteEdit() {
    setNoteDraft(draft.description || '');
    setNotesEditing(!draft.description?.trim());
  }

  useEffect(() => {
    window.clearTimeout(saveTimeoutRef.current);
    if (!isDirty) return undefined;
    if (skipAutosaveKeyRef.current && skipAutosaveKeyRef.current === patchKey) {
      skipAutosaveKeyRef.current = '';
      return undefined;
    }

    setSaveState((current) => (current === 'error' ? current : 'pending'));
    saveTimeoutRef.current = window.setTimeout(() => {
      void commitPatch(patch);
    }, 500);

    return () => window.clearTimeout(saveTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, patchKey]);

  useEffect(() => () => {
    window.clearTimeout(saveTimeoutRef.current);
    window.clearTimeout(saveStateTimeoutRef.current);
  }, []);

  async function handleAddSubtask(event) {
    event.preventDefault();
    if (!subtaskDraft.title.trim() || !subtaskDraft.assigned_to) return;

    try {
      await apiFetch(`/tasks/${task.id}/subtasks`, {
        method: 'POST',
        json: {
          title: subtaskDraft.title.trim(),
          description: '',
          project_id: draft.project_id || task.project_id,
          assigned_to: subtaskDraft.assigned_to,
          priority: 'low',
          due_date: fromDateInputValue(getDuePresetValue('today')),
        },
      });
      setSubtaskDraft({
        title: '',
        assigned_to: draft.assigned_to || task.assigned_to || '',
      });
      await onRefresh(task.id);
    } catch (error) {
      onError(error);
    }
  }

  async function handleToggleSubtask(child, checked) {
    try {
      if (checked) {
        await apiFetch(`/tasks/${child.id}/complete`, { method: 'PATCH' });
      } else {
        await apiFetch(`/tasks/${child.id}/status`, {
          method: 'PATCH',
          json: { status: 'active' },
        });
      }
      await onRefresh(task.id);
    } catch (error) {
      onError(error);
    }
  }

  async function handleSubtaskAssigneeChange(child, assignedTo) {
    try {
      await apiFetch(`/tasks/${child.id}`, {
        method: 'PUT',
        json: { assigned_to: assignedTo },
      });
      await onRefresh(task.id);
    } catch (error) {
      onError(error);
    }
  }

  async function handleUploadAttachment(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiFetch(`/tasks/${task.id}/attachments`, {
        method: 'POST',
        formData,
      });
      event.target.value = '';
      await onRefresh(task.id);
    } catch (error) {
      onError(error);
    }
  }

  async function handleAddWaiting(event) {
    event.preventDefault();
    if (!waitingDraft.waiting_on_user_id || waitingSubmitting) return;

    try {
      setWaitingSubmitting(true);
      await apiFetch(`/tasks/${task.id}/waiting-on`, {
        method: 'POST',
        json: {
          waiting_on_user_id: waitingDraft.waiting_on_user_id,
          expected_response_date: fromDateInputValue(waitingDraft.expected_response_date),
        },
      });
      setWaitingDraft({
        waiting_on_user_id: '',
        expected_response_date: '',
      });
      await onRefresh(task.id);
    } catch (error) {
      onError(error);
    } finally {
      setWaitingSubmitting(false);
    }
  }

  async function handleRemoveWaiting(waitingId) {
    try {
      await apiFetch(`/tasks/${task.id}/waiting-on/${waitingId}`, {
        method: 'DELETE',
      });
      await onRefresh(task.id);
    } catch (error) {
      onError(error);
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      // Use event.code for Alt/Option shortcuts (Mac turns Alt+key into special chars)
      const code = event.code || '';
      const codeKey = code.replace('Key', '').replace('Digit', '').toLowerCase();

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        flushDraftSave();
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        onToggleComplete(task, task.status !== 'completed');
        return;
      }

      if (!event.altKey) return;

      // Alt/Option shortcuts — use event.code so Mac special chars don't interfere
      const altActions = {
        l: () => { projectFieldRef.current?.focus(); projectFieldRef.current?.click(); },
        a: () => { assigneeFieldRef.current?.focus(); assigneeFieldRef.current?.click(); },
        d: () => dueDateFieldRef.current?.focus(),
        s: () => { statusFieldRef.current?.focus(); statusFieldRef.current?.click(); },
        n: () => setNotesEditing(true),
        '1': () => { setDraft((c) => ({ ...c, priority: 'high' })); priorityFieldRef.current?.focus(); },
        '2': () => { setDraft((c) => ({ ...c, priority: 'medium' })); priorityFieldRef.current?.focus(); },
        '3': () => { setDraft((c) => ({ ...c, priority: 'low' })); priorityFieldRef.current?.focus(); },
        t: () => { applyDuePreset('today'); dueDateFieldRef.current?.focus(); },
        y: () => { applyDuePreset('tomorrow'); dueDateFieldRef.current?.focus(); },
        e: () => { applyDuePreset('end-of-week'); dueDateFieldRef.current?.focus(); },
        w: () => { applyDuePreset('next-week'); dueDateFieldRef.current?.focus(); },
      };

      const action = altActions[codeKey];
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        // Blur any focused input first so the special char doesn't get inserted
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        action();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const [openChip, setOpenChip] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  function toggleChip(name) {
    setOpenChip(c => (c === name ? null : name));
  }

  const prio = priorityMeta(draft.priority);
  const selProject = projects.find(p => p.id === draft.project_id);
  const selMember  = members.find(m => String(m.id) === String(draft.assigned_to));
  const dueLabel   = draft.due_date ? formatDueDate(new Date(draft.due_date + 'T12:00:00')) : 'No date';
  const statusLabel = draft.status === 'done' ? 'Complete'
    : draft.status === 'completed' ? 'Complete'
    : draft.status === 'waiting' ? 'Waiting'
    : draft.status === 'paused' ? 'Paused'
    : 'Active';

  const autosaveLabel = saveState === 'pending' || saveState === 'saving' ? 'Saving…'
    : saveState === 'saved' ? 'Saved'
    : saveState === 'error' ? 'Not saved'
    : '';

  return (
    <>
      {openChip && <div className="chip-popcatch" onClick={() => setOpenChip(null)} />}

      {/* Header */}
      <div className="tm-head">
        <span className="section-label" style={{ color: 'var(--accent)' }}>Task</span>
        {task.id && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-faint)' }}>#{String(task.id).slice(-6)}</span>}
        {autosaveLabel ? <span className="mono" style={{ fontSize: 10, color: saveState === 'error' ? 'var(--bad)' : 'var(--ok)' }}>{autosaveLabel}</span> : null}
        <div style={{ flex: 1 }} />
        <button type="button" className={`dd-icon-btn${draft.is_pinned ? ' active' : ''}`} title={draft.is_pinned ? 'Pinned' : 'Pin to top'}
          onClick={() => updateDraftValue('is_pinned', !draft.is_pinned, { immediate: true })}>
          <FaThumbtack size={14} />
        </button>
        {canClose && (
          <button type="button" className="dd-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        )}
        {!canClose && (
          <div className="task-modal-lock" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-3)' }}>
            <FaLock size={12} /><span>Locked</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="tm-body">
        <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Blitz inline card */}
          {blitzActive ? (
            <div className={`blitz-inline-card${blitzExpired ? ' expired' : ''}`}>
              <div className="blitz-inline-header">
                <span className="blitz-inline-label"><BlitzBoltIcon style={{ width: 13, height: 13 }} /> Blitz Focus</span>
                <span className={`blitz-inline-timer${blitzExpired ? ' expired' : ''}`}>
                  {blitzExpired ? 'Time is up' : formatCountdown(blitzRemainingSeconds)}
                </span>
              </div>
              <div className="mini-meta">
                {blitzExpired ? 'The Blitz window ended. Wrap up, hold, or end the session.' : 'Stay on this until it moves.'}
              </div>
            </div>
          ) : null}

          {/* Title row: tick + input */}
          <div className="tm-titlerow">
            <button type="button"
              className={`tm-tick${task.status === 'completed' ? ' done' : ''}${completionBlocked ? '' : ''}`}
              disabled={completionBlocked}
              title={completionBlocked ? `Finish ${openSubtaskCount} subtask${openSubtaskCount !== 1 ? 's' : ''} first` : 'Mark complete (⌘↵)'}
              onClick={() => onToggleComplete(task, task.status !== 'completed')}>
              {task.status === 'completed' && <Icon name="check" size={12} />}
            </button>
            <input
              ref={titleInputRef}
              type="text"
              className={`tm-title${task.status === 'completed' ? ' done' : ''}`}
              value={draft.title}
              onChange={e => updateDraftValue('title', e.target.value)}
              onBlur={flushDraftSave}
              placeholder="Task title"
            />
          </div>

          {/* Property chips */}
          <div className="tm-chips">
            {/* Project */}
            <ChipField
              color={selProject ? selProject.color_hex : 'var(--fg-faint)'}
              label={selProject ? selProject.name : 'No project'}
              isOpen={openChip === 'project'}
              onOpen={() => toggleChip('project')}
            >
              {projects.map(p => (
                <button key={p.id} type="button" className={`pop-opt${draft.project_id === p.id ? ' on' : ''}`}
                  onClick={() => { updateDraftValue('project_id', p.id, { immediate: true }); setOpenChip(null); }}>
                  <span className="chip-dot" style={{ background: p.color_hex }} />{p.name}
                </button>
              ))}
            </ChipField>

            {/* Assignee */}
            <ChipField
              iconName="user"
              label={selMember ? selMember.display_name : 'Unassigned'}
              isOpen={openChip === 'assignee'}
              onOpen={() => toggleChip('assignee')}
            >
              {members.map(m => (
                <button key={m.id} type="button" className={`pop-opt${String(draft.assigned_to) === String(m.id) ? ' on' : ''}`}
                  onClick={() => { updateDraftValue('assigned_to', m.id, { immediate: true }); setOpenChip(null); }}>
                  {m.display_name}<span className="pop-sub">{m.role || ''}</span>
                </button>
              ))}
            </ChipField>

            {/* Priority */}
            <ChipField
              iconName="flag"
              label={prio.label}
              tone={prio.tone}
              isOpen={openChip === 'priority'}
              onOpen={() => toggleChip('priority')}
            >
              {[['high','High','bad','↑'],['medium','Med','warn','→'],['low','Low','','↓']].map(([v, l, t, a]) => (
                <button key={v} type="button" className={`pop-opt${draft.priority === v ? ' on' : ''}`}
                  onClick={() => { updateDraftValue('priority', v, { immediate: true }); setOpenChip(null); }}>
                  <span className={`mono ${t}`} style={{ width: 14, textAlign: 'center' }}>{a}</span>{l}
                </button>
              ))}
            </ChipField>

            {/* Due date */}
            <ChipField
              iconName="calendar"
              label={dueLabel}
              isOpen={openChip === 'due'}
              onOpen={() => toggleChip('due')}
            >
              <div className="pop-quick">
                {[['today','Today'],['tomorrow','Tmrw'],['end-of-week','Fri'],['next-week','Mon']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { applyDuePreset(k, { immediate: true }); setOpenChip(null); }}>{l}</button>
                ))}
              </div>
              <input type="date" className="pop-date" value={draft.due_date}
                onChange={e => { updateDraftValue('due_date', e.target.value, { immediate: true }); setOpenChip(null); }} />
              {draft.due_date && (
                <button type="button" className="pop-clear" onClick={() => { updateDraftValue('due_date', '', { immediate: true }); setOpenChip(null); }}>Clear date</button>
              )}
            </ChipField>

            {/* Status */}
            <ChipField
              iconName="clock"
              label={statusLabel}
              isOpen={openChip === 'status'}
              onOpen={() => toggleChip('status')}
            >
              {[['active','Active'],['waiting','Waiting'],['paused','Paused']].map(([v, l]) => (
                <button key={v} type="button" className={`pop-opt${draft.status === v ? ' on' : ''}`}
                  onClick={() => { updateDraftValue('status', v, { immediate: true }); setOpenChip(null); }}>
                  {l}
                </button>
              ))}
            </ChipField>
          </div>

          {/* Notes */}
          <div className="tm-field">
            <div className="tm-flabel">
              Notes
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-faint)', textTransform: 'none', letterSpacing: 0 }}>markdown · ⌥N</span>
              {!notesEditing && draft.description?.trim() ? (
                <button type="button" className="notes-toggle-button text-action" onClick={() => setNotesEditing(true)}>Edit</button>
              ) : null}
            </div>
            {notesEditing ? (
              <>
                <textarea ref={notesRef} className="tm-notes" value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onInput={autoSizeNotes}
                  placeholder={'Add context, links, or a follow-up…\n\n# Heading\n- Checklist item\n**Bold** text'} />
                <div className="notes-action-row">
                  {draft.description?.trim() ? <button type="button" className="dd-ghostbtn" onClick={handleCancelNoteEdit}>Cancel</button> : null}
                  <button type="button" className="dd-keybtn primary" style={{ padding: '7px 14px' }} onClick={handleSaveNote}>Save note</button>
                </div>
              </>
            ) : draft.description?.trim() ? (
              <div className="notes-preview-area" onClick={() => setNotesEditing(true)}>
                <NotesPreview value={draft.description} />
              </div>
            ) : null}
            {!notesEditing && !draft.description?.trim() ? (
              <button type="button" className="notes-preview-area" style={{ border: '1.5px dashed var(--line-strong)', background: 'transparent', cursor: 'text', textAlign: 'left' }} onClick={() => setNotesEditing(true)}>
                <span className="notes-placeholder-text">Add context, links, or a follow-up…</span>
              </button>
            ) : null}
          </div>

          {/* Subtasks */}
          <div className="tm-field">
            <div className="tm-flabel">
              Subtasks
              {(task.children || []).length > 0 && (
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-faint)', textTransform: 'none', letterSpacing: 0 }}>
                  {(task.children || []).filter(c => c.status === 'completed').length}/{(task.children || []).length}
                </span>
              )}
            </div>
            {(task.children || []).map(child => (
              <div className="tm-sub" key={child.id}>
                <button type="button" className={`tm-sub-check${child.status === 'completed' ? ' done' : ''}`}
                  onClick={() => handleToggleSubtask(child, child.status !== 'completed')}>
                  {child.status === 'completed' && <Icon name="check" size={11} />}
                </button>
                <span style={{ flex: 1, fontSize: 13, textDecoration: child.status === 'completed' ? 'line-through' : 'none', color: child.status === 'completed' ? 'var(--fg-3)' : 'var(--fg-1)' }}>
                  {child.title}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{child.assigned_to_name || ''}</span>
              </div>
            ))}
            <form className="tm-subadd" onSubmit={handleAddSubtask}>
              <Icon name="plus" size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
              <input value={subtaskDraft.title}
                placeholder="Add a subtask…"
                onChange={e => setSubtaskDraft(c => ({ ...c, title: e.target.value }))} />
              <select value={subtaskDraft.assigned_to} style={{ width: 'auto', height: 'auto', padding: '2px 4px', fontSize: 11, border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', color: 'var(--fg-2)' }}
                onChange={e => setSubtaskDraft(c => ({ ...c, assigned_to: e.target.value }))}>
                <option value="">Assign</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </form>
          </div>

          {/* More options */}
          <button type="button" className="tm-more" onClick={() => setMoreOpen(o => !o)}>
            <span className={`tm-more-chev${moreOpen ? ' open' : ''}`}>
              <Icon name="chevron" size={15} />
            </span>
            More options
            <span className="tm-more-sub">attachments · follow-up</span>
          </button>

          {moreOpen && (
            <div className="tm-advanced">
              {/* Attachments */}
              <div className="tm-adv-row">
                <div className="tm-flabel">Attachments</div>
                {(task.attachments || []).map(a => (
                  <button key={a.id} type="button" className="attachment-item"
                    onClick={() => downloadFile(`/tasks/${task.id}/attachments/${a.id}/download`)}>
                    {attachmentLabel(a)}
                  </button>
                ))}
                <label className="tm-upload">
                  <Icon name="paperclip" size={14} /> Upload a file
                  <input type="file" style={{ display: 'none' }} onChange={handleUploadAttachment} />
                </label>
              </div>

              {/* Follow-up / waiting */}
              <div className="tm-adv-row">
                <div className="tm-flabel">Follow Up</div>
                {(task.waiting_on || []).map(item => (
                  <div key={item.id} className="follow-up-item">
                    <div><strong>Waiting on:</strong> {item.waiting_on_user_name || item.waiting_on_user_id}</div>
                    {item.expected_response_date ? <div><strong>Expected:</strong> {formatDateTime(item.expected_response_date)}</div> : null}
                    <button type="button" className="text-action" onClick={() => handleRemoveWaiting(item.id)}>Clear</button>
                  </div>
                ))}
                <form className="stack-form" onSubmit={handleAddWaiting}>
                  <div className="tm-adv-inline">
                    <select value={waitingDraft.waiting_on_user_id}
                      onChange={e => setWaitingDraft(c => ({ ...c, waiting_on_user_id: e.target.value }))}>
                      <option value="">Waiting on…</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                    </select>
                    <input type="date" value={waitingDraft.expected_response_date}
                      onChange={e => setWaitingDraft(c => ({ ...c, expected_response_date: e.target.value }))} />
                  </div>
                  <button type="submit" className="dd-ghostbtn" disabled={!waitingDraft.waiting_on_user_id || waitingSubmitting}>
                    {waitingSubmitting ? 'Adding…' : 'Add Follow Up'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="tm-foot">
        <span className="mono tm-foot-keys"><span className="kbd">⌘↵</span> complete · <span className="kbd">esc</span> close</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="tm-delete" onClick={() => {
          if (window.confirm('Delete this task?')) {
            apiFetch(`/tasks/${task.id}`, { method: 'DELETE' }).then(() => {
              onClose();
              onRefresh('').catch(() => {});
            }).catch(onError);
          }
        }}>Delete</button>
        <button type="button" className="dd-keybtn primary tm-foot-done" style={{ padding: '8px 18px' }} onClick={onClose}>Done</button>
      </div>
    </>
  );
});

function SettingsPanel({
  open,
  onClose,
  user,
  projects,
  members,
  collaborators,
  projectsLoading,
  membersLoading,
  settingsProjectId,
  setSettingsProjectId,
  selectedProjectDraft,
  setSelectedProjectDraft,
  newProjectDraft,
  setNewProjectDraft,
  memberDraft,
  setMemberDraft,
  collaboratorId,
  setCollaboratorId,
  onCreateProject,
  onSaveProjectSettings,
  onAddMember,
  onRemoveMember,
  onAddCollaborator,
  onRemoveCollaborator,
  onLogout,
}) {
  const swipe = useSwipeDownToClose(onClose);
  if (!open) return null;

  const selectedProject = projects.find((project) => project.id === settingsProjectId) || null;
  const availableCollaborators = members.filter((member) => !collaborators.some((collaborator) => collaborator.id === member.id));

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div className="settings-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}
        style={swipe.style} {...swipe.handlers}>
        <div className="settings-header">
          <div>
            <div className="detail-label">Settings</div>
            <h2>Workspace settings</h2>
            <p className="settings-subtitle">Manage projects, collaborators, employees, and your Dailey Core session.</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="settings-summary-row">
          <div className="settings-summary-pill">
            <strong>{projects.length}</strong>
            <span>Projects</span>
          </div>
          <div className="settings-summary-pill">
            <strong>{members.length}</strong>
            <span>Employees</span>
          </div>
          <div className="settings-summary-pill">
            <strong>{user?.name || user?.email || 'Unknown user'}</strong>
            <span>Signed in with Core</span>
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <div className="settings-card-top">
              <div>
                <div className="section-heading">Projects</div>
                <h3>New project</h3>
              </div>
              <div className="mini-meta">Create a project and optionally make it Blitz-eligible.</div>
            </div>
            <div className="stack-form">
              <input
                type="text"
                placeholder="Project name"
                value={newProjectDraft.name}
                onChange={(event) => setNewProjectDraft((current) => ({ ...current, name: event.target.value }))}
              />
              <div className="inline-fields">
                <input
                  type="color"
                  value={newProjectDraft.color_hex}
                  onChange={(event) => setNewProjectDraft((current) => ({ ...current, color_hex: event.target.value }))}
                />
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={newProjectDraft.blitz_enabled}
                    onChange={(event) => setNewProjectDraft((current) => ({ ...current, blitz_enabled: event.target.checked }))}
                  />
                  <span>Enable Blitz</span>
                </label>
              </div>
              <button type="button" className="btn btn-primary" onClick={onCreateProject}>Create Project</button>
            </div>
          </section>

          <section className="settings-card settings-card-wide">
            <div className="settings-card-top">
              <div>
                <div className="section-heading">Project Access</div>
                <h3>Project access and collaborators</h3>
              </div>
              <div className="mini-meta">Rename, recolor, enable Blitz, and control who can collaborate.</div>
            </div>
            <div className="stack-form">
              <select value={settingsProjectId} onChange={(event) => setSettingsProjectId(event.target.value)}>
                <option value="">Choose project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>

              {projectsLoading ? (
                <div className="empty-inline">Loading projects...</div>
              ) : selectedProject ? (
                <>
                  <input
                    type="text"
                    value={selectedProjectDraft.name}
                    onChange={(event) => setSelectedProjectDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                  <div className="inline-fields">
                    <input
                      type="color"
                      value={selectedProjectDraft.color_hex}
                      onChange={(event) => setSelectedProjectDraft((current) => ({ ...current, color_hex: event.target.value }))}
                    />
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={selectedProjectDraft.blitz_enabled}
                        onChange={(event) => setSelectedProjectDraft((current) => ({ ...current, blitz_enabled: event.target.checked }))}
                      />
                      <span>Enable Blitz</span>
                    </label>
                  </div>
                  <button type="button" className="btn" onClick={onSaveProjectSettings}>Save Project</button>

                  <div className="mini-list">
                    {collaborators.length ? collaborators.map((collaborator) => (
                      <div key={collaborator.id} className="mini-item">
                        <div>
                          <div className="mini-title">{collaborator.display_name}</div>
                          <div className="mini-meta">{collaborator.role || 'member'}</div>
                        </div>
                        {String(collaborator.id) !== String(user?.id) ? (
                          <button type="button" className="text-action" onClick={() => onRemoveCollaborator(collaborator.id)}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    )) : (
                      <div className="empty-inline">No collaborators yet.</div>
                    )}
                  </div>

                  <div className="inline-fields">
                    <select value={collaboratorId} onChange={(event) => setCollaboratorId(event.target.value)}>
                      <option value="">Add collaborator</option>
                      {availableCollaborators.map((member) => (
                        <option key={member.id} value={member.id}>{member.display_name}</option>
                      ))}
                    </select>
                    <button type="button" className="btn" onClick={onAddCollaborator}>Add</button>
                  </div>
                </>
              ) : (
                <div className="empty-inline">Pick a project to manage collaborators and Blitz.</div>
              )}
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-top">
              <div>
                <div className="section-heading">Team</div>
                <h3>Employees</h3>
              </div>
              <div className="mini-meta">Add or remove workspace teammates who can be assigned work.</div>
            </div>
            <div className="stack-form">
              <input
                type="text"
                placeholder="Display name"
                value={memberDraft.display_name}
                onChange={(event) => setMemberDraft((current) => ({ ...current, display_name: event.target.value }))}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={memberDraft.email}
                onChange={(event) => setMemberDraft((current) => ({ ...current, email: event.target.value }))}
              />
              <select
                value={memberDraft.role}
                onChange={(event) => setMemberDraft((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="button" className="btn" onClick={onAddMember}>Add Employee</button>
            </div>

            <div className="mini-list">
              {membersLoading ? (
                <div className="empty-inline">Loading employees...</div>
              ) : members.map((member) => (
                <div key={member.id} className="mini-item">
                  <div>
                    <div className="mini-title">{member.display_name}</div>
                    <div className="mini-meta">{member.email || member.role}</div>
                  </div>
                  {String(member.id) !== String(user?.id) ? (
                    <button type="button" className="text-action danger-text" onClick={() => onRemoveMember(member.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="settings-card accent-card">
            <div className="settings-card-top">
              <div>
                <div className="section-heading">Account</div>
                <h3>Session</h3>
              </div>
              <div className="mini-meta">This session is backed by Dailey Core.</div>
            </div>
            <div className="account-card">
              <div className="account-name">{user?.name || user?.email}</div>
              <div className="mini-meta">Authenticated with Dailey Core</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={onLogout}>Logout</button>
          </section>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ open, canClose = true, onClose, loading = false, children }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      setDragY(0);
      closingRef.current = false;
    } else if (visible && !closingRef.current) {
      closingRef.current = true;
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
        closingRef.current = false;
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Lock background page scroll while the sheet is open so dragging/scrolling
  // the panel doesn't move the page behind it.
  useEffect(() => {
    if (!visible) return undefined;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      body.style.overflow = prevOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, [visible]);

  if (!visible) return null;

  function handleClose() {
    if (!canClose || closingRef.current) return;
    closingRef.current = true;
    setDragY(window.innerHeight); // fly down off screen
    setTimeout(() => {
      onClose();
      setVisible(false);
      setClosing(false);
      closingRef.current = false;
      setDragY(0);
    }, 220);
  }

  function onTouchStart(e) {
    // Only start drag from the pull-bar region (top 44px of modal)
    const modalEl = e.currentTarget;
    const modalTop = modalEl.getBoundingClientRect().top;
    const touchY = e.touches[0].clientY;
    if (touchY - modalTop > 44) return;
    dragStartRef.current = touchY;
    draggingRef.current = true;
  }

  function onTouchMove(e) {
    if (!draggingRef.current || dragStartRef.current === null) return;
    const delta = e.touches[0].clientY - dragStartRef.current;
    if (delta > 0) {
      setDragY(delta);
    }
  }

  function onTouchEnd() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragY > 100 && canClose) {
      handleClose();
    } else {
      setDragY(0);
    }
    dragStartRef.current = null;
  }

  const isDragging = dragY > 0;
  const modalStyle = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.22,1,0.36,1)',
    opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 300) : undefined,
  };

  return (
    <div
      className={`scrim task-modal-overlay${closing ? ' closing' : ''}`}
      role="presentation"
      onMouseDown={handleClose}
    >
      <div
        className={`tm task-modal${loading ? ' loading' : ''}${closing ? ' closing' : ''}`}
        role="dialog"
        aria-modal="true"
        style={modalStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading
          ? <div className="tm-body" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--fg-3)' }}>Loading…</div>
          : children
        }
      </div>
    </div>
  );
}

const GroupedTaskSection = React.memo(function GroupedTaskSection({
  title,
  subtitle,
  groups,
  renderTask,
  collapsed = false,
  onToggle,
}) {
  if (!groups.length) return null;

  const total = groups.reduce((count, group) => count + group.tasks.length, 0);

  return (
    <section className={`bucket${collapsed ? ' collapsed' : ''}`}>
      <div className="bucket-head" onClick={onToggle} aria-expanded={!collapsed}>
        <span className="bucket-chev" aria-hidden="true">
          <Icon name="chevron" size={15} />
        </span>
        <span className="bucket-name">{title}</span>
        {subtitle ? <span className="bucket-desc">{subtitle}</span> : null}
        <span className="bucket-count">{total}</span>
      </div>

      {!collapsed ? (
        <div className="bucket-body">
          <div className="project-groups">
            {groups.map((group) => (
              <div
                key={group.project.id}
                className="project-group"
                style={{ '--project-accent': getProjectColor(group.project) }}
              >
                <div className="pgroup-head">
                  <span className="project-swatch" style={{ background: getProjectColor(group.project) }} />
                  <span className="pgroup-name">{group.project.name}</span>
                  <span className="pgroup-count">{group.tasks.length}</span>
                </div>
                <div className="task-group">
                  {group.tasks.map(renderTask)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
});

export default function App() {
  const {
    loading,
    isAuthenticated,
    user,
    workspaceId,
    logout,
  } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const [tasks, setTasks] = useState([]);
  const recentCompletionsRef = useRef(new Map()); // taskId → timestamp — prevents stale API data from reverting optimistic completions
  const [tasksLoading, setTasksLoading] = useState(true);
  const [projectFilterId, setProjectFilterId] = useState('');
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [projectHighlightIndex, setProjectHighlightIndex] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState(makeCreateDraft());
  const [message, setMessage] = useState('');
  const [undoToast, setUndoToast] = useState(null); // { taskId, taskTitle, timer }
  const undoTimerRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dailey_due_theme') === 'dark');

  // Apply dark mode on mount and toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('dailey_due_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('dailey_due_theme', 'light');
    }
  }, [darkMode]);
  const [workOpen, setWorkOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workLoading, setWorkLoading] = useState(false);
  const [workSummary, setWorkSummary] = useState(null);
  const [newProjectDraft, setNewProjectDraft] = useState(makeProjectDraft());
  const [selectedProjectDraft, setSelectedProjectDraft] = useState(makeProjectDraft());
  const [memberDraft, setMemberDraft] = useState(makeMemberDraft());
  const [settingsProjectId, setSettingsProjectId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [focusedTaskId, setFocusedTaskId] = useState('');
  const [collapsedSections, setCollapsedSections] = useState(loadCollapsedSections);
  const [clockNow, setClockNow] = useState(Date.now());
  const [blitz, setBlitz] = useState({
    active: false,
    poolIds: [],
    focusTaskId: '',
    runId: '',
    completedCount: 0,
    holdingCount: 0,
    startedAt: 0,
    endsAt: 0,
  });
  const [blitzCelebration, setBlitzCelebration] = useState(null); // null | 'task-done' | 'blitz-done'
  const [blitzQuoteIndex, setBlitzQuoteIndex] = useState(() => Math.floor(Math.random() * BLITZ_QUOTES.length));
  const [blitzCongratIndex, setBlitzCongratIndex] = useState(0);
  const [blitzFinalStats, setBlitzFinalStats] = useState({ completed: 0, holding: 0, elapsed: 0 });
  const [blitzFocusTitleDraft, setBlitzFocusTitleDraft] = useState('');
  const [blitzFocusNotesDraft, setBlitzFocusNotesDraft] = useState('');
  const projectTriggerRef = useRef(null);
  const projectPickerRef = useRef(null);
  const projectSearchRef = useRef(null);
  const createTitleRef = useRef(null);
  const workSessionIdRef = useRef('');
  const rowRefs = useRef({});
  const listFrameRef = useRef(null);

  const projectById = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects]);
  const memberById = useMemo(() => Object.fromEntries(members.map((member) => [String(member.id), member])), [members]);

  const { activeTasks, pinnedTasks, readyTasks, tomorrowTasks, thisWeekTasks, laterTasks, holdingTasks, completedTasks } = useMemo(() => {
    const active = tasks.filter((task) => task.status !== 'completed');
    return {
      activeTasks: active,
      pinnedTasks: active.filter((task) => Boolean(task.is_pinned)),
      readyTasks: active.filter((task) => !task.is_pinned && task.status === 'active' && isDueTodayOrEarlier(task.due_date)),
      tomorrowTasks: active.filter((task) => !task.is_pinned && task.status === 'active' && isDueTomorrow(task.due_date)),
      thisWeekTasks: active.filter((task) => !task.is_pinned && task.status === 'active' && isDueThisWeek(task.due_date)),
      laterTasks: active.filter((task) => !task.is_pinned && task.status === 'active' && isDueLater(task.due_date)),
      holdingTasks: active.filter((task) => !task.is_pinned && ['waiting', 'paused'].includes(task.status)),
      completedTasks: tasks.filter((task) => task.status === 'completed'),
    };
  }, [tasks]);

  const { pinnedGroups, readyGroups, tomorrowGroups, thisWeekGroups, laterGroups, holdingGroups, completedGroups } = useMemo(() => ({
    pinnedGroups: groupTasksByProject(pinnedTasks, projectById),
    readyGroups: groupTasksByProject(readyTasks, projectById),
    tomorrowGroups: groupTasksByProject(tomorrowTasks, projectById),
    thisWeekGroups: groupTasksByProject(thisWeekTasks, projectById),
    laterGroups: groupTasksByProject(laterTasks, projectById),
    holdingGroups: groupTasksByProject(holdingTasks, projectById),
    completedGroups: groupTasksByProject(completedTasks, projectById),
  }), [pinnedTasks, readyTasks, tomorrowTasks, thisWeekTasks, laterTasks, holdingTasks, completedTasks, projectById]);
  const keyboardTaskOrder = [
    ...flattenTaskGroups(pinnedGroups),
    ...flattenTaskGroups(readyGroups),
    ...flattenTaskGroups(tomorrowGroups),
    ...flattenTaskGroups(thisWeekGroups),
    ...flattenTaskGroups(laterGroups),
    ...flattenTaskGroups(holdingGroups),
    ...flattenTaskGroups(completedGroups),
  ];
  const eligibleBlitzTasks = tasks.filter(
    (task) => (
      task.status === 'active'
      && Boolean(projectById[task.project_id]?.blitz_enabled)
      && isDueTodayOrEarlier(task.due_date)
    ),
  );
  const projectOptions = [
    { id: '', name: 'All Projects', color_hex: '#73D1F6' },
    ...projects,
  ].filter((project) => project.name.toLowerCase().includes(projectQuery.trim().toLowerCase()));
  const currentProjectLabel = projectFilterId
    ? (projects.find((project) => project.id === projectFilterId)?.name || 'Project')
    : 'All Projects';
  const blitzRemainingSeconds = blitz.active && blitz.endsAt
    ? Math.max(0, Math.ceil((blitz.endsAt - clockNow) / 1000))
    : 0;
  const blitzExpired = Boolean(blitz.active && blitz.endsAt && blitzRemainingSeconds === 0);

  function mergeTaskForClient(currentTask, nextTask) {
    const merged = {
      ...currentTask,
      ...nextTask,
    };
    const project = projectById[merged.project_id];
    const assignee = memberById[String(merged.assigned_to)];
    if (project) {
      merged.project_name = project.name;
    }
    if (assignee) {
      merged.assigned_to_name = assignee.display_name;
    }
    return merged;
  }

  function handleTaskLocalUpdate(nextTask) {
    if (!nextTask?.id) return;

    setTasks((current) => current.map((item) => (
      item.id === nextTask.id ? mergeTaskForClient(item, nextTask) : item
    )));

    setSelectedTask((current) => (
      current?.id === nextTask.id ? mergeTaskForClient(current, nextTask) : current
    ));
  }

  useEffect(() => {
    window.localStorage.setItem(SECTION_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const response = await apiFetch('/projects');
      const nextProjects = response.data || [];
      setProjects(nextProjects);

      if (projectFilterId && !nextProjects.some((project) => project.id === projectFilterId)) {
        setProjectFilterId('');
      }

      const nextSettingsProjectId = (
        nextProjects.some((project) => project.id === settingsProjectId)
          ? settingsProjectId
          : (projectFilterId || nextProjects[0]?.id || '')
      );
      setSettingsProjectId(nextSettingsProjectId);
    } finally {
      setProjectsLoading(false);
    }
  }

  async function loadMembers() {
    setMembersLoading(true);
    try {
      const response = await apiFetch('/members');
      setMembers(response.data || []);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadCollaborators(projectId) {
    if (!projectId) {
      setCollaborators([]);
      return;
    }
    const response = await apiFetch(`/projects/${projectId}/collaborators`);
    setCollaborators(response.data || []);
  }

  async function loadTasks(taskId = '', { silent = false } = {}) {
    if (!silent) setTasksLoading(true);
    const params = new URLSearchParams();
    if (projectFilterId) params.set('project_id', projectFilterId);

    try {
      const response = await apiFetch(`/tasks${params.toString() ? `?${params.toString()}` : ''}`);
      const nextTasks = response.data || [];

      // Preserve optimistic completions — if we recently marked a task as completed
      // but the API still returns it as active (race condition), keep it completed.
      const now = Date.now();
      const COMPLETION_GRACE_MS = 8000; // 8 seconds — covers the 2s delay + API processing
      // Clean up old entries
      for (const [id, ts] of recentCompletionsRef.current) {
        if (now - ts > COMPLETION_GRACE_MS) recentCompletionsRef.current.delete(id);
      }
      // Apply optimistic overrides
      const mergedTasks = nextTasks.map((t) => {
        const completedAt = recentCompletionsRef.current.get(t.id);
        if (completedAt && t.status !== 'completed' && now - completedAt < COMPLETION_GRACE_MS) {
          return { ...t, status: 'completed', completed_at: new Date(completedAt).toISOString() };
        }
        return t;
      });
      setTasks(mergedTasks);

      if (!taskId) {
        // Don't clear selected task if it was recently completed (would flash the modal)
        if (!recentCompletionsRef.current.has(selectedTaskId)) {
          setSelectedTaskId('');
          setSelectedTask(null);
        }
        return;
      }

      // Don't re-fetch a task we just completed — stale API data would revert the optimistic update
      if (recentCompletionsRef.current.has(taskId)) {
        return;
      }

      const detail = await apiFetch(`/tasks/${taskId}`);
      setSelectedTaskId(taskId);
      setSelectedTask(detail.data || null);
    } finally {
      if (!silent) setTasksLoading(false);
    }
  }

  async function refreshSelected(taskId) {
    await loadTasks(taskId, { silent: true });
  }

  async function loadWorkSummary() {
    setWorkLoading(true);
    try {
      const response = await apiFetch('/work/summary');
      setWorkSummary(response.data || null);
    } finally {
      setWorkLoading(false);
    }
  }

  function refreshWorkSummarySoon() {
    if (!workOpen) return;
    loadWorkSummary().catch(reportError);
  }

  function reportError(error) {
    if (error?.authExpired) {
      setMessage('Your session expired. Sign in again to continue.');
      return;
    }
    setMessage(error?.message || 'Something went wrong.');
  }

  function openCreatePane() {
    if (blitz.active) return;
    setMessage('');
    setProjectPopoverOpen(false);
    setSettingsOpen(false);
    setWorkOpen(false);
    setSelectedTaskId('');
    setSelectedTask(null);
    setIsCreating(true);
    setCreateDraft(makeCreateDraft(projectFilterId || projects[0]?.id || '', user?.id || ''));
    window.setTimeout(() => createTitleRef.current?.focus(), 50);
  }

  function openWorkPanel() {
    setProjectPopoverOpen(false);
    setSettingsOpen(false);
    setWorkOpen(true);
    loadWorkSummary().catch(reportError);
  }

  function openSettingsPanel() {
    setProjectPopoverOpen(false);
    setWorkOpen(false);
    setSettingsOpen(true);
  }

  function openProjectPopover() {
    setProjectPopoverOpen(true);
    setProjectQuery('');
    setProjectHighlightIndex(0);
    window.setTimeout(() => projectSearchRef.current?.focus(), 0);
  }

  function closeProjectPopover({ returnFocus = false } = {}) {
    setProjectPopoverOpen(false);
    setProjectQuery('');
    setProjectHighlightIndex(0);
    if (returnFocus) {
      window.setTimeout(() => projectTriggerRef.current?.focus(), 0);
    }
  }

  function closeExpanded(force = false) {
    if (blitz.active && blitz.focusTaskId && !force) return;
    if (selectedTaskId) {
      rowRefs.current[selectedTaskId]?.focus();
    }
    setSelectedTaskId('');
    setSelectedTask(null);
    setIsCreating(false);
    setMessage('');
  }

  function toggleSection(sectionKey) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  }

  function showTasksView() {
    if (projectPopoverOpen) closeProjectPopover();
    if (settingsOpen) setSettingsOpen(false);
    if (workOpen) setWorkOpen(false);
    closeExpanded();
    listFrameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function finalizeBlitz(status = 'completed', overrides = {}) {
    const activeRunId = blitz.runId;
    const payload = {
      status,
      selected_task_id: overrides.selectedTaskId ?? blitz.focusTaskId ?? null,
      completed_count: overrides.completedCount ?? blitz.completedCount ?? 0,
      moved_to_holding_count: overrides.holdingCount ?? blitz.holdingCount ?? 0,
    };

    if (activeRunId) {
      try {
        await apiFetch(`/work/blitz/${activeRunId}/finish`, {
          method: 'POST',
          json: payload,
        });
      } catch (error) {
        reportError(error);
      }
    }

    setBlitz({
      active: false,
      poolIds: [],
      focusTaskId: '',
      runId: '',
      completedCount: 0,
      holdingCount: 0,
      startedAt: 0,
      endsAt: 0,
    });
    closeExpanded(true);
    refreshWorkSummarySoon();
  }

  useEffect(() => {
    if (!isAuthenticated || !workspaceId) return;

    Promise.all([
      loadProjects(),
      loadMembers(),
      loadTasks(''),
    ]).catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, workspaceId]);

  useEffect(() => {
    if (!isAuthenticated || !workspaceId) return;
    closeExpanded(true);
    loadTasks('').catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilterId]);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectDraft(makeProjectDraft());
      return;
    }

    const selectedProject = projects.find((project) => project.id === settingsProjectId) || null;
    if (!selectedProject) {
      setSelectedProjectDraft(makeProjectDraft());
      return;
    }

    setSelectedProjectDraft({
      name: selectedProject.name,
      color_hex: selectedProject.color_hex || '#73D1F6',
      blitz_enabled: Boolean(selectedProject.blitz_enabled),
    });
  }, [projects, settingsProjectId]);

  useEffect(() => {
    if (!isAuthenticated || !workspaceId) return;
    loadCollaborators(settingsProjectId).catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsProjectId, isAuthenticated, workspaceId]);

  useEffect(() => {
    if (!projectPopoverOpen) return undefined;

    function handlePointerDown(event) {
      if (!projectPickerRef.current?.contains(event.target)) {
        closeProjectPopover();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [projectPopoverOpen]);

  useEffect(() => {
    if (!blitz.active) return undefined;

    setClockNow(Date.now());
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [blitz.active]);

  // Auto-dismiss blitz-done celebration after 5 seconds
  useEffect(() => {
    if (blitzCelebration !== 'blitz-done') return undefined;
    const timer = window.setTimeout(() => {
      setBlitzCelebration(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [blitzCelebration]);

  useEffect(() => {
    if (!projectPopoverOpen) return;
    setProjectHighlightIndex((current) => {
      if (!projectOptions.length) return 0;
      return Math.min(current, projectOptions.length - 1);
    });
  }, [projectOptions.length, projectPopoverOpen]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    function handleKeyDown(event) {
      const lowerKey = event.key.toLowerCase();

      // Blitz overlay keyboard shortcuts
      if (blitz.active && blitzCelebration === null) {
        // Task selection: 1, 2, 3 to pick a task
        if (!blitz.focusTaskId && ['1', '2', '3'].includes(event.key)) {
          const idx = Number(event.key) - 1;
          const taskId = blitz.poolIds[idx];
          if (taskId) {
            chooseBlitzTask(taskId);
            event.preventDefault();
            return;
          }
        }

        // During focus mode
        if (blitz.focusTaskId) {
          // Cmd/Ctrl+Enter = complete from anywhere (even text fields)
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            const focusTask = tasks.find((t) => t.id === blitz.focusTaskId);
            if (focusTask) {
              handleToggleTaskComplete(focusTask, true);
              event.preventDefault();
              return;
            }
          }

          if (!isTextMode()) {
            // H = hold current task
            if (lowerKey === 'h') {
              const focusTask = tasks.find((t) => t.id === blitz.focusTaskId);
              if (focusTask) {
                handleBlitzHold(focusTask);
                event.preventDefault();
                return;
              }
            }
            // ArrowRight or N = skip to next
            if (event.key === 'ArrowRight' || lowerKey === 'n') {
              handleBlitzSkip();
              event.preventDefault();
              return;
            }
          }
        }

        // Escape = end blitz with confirmation
        if (event.key === 'Escape') {
          if (window.confirm('End this Blitz session?')) {
            handleBlitzEnd();
          }
          event.preventDefault();
          return;
        }
      }

      if (event.key === 'Escape') {
        if (projectPopoverOpen) {
          closeProjectPopover({ returnFocus: true });
          event.preventDefault();
          return;
        }
        if (workOpen) {
          setWorkOpen(false);
          event.preventDefault();
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          event.preventDefault();
          return;
        }
        if (!blitz.focusTaskId && (selectedTaskId || isCreating)) {
          closeExpanded();
          event.preventDefault();
        }
        return;
      }

      if (projectPopoverOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setProjectHighlightIndex((current) => (
            projectOptions.length ? Math.min(current + 1, projectOptions.length - 1) : 0
          ));
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setProjectHighlightIndex((current) => Math.max(current - 1, 0));
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          const option = projectOptions[projectHighlightIndex];
          if (option) {
            setProjectFilterId(option.id);
            closeProjectPopover({ returnFocus: true });
          }
          return;
        }
      }

      if ((event.key === 'z' || event.key === 'Z') && !isTextMode() && !event.metaKey && !event.ctrlKey && undoToast) {
        event.preventDefault();
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        const taskToUndo = tasks.find(t => t.id === undoToast.taskId);
        setUndoToast(null);
        if (taskToUndo) handleToggleTaskComplete(taskToUndo, false);
        return;
      }

      if ((event.key === 'c' || event.key === 'C') && !isTextMode() && !event.metaKey && !event.ctrlKey) {
        openCreatePane();
        event.preventDefault();
        return;
      }

      if ((event.key === 'f' || event.key === 'F') && !isTextMode() && !selectedTaskId && !isCreating) {
        openProjectPopover();
        event.preventDefault();
        return;
      }

      // Vim-style J/K task navigation
      if ((event.key === 'j' || event.key === 'k') && !isTextMode() && !selectedTaskId && !isCreating && !settingsOpen && !workOpen) {
        event.preventDefault();
        if (!keyboardTaskOrder.length) return;
        const currentIndex = keyboardTaskOrder.findIndex((task) => task.id === focusedTaskId);
        const nextIndex = event.key === 'j'
          ? (currentIndex < 0 ? 0 : Math.min(currentIndex + 1, keyboardTaskOrder.length - 1))
          : (currentIndex < 0 ? keyboardTaskOrder.length - 1 : Math.max(currentIndex - 1, 0));
        const nextTask = keyboardTaskOrder[nextIndex];
        if (nextTask) {
          rowRefs.current[nextTask.id]?.focus();
          setFocusedTaskId(nextTask.id);
        }
        return;
      }

      if (lowerKey === 'w' && !isTextMode() && !selectedTaskId && !isCreating) {
        openWorkPanel();
        event.preventDefault();
        return;
      }

      if (lowerKey === 's' && !isTextMode() && !selectedTaskId && !isCreating && !workOpen) {
        openSettingsPanel();
        event.preventDefault();
        return;
      }

      if (event.key === '?' && !isTextMode() && !selectedTaskId && !isCreating) {
        setShortcutsOpen(prev => !prev);
        event.preventDefault();
        return;
      }

      if (lowerKey === 'b' && !isTextMode() && !selectedTaskId && !isCreating) {
        if (blitz.active) {
          finalizeBlitz('abandoned');
        } else {
          startBlitz();
        }
        event.preventDefault();
        return;
      }

      if (!isTextMode() && !selectedTaskId && !isCreating && !settingsOpen && !workOpen) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!keyboardTaskOrder.length) return;
          const currentIndex = keyboardTaskOrder.findIndex((task) => task.id === focusedTaskId);
          const nextIndex = event.key === 'ArrowDown'
            ? (currentIndex < 0 ? 0 : Math.min(currentIndex + 1, keyboardTaskOrder.length - 1))
            : (currentIndex < 0 ? keyboardTaskOrder.length - 1 : Math.max(currentIndex - 1, 0));
          const nextTask = keyboardTaskOrder[nextIndex];
          if (nextTask) {
            rowRefs.current[nextTask.id]?.focus();
            setFocusedTaskId(nextTask.id);
          }
          return;
        }

        if (lowerKey === 'p' && focusedTaskId) {
          const focusedTask = keyboardTaskOrder.find((task) => task.id === focusedTaskId);
          if (focusedTask) {
            handleToggleTaskPin(focusedTask);
            event.preventDefault();
          }
          return;
        }

        if (lowerKey === 'x' && focusedTaskId) {
          const focusedTask = keyboardTaskOrder.find((task) => task.id === focusedTaskId);
          if (focusedTask) {
            handleToggleTaskComplete(focusedTask, focusedTask.status !== 'completed');
            event.preventDefault();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    selectedTaskId,
    isCreating,
    settingsOpen,
    workOpen,
    projectPopoverOpen,
    projectOptions,
    projectHighlightIndex,
    blitz,
    blitzCelebration,
    focusedTaskId,
    keyboardTaskOrder,
  ]);

  useEffect(() => {
    const modalOpen = settingsOpen || workOpen || Boolean(selectedTaskId) || isCreating;
    if (!modalOpen) return undefined;

    // Prevent background scroll without hiding the scrollbar (avoids page jerk)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isCreating, selectedTaskId, settingsOpen, workOpen]);

  useEffect(() => {
    if (!isAuthenticated || !workspaceId) return undefined;

    let cancelled = false;

    async function startSession() {
      try {
        const response = await apiFetch('/work/sessions', {
          method: 'POST',
          json: { source: 'web' },
        });
        if (!cancelled) {
          workSessionIdRef.current = response?.data?.id || '';
        }
      } catch (error) {
        reportError(error);
      }
    }

    startSession();

    const interval = window.setInterval(() => {
      const sessionId = workSessionIdRef.current;
      if (!sessionId) return;
      apiFetch(`/work/sessions/${sessionId}/heartbeat`, {
        method: 'POST',
      }).catch(() => {});
    }, 60000);

    function finishSession() {
      const sessionId = workSessionIdRef.current;
      if (!sessionId) return;
      apiFetch(`/work/sessions/${sessionId}/finish`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => {});
      workSessionIdRef.current = '';
    }

    window.addEventListener('beforeunload', finishSession);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', finishSession);
      finishSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, workspaceId]);

  useEffect(() => {
    if (!blitz.active) return;
    const eligibleIds = new Set(eligibleBlitzTasks.map((task) => task.id));
    const nextPoolIds = blitz.poolIds.filter((taskId) => eligibleIds.has(taskId));
    if (!nextPoolIds.length) {
      finalizeBlitz('abandoned');
      return;
    }
    if (nextPoolIds.length !== blitz.poolIds.length || (blitz.focusTaskId && !eligibleIds.has(blitz.focusTaskId))) {
      setBlitz((current) => ({
        ...current,
        poolIds: nextPoolIds,
        focusTaskId: eligibleIds.has(current.focusTaskId) ? current.focusTaskId : '',
      }));
    }
  }, [eligibleBlitzTasks, blitz.active, blitz.poolIds, blitz.focusTaskId]);

  async function handleToggleTask(taskId) {
    setMessage('');
    closeProjectPopover();

    if (selectedTaskId === taskId) {
      closeExpanded();
      return;
    }

    setIsCreating(false);
    setSelectedTaskId(taskId);

    // Immediately show the task from list data — no blank screen
    const listTask = tasks.find((t) => t.id === taskId);
    if (listTask) {
      setSelectedTask(listTask);
    }

    try {
      const detail = await apiFetch(`/tasks/${taskId}`);
      setSelectedTask(detail.data || null);
    } catch (error) {
      setSelectedTaskId('');
      setSelectedTask(null);
      reportError(error);
    }
  }

  async function handleAfterTaskSave({ previousTask, nextTask }) {
    if (!blitz.active || blitz.focusTaskId !== previousTask.id) return;

    const nextStatus = nextTask?.status || previousTask.status;
    if (nextStatus === 'completed') {
      const remainingPoolIds = blitz.poolIds.filter((id) => id !== previousTask.id);
      const nextCompletedCount = blitz.completedCount + 1;
      setBlitzCongratIndex(Math.floor(Math.random() * BLITZ_CONGRATS.length));
      if (!remainingPoolIds.length) {
        setBlitzCelebration('task-done');
        const elapsed = Math.round((Date.now() - blitz.startedAt) / 1000);
        const statsSnap = { completed: nextCompletedCount, holding: blitz.holdingCount, elapsed };
        window.setTimeout(() => {
          setBlitzCelebration('blitz-done');
          setBlitzFinalStats(statsSnap);
        }, 3000);
        finalizeBlitz('completed', {
          selectedTaskId: previousTask.id,
          completedCount: nextCompletedCount,
        }).catch(() => {});
      } else {
        setBlitzCelebration('task-done');
        window.setTimeout(() => {
          setBlitzCelebration(null);
          setBlitzQuoteIndex(Math.floor(Math.random() * BLITZ_QUOTES.length));
          const nextTaskId = remainingPoolIds[0] || '';
          setBlitz((current) => ({
            ...current,
            poolIds: remainingPoolIds,
            focusTaskId: nextTaskId,
            completedCount: nextCompletedCount,
          }));
          if (nextTaskId) {
            setSelectedTaskId(nextTaskId);
            const nextTask = tasks.find(t => t.id === nextTaskId);
            if (nextTask) {
              setSelectedTask(nextTask);
              setBlitzFocusTitleDraft(nextTask.title || '');
              setBlitzFocusNotesDraft(nextTask.description || '');
            }
          } else {
            closeExpanded(true);
          }
        }, 3000);
      }
      refreshWorkSummarySoon();
      return;
    }

    if (['waiting', 'paused'].includes(nextStatus) && previousTask.status === 'active') {
      const remainingPoolIds = blitz.poolIds.filter((id) => id !== previousTask.id);
      const nextHoldingCount = blitz.holdingCount + 1;
      if (!remainingPoolIds.length) {
        const elapsed = Math.round((Date.now() - blitz.startedAt) / 1000);
        setBlitzFinalStats({ completed: blitz.completedCount, holding: nextHoldingCount, elapsed });
        setBlitzCelebration('blitz-done');
        finalizeBlitz('completed', {
          selectedTaskId: previousTask.id,
          holdingCount: nextHoldingCount,
        }).catch(() => {});
      } else {
        setBlitz((current) => ({
          ...current,
          poolIds: remainingPoolIds,
          focusTaskId: '',
          holdingCount: nextHoldingCount,
        }));
        closeExpanded(true);
        setBlitzQuoteIndex(Math.floor(Math.random() * BLITZ_QUOTES.length));
      }
    }
  }

  async function handleCreateTask() {
    setMessage('');

    if (!createDraft.title.trim()) {
      setMessage('Task title is required.');
      return;
    }

    const activeProjectId = createDraft.project_id || projectFilterId || projects[0]?.id || '';
    if (!activeProjectId) {
      setMessage('Choose a project before creating a task.');
      return;
    }
    if (!createDraft.assigned_to) {
      setMessage('Choose an assignee before creating a task.');
      return;
    }

    try {
      const response = await apiFetch('/tasks', {
        method: 'POST',
        json: {
          title: createDraft.title.trim(),
          description: createDraft.description || '',
          project_id: activeProjectId,
          assigned_to: createDraft.assigned_to,
          priority: createDraft.priority,
          due_date: fromDateInputValue(createDraft.due_date),
          is_pinned: Boolean(createDraft.is_pinned),
        },
      });

      const createdTaskId = response?.data?.id || '';
      setIsCreating(false);
      setCreateDraft(makeCreateDraft(activeProjectId, user?.id || ''));
      await loadTasks('', { silent: true });
      setFocusedTaskId(createdTaskId);
      if (createdTaskId) {
        window.setTimeout(() => rowRefs.current[createdTaskId]?.focus(), 0);
      }
      refreshWorkSummarySoon();
    } catch (error) {
      reportError(error);
    }
  }

  async function handleToggleTaskComplete(task, checked) {
    setMessage('');

    // Optimistic update — change UI immediately
    const newStatus = checked ? 'completed' : 'active';
    if (checked) {
      recentCompletionsRef.current.set(task.id, Date.now());
    } else {
      recentCompletionsRef.current.delete(task.id);
    }
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus, completed_at: checked ? new Date().toISOString() : null } : t));
    if (selectedTask?.id === task.id) {
      setSelectedTask((prev) => prev ? { ...prev, status: newStatus, completed_at: checked ? new Date().toISOString() : null } : prev);
    }

    // Show undo toast for completions (non-blitz)
    if (checked && !blitz.active) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoToast({ taskId: task.id, taskTitle: task.title });
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(null);
        undoTimerRef.current = null;
      }, 10000);
    }

    try {
      if (checked) {
        await apiFetch(`/tasks/${task.id}/complete`, { method: 'PATCH' });
      } else {
        await apiFetch(`/tasks/${task.id}/status`, {
          method: 'PATCH',
          json: { status: 'active' },
        });
      }

      if (blitz.active && checked && blitz.poolIds.includes(task.id)) {
        const remainingPoolIds = blitz.poolIds.filter((id) => id !== task.id);
        const nextCompletedCount = blitz.completedCount + 1;
        setBlitzCongratIndex(Math.floor(Math.random() * BLITZ_CONGRATS.length));
        if (!remainingPoolIds.length) {
          // Show task celebration, then blitz-done after delay
          setBlitzCelebration('task-done');
          const elapsed = Math.round((Date.now() - blitz.startedAt) / 1000);
          const statsSnap = { completed: nextCompletedCount, holding: blitz.holdingCount, elapsed };
          window.setTimeout(() => {
            setBlitzCelebration('blitz-done');
            setBlitzFinalStats(statsSnap);
          }, 3000);
          // Finalize in background
          finalizeBlitz('completed', {
            selectedTaskId: task.id,
            completedCount: nextCompletedCount,
          }).catch(() => {});
        } else {
          setBlitzCelebration('task-done');
          window.setTimeout(() => {
            setBlitzCelebration(null);
            setBlitzQuoteIndex(Math.floor(Math.random() * BLITZ_QUOTES.length));
            // Auto-advance to the next task in the pool instead of going back to selection
            const nextTaskId = remainingPoolIds[0] || '';
            setBlitz((current) => ({
              ...current,
              poolIds: remainingPoolIds,
              focusTaskId: nextTaskId,
              completedCount: nextCompletedCount,
            }));
            if (nextTaskId) {
              // Open the next task
              setSelectedTaskId(nextTaskId);
              const nextTask = tasks.find(t => t.id === nextTaskId);
              if (nextTask) {
                setSelectedTask(nextTask);
                setBlitzFocusTitleDraft(nextTask.title || '');
                setBlitzFocusNotesDraft(nextTask.description || '');
              }
            } else {
              closeExpanded(true);
            }
          }, 3000);
        }
      }

      // Background sync — delay to let API process, and DON'T re-fetch the completed task's detail
      // (it would overwrite the optimistic completion with stale data)
      window.setTimeout(() => {
        loadTasks('', { silent: true }).catch(() => {});
      }, 2000);
      refreshWorkSummarySoon();
    } catch (error) {
      // Revert optimistic update on failure
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status, completed_at: task.completed_at } : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask((prev) => prev ? { ...prev, status: task.status, completed_at: task.completed_at } : prev);
      }
      reportError(error);
    }
  }

  async function handleToggleTaskPin(task) {
    setMessage('');

    // Optimistic update
    const newPinned = !task.is_pinned;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_pinned: newPinned } : t));

    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: 'PUT',
        json: { is_pinned: newPinned },
      });
      loadTasks(selectedTaskId || '', { silent: true }).catch(() => {});
    } catch (error) {
      reportError(error);
    }
  }

  async function handleCreateProject() {
    if (!newProjectDraft.name.trim()) {
      setMessage('Project name is required.');
      return;
    }

    try {
      const response = await apiFetch('/projects', {
        method: 'POST',
        json: {
          name: newProjectDraft.name.trim(),
          color_hex: newProjectDraft.color_hex,
          blitz_enabled: Boolean(newProjectDraft.blitz_enabled),
        },
      });
      const nextProjectId = response?.data?.id || '';
      setNewProjectDraft(makeProjectDraft());
      setProjectFilterId(nextProjectId);
      setSettingsProjectId(nextProjectId);
      await Promise.all([
        loadProjects(),
        loadTasks(''),
      ]);
      await loadCollaborators(nextProjectId);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleSaveProjectSettings() {
    if (!settingsProjectId) return;

    try {
      await apiFetch(`/projects/${settingsProjectId}`, {
        method: 'PUT',
        json: {
          name: selectedProjectDraft.name.trim(),
          color_hex: selectedProjectDraft.color_hex,
          blitz_enabled: Boolean(selectedProjectDraft.blitz_enabled),
        },
      });
      await Promise.all([
        loadProjects(),
        loadTasks(selectedTaskId, { silent: true }),
      ]);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleAddMember() {
    if (!memberDraft.display_name.trim()) {
      setMessage('Team member name is required.');
      return;
    }

    try {
      await apiFetch('/members', {
        method: 'POST',
        json: {
          display_name: memberDraft.display_name.trim(),
          email: memberDraft.email.trim() || null,
          role: memberDraft.role,
        },
      });
      setMemberDraft(makeMemberDraft());
      await loadMembers();
    } catch (error) {
      reportError(error);
    }
  }

  async function handleRemoveMember(memberId) {
    try {
      await apiFetch(`/members/${memberId}`, {
        method: 'DELETE',
      });
      await Promise.all([
        loadMembers(),
        loadCollaborators(settingsProjectId),
      ]);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleAddCollaborator() {
    if (!settingsProjectId || !collaboratorId) return;

    try {
      await apiFetch(`/projects/${settingsProjectId}/collaborators`, {
        method: 'POST',
        json: { core_user_id: collaboratorId },
      });
      setCollaboratorId('');
      await Promise.all([
        loadCollaborators(settingsProjectId),
        loadProjects(),
      ]);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleRemoveCollaborator(coreUserId) {
    if (!settingsProjectId) return;

    try {
      await apiFetch(`/projects/${settingsProjectId}/collaborators/${coreUserId}`, {
        method: 'DELETE',
      });
      await Promise.all([
        loadCollaborators(settingsProjectId),
        loadProjects(),
      ]);
    } catch (error) {
      reportError(error);
    }
  }

  async function handleLogout() {
    try {
      if (blitz.active) {
        await finalizeBlitz('abandoned');
      }
      await logout();
    } catch (error) {
      reportError(error);
    }
  }

  async function handleBlitzHold(task) {
    if (!task) return;
    try {
      await apiFetch(`/tasks/${task.id}/status`, {
        method: 'PATCH',
        json: { status: 'paused' },
      });
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'paused' } : t));
      const remainingPoolIds = blitz.poolIds.filter((id) => id !== task.id);
      const nextHoldingCount = blitz.holdingCount + 1;
      if (!remainingPoolIds.length) {
        const elapsed = Math.round((Date.now() - blitz.startedAt) / 1000);
        setBlitzFinalStats({ completed: blitz.completedCount, holding: nextHoldingCount, elapsed });
        setBlitzCelebration('blitz-done');
        finalizeBlitz('completed', {
          selectedTaskId: task.id,
          holdingCount: nextHoldingCount,
        }).catch(() => {});
      } else {
        setBlitz((current) => ({
          ...current,
          poolIds: remainingPoolIds,
          focusTaskId: '',
          holdingCount: nextHoldingCount,
        }));
        setBlitzQuoteIndex(Math.floor(Math.random() * BLITZ_QUOTES.length));
        closeExpanded(true);
      }
      loadTasks('', { silent: true }).catch(() => {});
    } catch (error) {
      reportError(error);
    }
  }

  function handleBlitzSkip() {
    if (!blitz.focusTaskId) return;
    const currentIndex = blitz.poolIds.indexOf(blitz.focusTaskId);
    const nextIndex = (currentIndex + 1) % blitz.poolIds.length;
    const nextTaskId = blitz.poolIds[nextIndex];
    if (nextTaskId && nextTaskId !== blitz.focusTaskId) {
      setBlitz((current) => ({ ...current, focusTaskId: '' }));
      setBlitzQuoteIndex(Math.floor(Math.random() * BLITZ_QUOTES.length));
      closeExpanded(true);
    }
  }

  function handleBlitzEnd() {
    setBlitzCelebration(null);
    finalizeBlitz('abandoned');
  }

  async function startBlitz() {
    if (!eligibleBlitzTasks.length) {
      setMessage('No eligible Blitz tasks. Blitz only pulls active work from Blitz-enabled projects that is due today, overdue, or has no due date.');
      return;
    }

    const pool = shuffleTasks(eligibleBlitzTasks).slice(0, Math.min(3, eligibleBlitzTasks.length));
    let runId = '';
    try {
      const response = await apiFetch('/work/blitz', {
        method: 'POST',
        json: { task_pool_size: pool.length },
      });
      runId = response?.data?.id || '';
    } catch (error) {
      reportError(error);
    }
    setBlitz({
      active: true,
      poolIds: pool.map((task) => task.id),
      focusTaskId: '',
      runId,
      completedCount: 0,
      holdingCount: 0,
      startedAt: Date.now(),
      endsAt: Date.now() + (60 * 60 * 1000),
    });
    closeExpanded(true);
    setBlitzCelebration(null);
    setBlitzQuoteIndex(Math.floor(Math.random() * BLITZ_QUOTES.length));
    setMessage('Blitz started. Pick one task and stay with it.');
  }

  async function chooseBlitzTask(taskId) {
    setBlitz((current) => ({ ...current, focusTaskId: taskId }));
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setBlitzFocusTitleDraft(task.title || '');
      setBlitzFocusNotesDraft(task.description || '');
    }
    await handleToggleTask(taskId);
  }

  function renderTask(task) {
    const inBlitzPool = blitz.poolIds.includes(task.id);
    const blitzFocusLocked = blitz.active && Boolean(blitz.focusTaskId);
    const disabled = blitzFocusLocked
      ? blitz.focusTaskId !== task.id
      : (blitz.active && !inBlitzPool);
    const highlighted = inBlitzPool && !blitzFocusLocked;

    return (
      <TaskRow
        key={task.id}
        task={task}
        expanded={selectedTaskId === task.id}
        onToggle={handleToggleTask}
        onToggleComplete={handleToggleTaskComplete}
        onTogglePin={handleToggleTaskPin}
        onFocus={setFocusedTaskId}
        rowRefs={rowRefs}
        disabled={disabled}
        highlighted={highlighted}
        projectColor={getProjectColor(projectById[task.project_id])}
      />
    );
  }

  if (loading) {
    return <div className="loading-shell">Loading Dailey Due...</div>;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  function formatElapsed(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    }
    return `${mins}m ${secs}s`;
  }

  function renderBlitzOverlay() {
    if (!blitz.active && blitzCelebration !== 'blitz-done') return null;

    const focusTask = blitz.focusTaskId ? tasks.find((t) => t.id === blitz.focusTaskId) : null;
    const focusProject = focusTask ? projectById[focusTask.project_id] : null;
    const completedSoFar = blitz.completedCount;
    const totalPool = blitz.poolIds.length + completedSoFar + blitz.holdingCount;

    // Phase 4: Blitz Complete
    if (blitzCelebration === 'blitz-done') {
      return (
        <div className="blitz">
          <ConfettiEffect />
          <div className="blitz-celebration">
            <div className="blitz-celebration-icon">⚡</div>
            <div className="blitz-celebration-title">BLITZ COMPLETE</div>
            <div className="blitz-celebration-sub" style={{ display: 'flex', gap: 24, marginTop: 8, fontFamily: 'var(--font-mono)' }}>
              <span><strong style={{ fontSize: 24, color: '#EAF0F8' }}>{blitzFinalStats.completed}</strong><br />Completed</span>
              <span><strong style={{ fontSize: 24, color: '#EAF0F8' }}>{formatElapsed(blitzFinalStats.elapsed)}</strong><br />Time</span>
              {blitzFinalStats.holding > 0 && (
                <span><strong style={{ fontSize: 24, color: '#EAF0F8' }}>{blitzFinalStats.holding}</strong><br />On Hold</span>
              )}
            </div>
            <button type="button" className="blitz-done" style={{ marginTop: 24 }} onClick={() => { setBlitzCelebration(null); }}>
              Back to work
            </button>
          </div>
        </div>
      );
    }

    // Phase 3: Task Celebration
    if (blitzCelebration === 'task-done') {
      return (
        <div className="blitz">
          <ConfettiEffect />
          <div className="blitz-celebration">
            <div className="blitz-celebration-icon" style={{ fontSize: 72 }}>✓</div>
            <div className="blitz-celebration-title">{BLITZ_CONGRATS[blitzCongratIndex]}</div>
          </div>
        </div>
      );
    }

    // Phase 1: Task Selection
    if (!blitz.focusTaskId) {
      return (
        <div className="blitz">
          <div className="blitz-select-screen">
            <div className="blitz-header-row">
              <div className="blitz-icon"><BlitzBoltIcon style={{ width: 30, height: 30 }} /></div>
              <div className="blitz-title-text">BLITZ MODE</div>
              <div className={`blitz-timer-display${blitzExpired ? ' expired' : ''}`} style={blitzExpired ? { color: 'var(--bad)' } : {}}>
                {blitzExpired ? 'TIME IS UP' : formatCountdown(blitzRemainingSeconds)}
              </div>
              <div className="blitz-stats-line mono">
                {blitz.completedCount} done · {blitz.poolIds.length} left
              </div>
            </div>
            <div className="blitz-prompt-text">{blitz.poolIds.length ? 'Pick your next task' : 'Stack cleared. Nice run.'}</div>
            <div className="blitz-cards-grid">
              {blitz.poolIds.map((taskId, idx) => {
                const task = tasks.find((t) => t.id === taskId);
                if (!task) return null;
                const project = projectById[task.project_id];
                return (
                  <button key={task.id} type="button" className="blitz-task-card" onClick={() => chooseBlitzTask(task.id)}>
                    <span className="blitz-task-num mono">{idx + 1}</span>
                    <span className="blitz-task-title">{task.title}</span>
                    <div className="blitz-task-meta">
                      <span className="project-swatch" style={{ background: getProjectColor(project), width: 8, height: 8 }} />
                      {project?.name || 'No Project'}
                      {task.due_date && (
                        <span className={isDueUrgent(task.due_date) ? 'urgent' : ''} style={{ marginLeft: 'auto' }}>
                          {formatDueDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="blitz-quote-text">{BLITZ_QUOTES[blitzQuoteIndex]}</p>
            <button type="button" className="blitz-end" onClick={() => { if (window.confirm('End this Blitz session?')) handleBlitzEnd(); }}>
              End Blitz
            </button>
          </div>
        </div>
      );
    }

    // Phase 2: Focused Task
    return (
      <div className="blitz">
        <div className="blitz-focus-screen">
          <div className="blitz-focus-topbar">
            <div className={`blitz-focus-timer${blitzExpired ? ' expired' : ''}`}>
              <BlitzBoltIcon style={{ width: 16, height: 16 }} />
              {blitzExpired ? 'TIME UP' : formatCountdown(blitzRemainingSeconds)}
            </div>
            <div className="blitz-focus-progress">
              {completedSoFar + 1} of {totalPool}
            </div>
            <button type="button" className="blitz-focus-end-btn" onClick={() => { if (window.confirm('End this Blitz session?')) handleBlitzEnd(); }}>
              End Blitz
            </button>
          </div>
          <div className="blitz-focus-body">
            {focusProject && (
              <div className="blitz-focus-project-accent" style={{ color: getProjectColor(focusProject) }}>
                <span className="blitz-focus-project-swatch" style={{ background: getProjectColor(focusProject) }} />
                {focusProject.name}
              </div>
            )}
            <input
              className="blitz-focus-title-input"
              value={blitzFocusTitleDraft}
              onChange={(e) => setBlitzFocusTitleDraft(e.target.value)}
              onBlur={() => {
                if (focusTask && blitzFocusTitleDraft.trim() && blitzFocusTitleDraft !== focusTask.title) {
                  apiFetch(`/tasks/${focusTask.id}`, { method: 'PUT', json: { title: blitzFocusTitleDraft.trim() } })
                    .then(() => loadTasks('', { silent: true }))
                    .catch(reportError);
                }
              }}
              placeholder="Task title"
            />
            <textarea
              className="blitz-focus-notes"
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
              value={blitzFocusNotesDraft}
              onChange={(e) => {
                setBlitzFocusNotesDraft(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={() => {
                if (focusTask && blitzFocusNotesDraft !== (focusTask.description || '')) {
                  apiFetch(`/tasks/${focusTask.id}`, { method: 'PUT', json: { description: blitzFocusNotesDraft } })
                    .then(() => loadTasks('', { silent: true }))
                    .catch(reportError);
                }
              }}
              placeholder="Add notes..."
            />
            <div className="blitz-focus-actions">
              <button
                type="button"
                className="blitz-action-btn blitz-action-complete"
                onClick={() => focusTask && handleToggleTaskComplete(focusTask, true)}
              >
                &#10003; Complete
              </button>
              <button
                type="button"
                className="blitz-action-btn blitz-action-hold"
                onClick={() => focusTask && handleBlitzHold(focusTask)}
              >
                Hold
              </button>
              {blitz.poolIds.length > 1 && (
                <button
                  type="button"
                  className="blitz-action-btn blitz-action-skip"
                  onClick={handleBlitzSkip}
                >
                  Skip &rarr;
                </button>
              )}
            </div>
            <div className="blitz-focus-hints">
              <span className="blitz-focus-hint"><kbd>&#8984;&#9166;</kbd> Complete</span>
              <span className="blitz-focus-hint"><kbd>H</kbd> Hold</span>
              {blitz.poolIds.length > 1 && <span className="blitz-focus-hint"><kbd>&rarr;</kbd> Skip</span>}
              <span className="blitz-focus-hint"><kbd>Esc</kbd> End</span>
            </div>
            <p className="blitz-quote">{BLITZ_QUOTES[blitzQuoteIndex]}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell dd-app">
      {renderBlitzOverlay()}

      {/* Undo toast */}
      {undoToast && (
        <div className="undo-toast">
          <span className="undo-toast-text">Completed: <strong>{undoToast.taskTitle}</strong></span>
          <button className="undo-toast-btn" onClick={() => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            setUndoToast(null);
            const taskToUndo = tasks.find(t => t.id === undoToast.taskId);
            if (taskToUndo) handleToggleTaskComplete(taskToUndo, false);
          }}>Undo <span className="undo-toast-hint">Z</span></button>
          <button className="undo-toast-close" onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); setUndoToast(null); }}>×</button>
        </div>
      )}

      {/* Header */}
      <header className="dd-header">
        <DdLogo />
        <span className="beta-pill">Beta</span>

        <div className="dd-actions">
          <button type="button" className="dd-icon-btn dd-new-btn" onClick={openCreatePane} disabled={blitz.active} title="New task (C)">
            <Icon name="plus" size={15} />
          </button>
          <button type="button" className={`dd-keybtn${blitz.active ? ' on' : ''}`} onClick={() => (blitz.active ? finalizeBlitz('abandoned') : startBlitz())}>
            <Icon name="zap" size={14} />
            {blitz.active ? 'End Blitz' : 'Blitz'}
            <span className="kbd">B</span>
          </button>
          <button type="button" className="dd-keybtn" onClick={openWorkPanel}>
            <Icon name="chart" size={14} />
            Work <span className="kbd">W</span>
          </button>
          <button type="button" className="dd-keybtn" onClick={openSettingsPanel}>
            <Icon name="settings" size={14} />
            <span className="kbd">S</span>
          </button>
        </div>

        <div className="dd-spacer" />

        <div className="dd-header-right">
          <div className="project-picker-shell" ref={projectPickerRef}>
            <button
              ref={projectTriggerRef}
              type="button"
              className="dd-project-pill"
              onClick={() => (projectPopoverOpen ? closeProjectPopover({ returnFocus: true }) : openProjectPopover())}
            >
              <span className="project-swatch" style={{ background: getProjectColor(projectById[projectFilterId]) }} />
              <span>{projectsLoading ? 'Loading…' : currentProjectLabel}</span>
              <span className="kbd">F</span>
            </button>
            <ProjectPopover
              open={projectPopoverOpen}
              options={projectOptions}
              query={projectQuery}
              setQuery={setProjectQuery}
              highlightedIndex={projectHighlightIndex}
              onSelect={(projectId) => {
                setProjectFilterId(projectId);
                closeProjectPopover({ returnFocus: true });
              }}
              onClose={() => closeProjectPopover({ returnFocus: true })}
              searchRef={projectSearchRef}
              loading={projectsLoading}
            />
          </div>
          <button type="button" className="dd-icon-btn" title={darkMode ? 'Light mode' : 'Dark mode'} onClick={() => setDarkMode(d => !d)}>
            <Icon name={darkMode ? 'sun' : 'moon'} size={16} />
          </button>
          <span className="dd-avatar" title={user?.name || user?.email}>
            {(user?.name || user?.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </span>
          <button type="button" className="dd-icon-btn" title="Log out" onClick={handleLogout}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </header>

      {/* Modals */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        projects={projects}
        members={members}
        collaborators={collaborators}
        projectsLoading={projectsLoading}
        membersLoading={membersLoading}
        settingsProjectId={settingsProjectId}
        setSettingsProjectId={setSettingsProjectId}
        selectedProjectDraft={selectedProjectDraft}
        setSelectedProjectDraft={setSelectedProjectDraft}
        newProjectDraft={newProjectDraft}
        setNewProjectDraft={setNewProjectDraft}
        memberDraft={memberDraft}
        setMemberDraft={setMemberDraft}
        collaboratorId={collaboratorId}
        setCollaboratorId={setCollaboratorId}
        onCreateProject={handleCreateProject}
        onSaveProjectSettings={handleSaveProjectSettings}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onAddCollaborator={handleAddCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
        onLogout={handleLogout}
      />

      <WorkPanel
        open={workOpen}
        onClose={() => setWorkOpen(false)}
        loading={workLoading}
        summary={workSummary}
      />

      {shortcutsOpen && (
        <div className="shortcuts-overlay" onClick={() => setShortcutsOpen(false)}>
          <div className="shortcuts-panel" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h2>Keyboard Shortcuts</h2>
              <button type="button" onClick={() => setShortcutsOpen(false)} className="shortcuts-close">&times;</button>
            </div>
            <div className="shortcuts-grid">
              <div className="shortcuts-group">
                <h3>Navigation</h3>
                <div className="shortcut-row"><kbd>J</kbd><kbd>K</kbd><span>Navigate tasks</span></div>
                <div className="shortcut-row"><kbd>Enter</kbd><span>Open selected task</span></div>
                <div className="shortcut-row"><kbd>Esc</kbd><span>Close task / panel</span></div>
              </div>
              <div className="shortcuts-group">
                <h3>Actions</h3>
                <div className="shortcut-row"><kbd>C</kbd><span>New task</span></div>
                <div className="shortcut-row"><kbd>X</kbd><span>Complete / uncomplete</span></div>
                <div className="shortcut-row"><kbd>P</kbd><span>Pin / unpin task</span></div>
                <div className="shortcut-row"><kbd>F</kbd><span>Filter by project</span></div>
              </div>
              <div className="shortcuts-group">
                <h3>Panels</h3>
                <div className="shortcut-row"><kbd>B</kbd><span>Start / end Blitz</span></div>
                <div className="shortcut-row"><kbd>W</kbd><span>Work log</span></div>
                <div className="shortcut-row"><kbd>S</kbd><span>Settings</span></div>
                <div className="shortcut-row"><kbd>T</kbd><span>Toggle theme</span></div>
              </div>
              <div className="shortcuts-group">
                <h3>In Task Editor</h3>
                <div className="shortcut-row"><kbd>Alt+1/2/3</kbd><span>Priority</span></div>
                <div className="shortcut-row"><kbd>Alt+T/Y</kbd><span>Today / Tomorrow</span></div>
                <div className="shortcut-row"><kbd>⌘↵</kbd><span>Complete task</span></div>
              </div>
            </div>
            <p className="shortcuts-hint">Press <kbd>?</kbd> to toggle this panel</p>
          </div>
        </div>
      )}

      {/* Main scrollable area */}
      <div className="dd-scroll" ref={listFrameRef}>
        <div className="dd-wrap">
          {message ? <div className="inline-banner">{message}</div> : null}

          <div className="list-frame">
            {tasksLoading ? (
              <>
                <TaskSectionSkeleton />
                <TaskSectionSkeleton />
              </>
            ) : (
              <>
                <GroupedTaskSection
                  title="Pinned"
                  subtitle="Pinned work stays on top, grouped by project."
                  groups={pinnedGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.pinned}
                  onToggle={() => toggleSection('pinned')}
                />
                <GroupedTaskSection
                  title="Ready Now"
                  subtitle="Overdue, due today, or ready without a date."
                  groups={readyGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.ready}
                  onToggle={() => toggleSection('ready')}
                />
                <GroupedTaskSection
                  title="Tomorrow"
                  subtitle="Due tomorrow so you can see the stack coming."
                  groups={tomorrowGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.tomorrow}
                  onToggle={() => toggleSection('tomorrow')}
                />
                <GroupedTaskSection
                  title="This Week"
                  subtitle="Due in the next few days after tomorrow."
                  groups={thisWeekGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.thisWeek}
                  onToggle={() => toggleSection('thisWeek')}
                />
                <GroupedTaskSection
                  title="Later"
                  subtitle="Further out — out of the way until it matters."
                  groups={laterGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.later}
                  onToggle={() => toggleSection('later')}
                />
                <GroupedTaskSection
                  title="Holding"
                  subtitle="Waiting or paused items, away from the active stack."
                  groups={holdingGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.holding}
                  onToggle={() => toggleSection('holding')}
                />
                <GroupedTaskSection
                  title="Completed"
                  subtitle="Finished work, grouped by project."
                  groups={completedGroups}
                  renderTask={renderTask}
                  collapsed={collapsedSections.completed}
                  onToggle={() => toggleSection('completed')}
                />
                {!tasks.length && !isCreating ? (
                  <div className="dd-empty">
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg-2)' }}>Inbox zero.</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Nothing queued here. Press <span className="kbd">C</span> to add work.</div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task modal */}
      <TaskModal open={isCreating} onClose={closeExpanded} title="New task">
        <CreateTaskDetail
          draft={createDraft}
          setDraft={setCreateDraft}
          projects={projects}
          members={members}
          onCreate={handleCreateTask}
          onClose={closeExpanded}
          titleRef={createTitleRef}
        />
      </TaskModal>

      <TaskModal
        open={Boolean(selectedTaskId)}
        canClose={!blitz.focusTaskId}
        onClose={closeExpanded}
        loading={false}
        title={selectedTask?.title || ''}
      >
        {selectedTask ? (
          <TaskDetail
            task={selectedTask}
            projects={projects}
            members={members}
            canClose={!blitz.focusTaskId}
            onClose={closeExpanded}
            onRefresh={refreshSelected}
            onTaskUpdate={handleTaskLocalUpdate}
            onToggleComplete={handleToggleTaskComplete}
            onError={reportError}
            onAfterSave={handleAfterTaskSave}
            blitzActive={blitz.active && blitz.focusTaskId === selectedTask.id}
            blitzRemainingSeconds={blitzRemainingSeconds}
            blitzExpired={blitzExpired}
          />
        ) : null}
      </TaskModal>

      {/* Mobile FAB */}
      {mobileMenuOpen && <div className="mobile-fab-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <div className={`mobile-fab-container ${mobileMenuOpen ? 'open' : ''}`}>
        {mobileMenuOpen && (
          <div className="mobile-fab-menu">
            <div className="mobile-fab-menu-section">
              <div className="project-picker-shell" ref={projectPickerRef}>
                <button
                  ref={projectTriggerRef}
                  type="button"
                  className="dd-project-pill"
                  style={{ width: '100%' }}
                  onClick={() => (projectPopoverOpen ? closeProjectPopover({ returnFocus: true }) : openProjectPopover())}
                >
                  <span className="project-swatch" style={{ background: getProjectColor(projectById[projectFilterId]) }} />
                  <span>{projectsLoading ? 'Loading…' : currentProjectLabel}</span>
                </button>
                <ProjectPopover
                  open={projectPopoverOpen}
                  options={projectOptions}
                  query={projectQuery}
                  setQuery={setProjectQuery}
                  highlightedIndex={projectHighlightIndex}
                  onSelect={(projectId) => {
                    setProjectFilterId(projectId);
                    closeProjectPopover({ returnFocus: true });
                  }}
                  onClose={() => closeProjectPopover({ returnFocus: true })}
                  searchRef={projectSearchRef}
                  loading={projectsLoading}
                />
              </div>
            </div>
            <MobileNavButton label="Tasks" icon={<FaListUl />} active={!isCreating && !selectedTaskId && !settingsOpen && !workOpen} onClick={() => { showTasksView(); setMobileMenuOpen(false); }} />
            <MobileNavButton label="New Task" icon={<FaPlus />} active={isCreating} onClick={() => { openCreatePane(); setMobileMenuOpen(false); }} disabled={blitz.active} />
            <MobileNavButton label={blitz.active ? 'End Blitz' : 'Blitz'} icon={<FaBolt />} active={blitz.active} onClick={() => { blitz.active ? finalizeBlitz('abandoned') : startBlitz(); setMobileMenuOpen(false); }} />
            <MobileNavButton label="Work Log" icon={<FaChartBar />} active={workOpen} onClick={() => { openWorkPanel(); setMobileMenuOpen(false); }} />
            <MobileNavButton label="Settings" icon={<FaCog />} active={settingsOpen} onClick={() => { openSettingsPanel(); setMobileMenuOpen(false); }} />
          </div>
        )}
        <button type="button" className="mobile-fab-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
          {mobileMenuOpen ? <FaTimes /> : <FaBolt />}
        </button>
      </div>

      {/* Status line */}
      <StatusLine
        view={selectedTaskId || isCreating ? 'task' : settingsOpen ? 'settings' : workOpen ? 'work' : 'list'}
        projectName={currentProjectLabel !== 'All Projects' ? currentProjectLabel : null}
        activeCount={activeTasks.length}
        blitzActive={blitz.active}
      />
    </div>
  );
}
