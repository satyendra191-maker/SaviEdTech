'use client';

import { useState, useMemo, ReactNode } from 'react';
import {
    Search,
    ChevronDown,
    ChevronUp,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    Filter,
    Download,
    Trash2,
    Edit,
    Eye,
    CheckSquare,
    Square,
} from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    width?: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (row: T) => ReactNode;
}

export interface DataTableProps<T extends object> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (row: T) => string;
    title?: string;
    searchable?: boolean;
    searchKeys?: string[];
    sortable?: boolean;
    filterable?: boolean;
    pagination?: boolean;
    pageSize?: number;
    selectable?: boolean;
    onRowClick?: (row: T) => void;
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    onView?: (row: T) => void;
    onBulkDelete?: (ids: string[]) => void;
    onBulkExport?: (ids: string[]) => void;
    loading?: boolean;
    emptyMessage?: string;
    actions?: ReactNode;
}

export function DataTable<T extends object>({
    data,
    columns,
    keyExtractor,
    title,
    searchable = true,
    searchKeys = [],
    sortable = true,
    filterable = true,
    pagination = true,
    pageSize = 10,
    selectable = true,
    onRowClick,
    onEdit,
    onDelete,
    onView,
    onBulkDelete,
    onBulkExport,
    loading = false,
    emptyMessage = 'No data found',
    actions,
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    // Filter and sort data
    const processedData = useMemo(() => {
        let result = [...data];

        // Apply search
        if (searchTerm && searchKeys.length > 0) {
            const term = searchTerm.toLowerCase();
            result = result.filter((row) =>
                searchKeys.some((key) => {
                    const value = row[key];
                    return value && String(value).toLowerCase().includes(term);
                })
            );
        }

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                result = result.filter((row) => {
                    const rowValue = row[key];
                    return rowValue && String(rowValue).toLowerCase().includes(value.toLowerCase());
                });
            }
        });

        // Apply sorting
        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }

                return 0;
            });
        }

        return result;
    }, [data, searchTerm, searchKeys, filters, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(processedData.length / pageSize);
    const paginatedData = useMemo(() => {
        if (!pagination) return processedData;
        const start = (currentPage - 1) * pageSize;
        return processedData.slice(start, start + pageSize);
    }, [processedData, currentPage, pageSize, pagination]);

    // Handle sort
    const handleSort = (key: string) => {
        if (!sortable) return;
        setSortConfig((current) => {
            if (!current || current.key !== key) {
                return { key, direction: 'asc' };
            }
            if (current.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return null;
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectedRows.size === paginatedData.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(paginatedData.map((row) => keyExtractor(row))));
        }
    };

    // Handle select row
    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRows(newSelected);
    };

    // Handle bulk delete
    const handleBulkDelete = () => {
        if (onBulkDelete && selectedRows.size > 0) {
            onBulkDelete(Array.from(selectedRows));
            setSelectedRows(new Set());
        }
    };

    // Handle bulk export
    const handleBulkExport = () => {
        if (onBulkExport && selectedRows.size > 0) {
            onBulkExport(Array.from(selectedRows));
        }
    };

    // Get unique values for filter dropdown
    const getFilterOptions = (key: string) => {
        const values = new Set<string>();
        data.forEach((row) => {
            const value = row[key];
            if (value !== null && value !== undefined) {
                values.add(String(value));
            }
        });
        return Array.from(values).slice(0, 20);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
                        {selectable && selectedRows.size > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">
                                    {selectedRows.size} selected
                                </span>
                                {onBulkExport && (
                                    <button
                                        onClick={handleBulkExport}
                                        className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        title="Export selected"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
                                {onBulkDelete && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete selected"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {actions}
                        {filterable && (
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    {searchable && (
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm"
                            />
                        </div>
                    )}
                </div>

                {/* Filter Panel */}
                {showFilters && filterable && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {columns
                                .filter((col) => col.filterable !== false)
                                .map((col) => (
                                    <div key={col.key}>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            {col.header}
                                        </label>
                                        <select
                                            value={filters[col.key] || ''}
                                            onChange={(e) =>
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    [col.key]: e.target.value,
                                                }))
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-sm"
                                        >
                                            <option value="">All</option>
                                            {getFilterOptions(col.key).map((value) => (
                                                <option key={value} value={value}>
                                                    {value}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setFilters({})}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {selectable && (
                                <th className="w-10 px-4 py-3">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-slate-400 hover:text-primary-600 transition-colors"
                                    >
                                        {selectedRows.size === paginatedData.length && paginatedData.length > 0 ? (
                                            <CheckSquare className="w-5 h-5" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${col.sortable !== false && sortable ? 'cursor-pointer hover:bg-slate-100' : ''
                                        }`}
                                    style={{ width: col.width }}
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {sortable && col.sortable !== false && sortConfig?.key === col.key && (
                                            sortConfig.direction === 'asc' ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )
                                        )}
                                    </div>
                                </th>
                            ))}
                            {(onEdit || onDelete || onView) && (
                                <th className="w-16 px-4 py-3"></th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 1 : 0) + (onEdit || onDelete || onView ? 1 : 0)}
                                    className="px-4 py-12 text-center text-slate-500"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => {
                                const rowId = keyExtractor(row);
                                const isSelected = selectedRows.has(rowId);

                                return (
                                    <tr
                                        key={rowId}
                                        onClick={() => onRowClick?.(row)}
                                        className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                            } ${isSelected ? 'bg-primary-50' : ''}`}
                                    >
                                        {selectable && (
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleSelectRow(rowId)}
                                                    className="text-slate-400 hover:text-primary-600 transition-colors"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td key={col.key} className="px-4 py-3">
                                                {col.render ? (
                                                    col.render(row)
                                                ) : (
                                                    <span className="text-sm text-slate-900">
                                                        {String(row[col.key] ?? '-')}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                        {(onEdit || onDelete || onView) && (
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    {onView && (
                                                        <button
                                                            onClick={() => onView(row)}
                                                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {onEdit && (
                                                        <button
                                                            onClick={() => onEdit(row)}
                                                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button
                                                            onClick={() => onDelete(row)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="px-2 sm:px-4 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length}
                    </p>
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                        ? 'bg-primary-600 text-white'
                                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Status Badge Component
interface StatusBadgeProps {
    status: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
    const variants = {
        default: 'bg-slate-100 text-slate-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
    };

    return (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${variants[variant]}`}>
            {status}
        </span>
    );
}

// Action Button Component
interface ActionButtonProps {
    icon: React.ElementType;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
    children?: ReactNode;
}

export function ActionButton({
    icon: Icon,
    onClick,
    variant = 'secondary',
    size = 'sm',
    children,
}: ActionButtonProps) {
    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]}`}
        >
            <Icon className="w-4 h-4" />
            {children}
        </button>
    );
}
