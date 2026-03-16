'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { 
    DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, 
    Wallet, PieChart, BarChart3, ArrowUpRight, ArrowDownRight,
    Plus, Search, Filter, Download, Upload, MoreVertical,
    Building, Users, FileText, Calculator, Calendar, Clock,
    ChevronRight, ChevronDown, CheckCircle, AlertCircle, WalletCards,
    Landmark, Banknote, Coins, PiggyBank, ArrowRightLeft
} from 'lucide-react';

interface Transaction {
    id: string;
    date?: string;
    voucher_no?: string;
    account?: string;
    debit?: number;
    credit?: number;
    party_name?: string;
    narration?: string;
    transaction_date?: string;
    customer_name?: string;
}

interface LedgerAccount {
    id: string;
    name: string;
    type: 'asset' | 'liability' | 'income' | 'expense';
    opening_balance?: number;
    closing_balance?: number;
    ledger_account_code?: string;
    total_amount?: number;
}

interface VoucherEntry {
    date: string;
    voucher_type: 'receipt' | 'payment' | 'journal' | 'sales' | 'purchase';
    voucher_no: string;
    party: string;
    amount: number;
    status: 'draft' | 'posted' | 'cancelled';
}

export default function FinanceAccountingPanel() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const supabase = getSupabaseBrowserClient();
        
        const [transactionsRes, ledgersRes] = await Promise.all([
            supabase.from('gst_transactions').select('*').order('transaction_date', { ascending: false }).limit(50),
            supabase.from('ledger_entries').select('*').order('entry_date', { ascending: false }).limit(30)
        ]);

        setTransactions(transactionsRes.data || []);
        setLedgers(ledgersRes.data || []);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const totalDebit = transactions.reduce((acc, t) => acc + (Number(t.debit) || 0), 0);
    const totalCredit = transactions.reduce((acc, t) => acc + (Number(t.credit) || 0), 0);
    const balance = totalCredit - totalDebit;

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
        { id: 'ledgers', label: 'Ledgers', icon: BookIcon },
        { id: 'vouchers', label: 'Vouchers', icon: Receipt },
        { id: 'reports', label: 'Reports', icon: PieChart },
        { id: 'banking', label: 'Banking', icon: Landmark },
    ];

    return (
        <div className="space-y-4">
            {/* Header Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={ArrowUpRight} label="Total Debit" value={totalDebit} color="red" />
                <StatCard icon={ArrowDownRight} label="Total credit" value={totalCredit} color="green" />
                <StatCard icon={Wallet} label="Balance" value={balance} color={balance >= 0 ? 'green' : 'red'} />
                <StatCard icon={Receipt} label="Transactions" value={transactions.length} color="blue" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search transactions, ledgers, vouchers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border-0 focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Plus className="w-4 h-4" />
                        New Entry
                    </button>
                </div>
            </div>

            {/* Main Content Based on Tab */}
            {activeTab === 'dashboard' && (
                <div className="grid lg:grid-cols-2 gap-4">
                    {/* Recent Transactions */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
                            <button className="text-green-600 text-sm font-medium">View All →</button>
                        </div>
                        <div className="space-y-3">
                            {transactions.slice(0, 5).map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            (txn.debit || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                                        }`}>
                                            {(txn.debit || 0) > 0 ? (
                                                <ArrowUpRight className="w-5 h-5 text-red-600" />
                                            ) : (
                                                <ArrowDownRight className="w-5 h-5 text-green-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{txn.customer_name || txn.party_name || 'N/A'}</p>
                                            <p className="text-sm text-slate-500">{txn.voucher_no || txn.id?.slice(0, 8) || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${(txn.debit || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {(txn.debit || 0) > 0 ? '-' : '+'}₹{((txn.credit || txn.debit) || 0).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {txn.transaction_date ? new Date(txn.transaction_date).toLocaleDateString('en-IN') : '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <QuickAction icon={Receipt} label="Receipt Voucher" color="green" />
                            <QuickAction icon={CreditCard} label="Payment Voucher" color="red" />
                            <QuickAction icon={FileText} label="Journal Entry" color="blue" />
                            <QuickAction icon={Calculator} label="Calculator" color="purple" />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <TransactionTable transactions={transactions} />
            )}

            {activeTab === 'ledgers' && (
                <LedgerView ledgers={ledgers} />
            )}

            {activeTab === 'vouchers' && (
                <VoucherView />
            )}

            {activeTab === 'reports' && (
                <ReportsView />
            )}

            {activeTab === 'banking' && (
                <BankingView />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
    const colorClasses: Record<string, string> = {
        red: 'bg-red-50 text-red-600',
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
                {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
            </p>
            <p className="text-sm text-slate-500">{label}</p>
        </div>
    );
}

function QuickAction({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
    const colorClasses: Record<string, string> = {
        red: 'bg-red-50 text-red-600 hover:bg-red-100',
        green: 'bg-green-50 text-green-600 hover:bg-green-100',
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    };

    return (
        <button className={`p-4 rounded-xl ${colorClasses[color]} transition-colors flex flex-col items-center gap-2`}>
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Date</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Voucher No.</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Party Name</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Debit</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((txn, idx) => (
                            <tr key={txn.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-600">
                                    {txn.transaction_date ? new Date(txn.transaction_date).toLocaleDateString('en-IN') : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                                    {txn.voucher_no || txn.id?.slice(0, 8) || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                    {txn.customer_name || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                                    {txn.debit ? `₹${Number(txn.debit).toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                                    {txn.credit ? `₹${Number(txn.credit).toLocaleString('en-IN')}` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function LedgerView({ ledgers }: { ledgers: LedgerAccount[] }) {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ledgers.map((ledger) => (
                <div key={ledger.id} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800">{ledger.ledger_account_code || ledger.name || 'Ledger'}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            ledger.type === 'asset' ? 'bg-blue-100 text-blue-700' :
                            ledger.type === 'liability' ? 'bg-purple-100 text-purple-700' :
                            ledger.type === 'income' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {ledger.type}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        ₹{(Number(ledger.total_amount) || 0).toLocaleString('en-IN')}
                    </p>
                </div>
            ))}
        </div>
    );
}

function VoucherView() {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center py-12">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Voucher Management</h3>
            <p className="text-slate-500 mb-4">Create and manage receipts, payments, and journal vouchers</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Create Voucher
            </button>
        </div>
    );
}

function ReportsView() {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Cash Flow'].map((report) => (
                <div key={report} className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                    <PieChart className="w-8 h-8 text-green-600 mb-3" />
                    <h4 className="font-medium text-slate-800">{report}</h4>
                    <p className="text-sm text-slate-500 mt-1">Generate →</p>
                </div>
            ))}
        </div>
    );
}

function BankingView() {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Bank Accounts</h3>
            <div className="space-y-3">
                {[
                    { name: 'Axis Bank - Operating', balance: 1250000 },
                    { name: 'HDFC Bank - Payroll', balance: 850000 },
                    { name: 'Yes Bank - Fixed Deposit', balance: 2500000 },
                ].map((account, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Landmark className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">{account.name}</p>
                                <p className="text-sm text-slate-500">Account ending ••••{4500 + idx}</p>
                            </div>
                        </div>
                        <p className="font-bold text-slate-800">₹{account.balance.toLocaleString('en-IN')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    );
}
