/**
 * Date utilities for Sprint 1 - Due dates and overdue indicators
 */

/**
 * Calculate the status of a due date
 * @param {string|Date} dueDate - The due date
 * @returns {'overdue'|'due-soon'|'on-time'|null} Status string or null if no due date
 */
export const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;

    const now = new Date();
    const due = new Date(dueDate);
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
        return 'overdue';
    } else if (hoursUntilDue <= 12) {
        return 'due-soon';
    }
    return 'on-time';
};

/**
 * Format a due date with relative time and status indicator
 * @param {string|Date} dueDate - The due date
 * @param {string} status - Task status (to hide due date for completed tasks)
 * @returns {Object} { text: string, status: string, className: string }
 */
export const formatDueDate = (dueDate, status) => {
    if (!dueDate) {
        return { text: null, status: null, className: '' };
    }

    // Don't show overdue indicators for completed tasks
    const completedStatuses = ['Done', 'Completed', 'Delivered'];
    const isCompleted = completedStatuses.some(s =>
        status?.toLowerCase().includes(s.toLowerCase())
    );

    const dueDateStatus = getDueDateStatus(dueDate);
    const due = new Date(dueDate);
    const now = new Date();

    // Format the date
    const isToday = due.toDateString() === now.toDateString();
    const isTomorrow = due.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    let text;
    if (isToday) {
        text = `Today at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
        text = `Tomorrow at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        text = due.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Add status label
    if (!isCompleted && dueDateStatus === 'overdue') {
        const hoursOverdue = Math.abs((due - now) / (1000 * 60 * 60));
        if (hoursOverdue >= 24) {
            const daysOverdue = Math.floor(hoursOverdue / 24);
            text = `${daysOverdue}d overdue`;
        } else {
            text = `${Math.floor(hoursOverdue)}h overdue`;
        }
    } else if (!isCompleted && dueDateStatus === 'due-soon') {
        const hoursUntil = (due - now) / (1000 * 60 * 60);
        text = `Due in ${Math.floor(hoursUntil)}h`;
    }

    // Determine className
    let className = '';
    if (!isCompleted) {
        if (dueDateStatus === 'overdue') {
            className = 'text-red-400 bg-red-500/10';
        } else if (dueDateStatus === 'due-soon') {
            className = 'text-orange-400 bg-orange-500/10';
        } else {
            className = 'text-neutral-400';
        }
    }

    return {
        text,
        status: isCompleted ? 'completed' : dueDateStatus,
        className
    };
};

/**
 * Calculate hours remaining until due date
 * @param {string|Date} dueDate - The due date
 * @returns {number|null} Hours remaining (negative if overdue)
 */
export const getHoursRemaining = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    return (due - now) / (1000 * 60 * 60);
};

/**
 * Format a due date as a short relative time string for Kanban cards
 * e.g., "In 12 hours", "In 2 days", "3h overdue", "5d overdue"
 * @param {string|Date} dueDate - The due date
 * @param {string} status - Task status
 * @returns {string|null} Relative time string
 */
export const formatRelativeTime = (dueDate, status) => {
    if (!dueDate) return null;

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const completedStatuses = ['Done', 'Completed', 'Delivered'];
    const isCompleted = completedStatuses.some(s =>
        status?.toLowerCase().includes(s.toLowerCase())
    );

    if (isCompleted) {
        return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    if (diffMs < 0) {
        // Overdue
        const absHours = Math.abs(diffHours);
        if (absHours < 1) return 'Just now';
        if (absHours < 24) return `${Math.floor(absHours)}h overdue`;
        return `${Math.floor(Math.abs(diffDays))}d overdue`;
    }

    // Future
    if (diffHours < 1) {
        const mins = Math.floor(diffMs / (1000 * 60));
        return `In ${mins}m`;
    }
    if (diffHours < 24) return `In ${Math.floor(diffHours)} hours`;
    if (diffDays < 7) return `In ${Math.floor(diffDays)} days`;
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Calculate business days between two dates (excluding weekends)
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {number} Business days
 */
export const calculateBusinessDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
};
