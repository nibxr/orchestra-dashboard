import React, { useState, useEffect } from 'react';
import { 
  LayoutTemplate, Plus, X, Circle, User, Calendar, 
  AlignJustify, ToggleLeft, ToggleRight, Image as ImageIcon, Paperclip
} from 'lucide-react';
import { Avatar } from './Shared';
import { STATUS_CONFIG } from '../utils/constants';
import { CustomSelect } from './CustomUI';

export const NewTaskModal = ({ isOpen, onClose, onAddTask, clients = [], team = [], initialStatus = 'Backlog', currentUser = null }) => {
   if (!isOpen) return null;

   // Find current user's team member ID
   const currentTeamMember = team.find(t => t.email === currentUser?.email);
   const currentTeamMemberId = currentTeamMember?.id;

   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [designUrl, setDesignUrl] = useState('');
   const [isPrivate, setIsPrivate] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);

   const [properties, setProperties] = useState({
     status: initialStatus,
     createdById: currentTeamMemberId,
     assigneeId: currentTeamMemberId,
     dueDate: '',
     clientId: null,
     type: null,
   });

   useEffect(() => {
       if (isOpen) {
           setProperties(prev => ({
               ...prev,
               status: initialStatus,
               createdById: currentTeamMemberId,
               assigneeId: currentTeamMemberId
           }));
       }
   }, [initialStatus, isOpen, currentTeamMemberId]);

   const handleSubmit = async () => {
     if (!title || isSubmitting) return;
     setIsSubmitting(true);
     try {
       await onAddTask({
         title,
         description,
         designUrl,
         isPrivate,
         ...properties
       });
       setTitle('');
       setDescription('');
       setDesignUrl('');
       setIsPrivate(false);
       setProperties({
           status: 'Backlog',
           createdById: currentTeamMemberId,
           assigneeId: currentTeamMemberId,
           dueDate: '',
           clientId: null,
           type: null
       });
     } catch (error) {
       console.error('Error creating task:', error);
     } finally {
       setIsSubmitting(false);
     }
   };

   const statusOptions = Object.keys(STATUS_CONFIG).map(s => ({ value: s, label: s }));
   
   // Correctly map client_name and id based on your CSV structure
   const clientOptions = clients.map(c => ({ 
       value: c.id, 
       label: c.client_name || "Unknown Client" 
   }));

   // Correctly map full_name and id based on your CSV structure
   const assigneeOptions = team.map(t => ({ 
       value: t.id, 
       label: t.full_name || t.email 
   }));

   const typeOptions = [
       { value: 'Design', label: 'Design' },
       { value: 'Development', label: 'Development' },
       { value: 'Marketing', label: 'Marketing' }
   ];

   return (
       <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
           <div 
             className="bg-[#0f0f0f] w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-neutral-800 flex overflow-hidden animate-scale-in"
             onClick={e => e.stopPropagation()}
           >
               {/* LEFT SIDE */}
               <div className="flex-1 p-8 flex flex-col border-r border-neutral-800 relative">
                   <div className="mb-6">
                       <div className="text-xs text-neutral-500 mb-2 font-medium">New task</div>
                       <input 
                          placeholder="Enter a title for this task..." 
                          className="w-full bg-transparent text-4xl font-bold text-white placeholder-neutral-700 focus:outline-none"
                          autoFocus
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                       />
                   </div>
                   
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                       <textarea
                          className="w-full bg-transparent text-neutral-300 text-sm resize-none focus:outline-none h-24 placeholder-neutral-600"
                          placeholder="Type '/' for commands or just start typing a description"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                       />

                       <div className="mt-6">
                          <label className="text-xs text-neutral-500 font-medium mb-2 block">Design URL (optional)</label>
                          <input
                             type="url"
                             className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg px-3 py-2 text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                             placeholder="https://figma.com/... or any design link"
                             value={designUrl}
                             onChange={e => setDesignUrl(e.target.value)}
                          />
                          <p className="text-xs text-neutral-600 mt-1">Add a Figma, Loom, YouTube, or website link to create version 1</p>
                       </div>

                       <div className="mt-8">
                          <div className="mb-4 flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                            <LayoutTemplate size={12}/> Start with a template
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                             {['Branding', 'Ads payantes', 'Print', 'E-book', 'Illustrations', 'Web design'].map(t => (
                                 <button key={t} onClick={() => setTitle(t)} className="px-3 py-2 bg-[#1a1a1a] border border-neutral-800 rounded-lg text-neutral-300 text-xs hover:bg-neutral-800 transition-all text-left truncate">{t}</button>
                             ))}
                          </div>
                       </div>
                   </div>
                   
                   <div className="mt-auto pt-4 flex items-center gap-4 text-neutral-500 border-t border-neutral-800/50">
                       <button className="flex items-center gap-2 hover:text-white text-xs transition-colors"><ImageIcon size={14}/> Add cover</button>
                   </div>
               </div>

               {/* RIGHT SIDE */}
               <div className="w-80 bg-[#141414] p-6 flex flex-col">
                   <div className="flex justify-between items-center mb-6">
                       <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Properties</div>
                       <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
                   </div>

                   <div className="space-y-1 mb-8">
                       <CustomSelect 
                           label="Customer" 
                           icon={User} 
                           value={properties.clientId} 
                           options={clientOptions} 
                           onChange={v => setProperties({...properties, clientId: v})} 
                           placeholder="Add customer"
                       />

                       <CustomSelect
                           label="Status"
                           icon={Circle}
                           value={properties.status}
                           options={statusOptions}
                           onChange={v => setProperties({...properties, status: v})}
                       />

                       <CustomSelect
                           label="Created By"
                           icon={User}
                           value={properties.createdById}
                           options={assigneeOptions}
                           onChange={v => setProperties({...properties, createdById: v})}
                           type="user"
                           placeholder="Select creator"
                       />

                       <CustomSelect
                           label="Assignee"
                           icon={User}
                           value={properties.assigneeId}
                           options={assigneeOptions}
                           onChange={v => setProperties({...properties, assigneeId: v})}
                           type="user"
                           placeholder="Unassigned"
                       />
                       
                       <div className="flex items-center justify-between group py-1.5 hover:bg-neutral-800/50 px-2 rounded transition-colors">
                           <div className="flex items-center gap-2 text-neutral-500 w-32">
                               <Calendar size={14} />
                               <span className="text-sm">Due Date</span>
                           </div>
                           <input 
                               type="date" 
                               className="bg-transparent text-sm text-neutral-300 focus:outline-none text-right w-full appearance-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                               value={properties.dueDate}
                               onChange={e => setProperties({...properties, dueDate: e.target.value})}
                           />
                       </div>

                       <CustomSelect 
                           label="Type" 
                           icon={AlignJustify} 
                           value={properties.type} 
                           options={typeOptions} 
                           onChange={v => setProperties({...properties, type: v})} 
                       />
                   </div>

                   <div className="mt-auto flex justify-between items-center pt-4 border-t border-neutral-800">
                       <div 
                           className="flex items-center gap-2 text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors select-none"
                           onClick={() => setIsPrivate(!isPrivate)}
                       >
                           {isPrivate ? <ToggleRight size={20} className="text-white" /> : <ToggleLeft size={20} />}
                           <span className="text-xs">Make private</span>
                       </div>
                       <button
                          onClick={handleSubmit}
                          disabled={!title || isSubmitting}
                          className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${title && !isSubmitting ? 'bg-white text-black hover:bg-neutral-200 scale-100 opacity-100' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed scale-95 opacity-70'}`}
                       >
                           {isSubmitting ? 'Creating...' : 'Create task'}
                       </button>
                   </div>
               </div>
           </div>
       </div>
   );
};