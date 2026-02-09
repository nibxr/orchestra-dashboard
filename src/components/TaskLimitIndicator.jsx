import React from 'react';
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';

/**
 * Task Limit Indicator Component
 * Shows current active tasks vs maximum allowed based on plan
 */
export const TaskLimitIndicator = ({ currentActive, maxTasks, compact = false }) => {
    const isAtLimit = currentActive >= maxTasks;
    const percentage = maxTasks > 0 ? (currentActive / maxTasks) * 100 : 0;

    if (compact) {
        return (
            <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium ${
                    isAtLimit
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
                title={`${currentActive} of ${maxTasks} active tasks`}
            >
                {isAtLimit ? (
                    <AlertTriangle size={10} />
                ) : (
                    <Zap size={10} />
                )}
                <span>{currentActive}/{maxTasks}</span>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-400">Active Tasks</span>
                <span className={`text-sm font-bold ${isAtLimit ? 'text-orange-400' : 'text-white'}`}>
                    {currentActive}/{maxTasks}
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full transition-all duration-500 ${
                        isAtLimit ? 'bg-orange-500' : 'bg-lime-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {/* Status message */}
            <div className="flex items-center gap-2 text-xs">
                {isAtLimit ? (
                    <>
                        <AlertTriangle size={12} className="text-orange-400" />
                        <span className="text-orange-400">Task limit reached</span>
                    </>
                ) : (
                    <>
                        <CheckCircle size={12} className="text-lime-400" />
                        <span className="text-neutral-400">
                            {maxTasks - currentActive} slot{maxTasks - currentActive !== 1 ? 's' : ''} available
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * Inline Task Limit Badge for column headers
 */
export const TaskLimitBadge = ({ currentActive, maxTasks }) => {
    const isAtLimit = currentActive >= maxTasks;

    return (
        <span
            className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                isAtLimit
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-lime-500/10 text-lime-400'
            }`}
        >
            {currentActive}/{maxTasks}
        </span>
    );
};

export default TaskLimitIndicator;
