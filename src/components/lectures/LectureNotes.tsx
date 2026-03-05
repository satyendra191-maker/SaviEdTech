'use client';

import React, { useState } from 'react';
import { FileText, Download, ExternalLink, Clock, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimestampLink {
    time: number;
    label: string;
}

interface Attachment {
    name: string;
    url: string;
    type: string;
    size: number;
}

interface LectureNotesProps {
    notes: string;
    attachments?: Attachment[];
    timestamps?: TimestampLink[];
    onTimestampClick?: (time: number) => void;
    className?: string;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string): string {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('image')) return 'IMG';
    if (type.includes('video')) return 'VID';
    if (type.includes('audio')) return 'AUD';
    if (type.includes('zip') || type.includes('rar')) return 'ZIP';
    return 'FILE';
}

function getFileColor(type: string): string {
    if (type.includes('pdf')) return 'bg-red-100 text-red-600';
    if (type.includes('image')) return 'bg-purple-100 text-purple-600';
    if (type.includes('video')) return 'bg-blue-100 text-blue-600';
    if (type.includes('audio')) return 'bg-amber-100 text-amber-600';
    if (type.includes('zip') || type.includes('rar')) return 'bg-slate-100 text-slate-600';
    return 'bg-slate-100 text-slate-600';
}

function formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function LectureNotes({
    notes,
    attachments = [],
    timestamps = [],
    onTimestampClick,
    className,
}: LectureNotesProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeSection, setActiveSection] = useState<string | null>('notes');

    const handleDownloadPDF = () => {
        // Create a simple HTML template for the PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Lecture Notes</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px; }
                    .content { white-space: pre-wrap; color: #444; }
                    .timestamp { color: #0070f3; font-weight: bold; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <h1>Lecture Notes</h1>
                <div class="content">${notes}</div>
                <div class="footer">
                    Downloaded from SaviEd - ${new Date().toLocaleDateString()}
                </div>
            </body>
            </html>
        `;

        // Create a blob and open in new window for printing/saving as PDF
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');

        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleDownloadAttachment = (attachment: Attachment) => {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={cn('bg-white rounded-2xl border border-slate-200 overflow-hidden', className)}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Lecture Notes</h3>
                        <p className="text-sm text-slate-500">
                            {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Save as PDF
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-500" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        )}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="divide-y divide-slate-100">
                    {/* Notes Content */}
                    <div className="p-4">
                        <div className="prose prose-slate max-w-none">
                            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                                {notes.split('\n').map((paragraph, index) => (
                                    <p key={index} className={paragraph.trim() ? 'mb-4' : 'mb-2'}>
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Timestamps Section */}
                    {timestamps.length > 0 && (
                        <div className="p-4 bg-slate-50/50">
                            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary-600" />
                                Key Moments
                            </h4>
                            <div className="space-y-2">
                                {timestamps.map((timestamp, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onTimestampClick?.(timestamp.time)}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all group text-left"
                                    >
                                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-mono font-medium rounded-lg">
                                            {formatTimestamp(timestamp.time)}
                                        </span>
                                        <span className="text-sm text-slate-700 group-hover:text-primary-600 transition-colors">
                                            {timestamp.label}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attachments Section */}
                    {attachments.length > 0 && (
                        <div className="p-4">
                            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary-600" />
                                Attachments
                            </h4>
                            <div className="space-y-2">
                                {attachments.map((attachment, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                                    >
                                        <div className={cn(
                                            'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold',
                                            getFileColor(attachment.type)
                                        )}>
                                            {getFileIcon(attachment.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {attachment.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {formatFileSize(attachment.size)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadAttachment(attachment)}
                                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white rounded-lg transition-all"
                                        >
                                            <Download className="w-4 h-4 text-slate-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LectureNotes;
