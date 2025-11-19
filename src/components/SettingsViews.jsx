import React from 'react';
import { Plus, MoreHorizontal, ChevronLeft, CheckCircle2, Circle, Clock, Globe, LayoutTemplate } from 'lucide-react';
import { Avatar } from './Shared';

export const AgencySettingsView = () => (
    <div className="p-10 max-w-2xl">
        <h2 className="text-lg font-medium text-white mb-8">Agency account</h2>
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs text-neutral-500 font-bold uppercase">Business Name</label>
                <input className="w-full bg-[#141414] border border-neutral-800 rounded-md p-2 text-white text-sm focus:border-neutral-600 focus:outline-none" defaultValue="Dafolle" />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-neutral-500 font-bold uppercase">Business email</label>
                <input className="w-full bg-[#141414] border border-neutral-800 rounded-md p-2 text-white text-sm focus:border-neutral-600 focus:outline-none" defaultValue="clara@dafolle.io" />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-neutral-500 font-bold uppercase">Description</label>
                <textarea className="w-full bg-[#141414] border border-neutral-800 rounded-md p-2 text-white text-sm focus:border-neutral-600 focus:outline-none h-24 resize-none" defaultValue="Dafolle is a subscription-based design agency..." />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-neutral-500 font-bold uppercase">Subdomain</label>
                <div className="flex items-center bg-[#141414] border border-neutral-800 rounded-md px-2">
                    <input className="bg-transparent p-2 text-white text-sm focus:outline-none flex-1" defaultValue="dafolle" />
                    <span className="text-neutral-500 text-sm">.getorchestra.com</span>
                    <span className="text-green-500 ml-2"><CheckCircle2 size={14}/></span>
                </div>
            </div>
            <div className="flex justify-end">
                <button className="bg-neutral-200 text-black px-4 py-2 rounded-md text-xs font-bold hover:bg-white">Update</button>
            </div>
        </div>
    </div>
);

export const TeamSettingsView = () => (
    <div className="p-10 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-medium text-white">Members</h2>
            <button className="bg-white text-black text-xs font-bold px-4 py-2 rounded-md hover:bg-neutral-200 flex items-center gap-2">
                <Plus size={14} /> Invite members
            </button>
        </div>
        <div className="space-y-1">
          {[
              { name: 'Clara Champion', email: 'clara@dafolle.io', role: 'Owner', access: null },
              { name: 'Lili', email: 'hello.lili@gmail.com', role: 'Admin', access: 'Can see all customers' },
          ].map((member, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-neutral-800 last:border-0">
                  <div className="flex items-center gap-3 w-1/3">
                      <Avatar name={member.name} size="lg" />
                      <div>
                          <div className="text-white text-sm font-medium">{member.name}</div>
                          <div className="text-neutral-500 text-xs">{member.email}</div>
                      </div>
                  </div>
                  <div className="w-1/6 text-neutral-400 text-xs">{member.role}</div>
                  <button className="text-neutral-600 hover:text-white"><MoreHorizontal size={16}/></button>
              </div>
          ))}
        </div>
    </div>
);

export const WorkflowSettingsView = () => (
    <div className="p-10 max-w-3xl">
        <h2 className="text-lg font-medium text-white mb-2">Workflow</h2>
        <div className="space-y-8 mt-8">
            <div className="bg-[#141414] border border-neutral-800 rounded-lg overflow-hidden">
                <div className="bg-neutral-900/50 px-4 py-2 text-xs font-medium text-neutral-500 border-b border-neutral-800">Beginning</div>
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between bg-[#0f0f0f] border border-neutral-800 rounded-md p-3">
                        <div className="flex items-center gap-3">
                            <Circle size={14} className="text-neutral-500 stroke-dashed" />
                            <span className="text-white text-sm">Backlog</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const TemplatesView = () => (
    <div className="flex h-full">
        <div className="w-64 border-r border-neutral-800 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-white font-medium">Templates</h2>
               <Plus size={14} className="text-neutral-400 cursor-pointer hover:text-white" />
            </div>
            <div className="space-y-1">
                {['Branding', 'Ads payantes', 'Print', 'Web design'].map((t, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer ${i === 0 ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}>
                        <LayoutTemplate size={14} /> {t}
                    </div>
                ))}
            </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto">
             <h1 className="text-3xl font-bold text-white mb-8">Branding</h1>
             <div className="space-y-8 max-w-3xl">
                 <div className="space-y-2">
                     <label className="text-white text-lg font-medium">Description</label>
                     <div className="bg-[#141414] border border-neutral-800 rounded-lg p-4">
                         <textarea className="w-full bg-transparent text-neutral-300 text-sm focus:outline-none resize-none h-20" placeholder="Describe your template..." />
                     </div>
                 </div>
             </div>
        </div>
    </div>
);