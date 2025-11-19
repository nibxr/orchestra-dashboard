import React from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, MoreHorizontal } from 'lucide-react';
import { Badge } from './Shared';

export const AnalyticsView = () => (
  <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in">
    <h2 className="text-2xl font-bold text-white mb-6">Analytics</h2>
    
    <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-neutral-400 text-sm mb-1 flex items-center gap-2">MRR <span className="bg-neutral-800 rounded-full px-2 py-0.5 text-[10px]">Verified</span></div>
          <div className="text-3xl font-bold text-white flex items-baseline gap-2">
            €62,933.33 <span className="text-red-500 text-sm font-medium -translate-y-1 flex items-center">-10% <ArrowDownRight size={14}/></span>
          </div>
        </div>
        <div className="flex bg-neutral-900 rounded-lg p-1">
          {['1y', '3m', '1m', '7d'].map(range => (
            <button key={range} className={`px-3 py-1 text-xs rounded-md ${range === '7d' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Mock Chart */}
      <div className="h-64 w-full relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
               {[1,2,3,4,5].map(i => <div key={i} className="border-t border-neutral-800 w-full h-0"></div>)}
          </div>
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <path d="M0 100 C 200 100, 400 100, 600 110 S 800 80, 1200 80" fill="none" stroke="#4ade80" strokeWidth="2" />
              <path d="M0 150 C 200 150, 400 150, 600 140 S 800 130, 1200 130" fill="none" stroke="#eab308" strokeWidth="2" />
          </svg>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-6">
      {[
        { label: 'Active subscribers', value: '12', change: '-8%', trend: 'down', sub: '13 previous period' },
        { label: 'Paused subscribers', value: '7', change: '17%', trend: 'down', sub: '6 previous period' }, 
        { label: 'Tasks worked on', value: '1', change: '0%', trend: 'flat', sub: '1 previous period' },
        { label: 'Median task completion', value: '6.78d', change: '-86%', trend: 'up', sub: '47.63d previous period', good: true },
      ].map((kpi, i) => (
        <div key={i} className="bg-[#141414] border border-neutral-800 rounded-xl p-5">
          <div className="text-neutral-400 text-xs font-medium mb-2 flex items-center gap-2">
            {kpi.label}
            <span className={`flex items-center ${kpi.good ? 'text-green-500' : (kpi.trend === 'down' ? 'text-red-500' : 'text-neutral-500')}`}>
               {kpi.change} {kpi.trend === 'down' ? <ArrowDownRight size={12}/> : (kpi.trend === 'up' ? <ArrowUpRight size={12}/> : null)}
            </span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{kpi.value}</div>
          <div className="text-neutral-600 text-[10px]">{kpi.sub}</div>
        </div>
      ))}
    </div>
  </div>
);

export const PaymentsView = () => (
    <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Payments</h2>
            <button className="bg-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-700">Load more upcoming payments</button>
        </div>

        <div className="space-y-8">
            {[
                { date: 'December 3rd, 2025', amount: '4,000.00', client: 'Start | Peoplespheres' },
                { date: 'December 2nd, 2025', amount: '5,000.00', client: 'Grow | Yampa' },
                { date: 'November 30th, 2025', amount: '5,000.00', client: 'Grow | Hikoala' },
            ].map((payment, i) => (
                <div key={i} className="group">
                    <div className="text-neutral-500 text-xs mb-3">{payment.date}</div>
                    <div className="flex justify-between items-center py-2">
                        <div>
                            <div className="text-lg font-bold text-white">€{payment.amount}</div>
                            <div className="text-neutral-400 text-sm">for {payment.client}</div>
                        </div>
                        <div className="bg-neutral-800/50 border border-neutral-700 text-neutral-300 text-xs px-3 py-1 rounded-full">
                            Upcoming
                        </div>
                    </div>
                    <div className="h-px bg-neutral-800 w-full mt-4 group-last:hidden"></div>
                </div>
            ))}
        </div>
    </div>
);

export const CustomersView = ({ clients }) => (
    <div className="p-6 w-full h-full flex flex-col">
         <div className="flex justify-between items-center mb-6">
             <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg">
                 <button className="bg-neutral-800 text-white px-4 py-1.5 rounded-md text-xs font-medium shadow-sm">Customers</button>
                 <button className="text-neutral-500 hover:text-white px-4 py-1.5 rounded-md text-xs font-medium">Archived</button>
             </div>
             <div className="flex gap-3">
                 <button className="text-neutral-400 hover:text-white text-xs font-medium flex items-center gap-2 px-3 py-2 border border-neutral-800 rounded-md">
                     <ArrowDownRight size={14} /> Import from Stripe
                 </button>
                 <button className="bg-white text-black text-xs font-bold px-4 py-2 rounded-md hover:bg-neutral-200 flex items-center gap-2">
                     <Plus size={14} /> Create
                 </button>
             </div>
         </div>
         <div className="flex-1 overflow-y-auto bg-[#141414] border border-neutral-800 rounded-xl">
             <div className="p-3 text-[10px] font-bold text-neutral-500 border-b border-neutral-800 uppercase tracking-wider">Active</div>
             <div className="divide-y divide-neutral-800">
                 {clients.map(client => (
                     <div key={client.id} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors group">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-md bg-neutral-800 flex items-center justify-center text-lg border border-neutral-700 shadow-inner">
                                 {client.logo || '🏢'}
                             </div>
                             <span className="text-neutral-200 text-sm font-medium">{client.name}</span>
                         </div>
                         <div className="flex items-center gap-4">
                             <Badge color="green"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Active</Badge>
                             <button className="text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={16} /></button>
                         </div>
                     </div>
                 ))}
             </div>
         </div>
    </div>
);