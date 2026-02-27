import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, X, Circle, User, Calendar,
  AlignJustify, ToggleLeft, ToggleRight, Image as ImageIcon, Paperclip, Sparkles, Undo2
} from 'lucide-react';
import { Avatar } from './Shared';
import { STATUS_CONFIG } from '../utils/constants';
import { CustomSelect, MultiSelectUsers } from './CustomUI';
import AIChatPanel, { clearAiChatSession } from './AIChatPanel';

export const NewTaskModal = ({ isOpen, onClose, onAddTask, clients = [], team = [], initialStatus = 'Backlog', currentUser = null, userRole = 'team', userMembership = null, clientContactId = null }) => {
   if (!isOpen) return null;

   const isCustomer = userRole === 'customer';

   // Find current user's team member ID
   const currentTeamMember = team.find(t => t.email === currentUser?.email);
   const currentTeamMemberId = currentTeamMember?.id;

   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [designUrl, setDesignUrl] = useState('');
   const [isPrivate, setIsPrivate] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);

   // AI mode — single boolean controls everything, CSS handles transitions
   const [aiMode, setAiMode] = useState(false);
   const [aiEverOpened, setAiEverOpened] = useState(false);

   // AI conversation tracking (for saving to task)
   const aiMessagesRef = useRef([]);
   const handleAiMessagesChange = useCallback((msgs) => {
       aiMessagesRef.current = msgs;
   }, []);

   // Draggable separator
   const [splitRatio, setSplitRatio] = useState(0.5);
   const [isDragging, setIsDragging] = useState(false);
   const containerRef = useRef(null);

   const [properties, setProperties] = useState({
     status: isCustomer ? 'Backlog' : initialStatus,
     createdById: isCustomer ? null : currentTeamMemberId,
     coCreatorId: null,
     assigneeId: isCustomer ? null : currentTeamMemberId,
     helperId: null,
     dueDate: '',
     clientId: isCustomer ? userMembership : null,
     type: null,
   });

   useEffect(() => {
       if (isOpen) {
           setProperties(prev => ({
               ...prev,
               status: isCustomer ? 'Backlog' : initialStatus,
               createdById: isCustomer ? null : currentTeamMemberId,
               assigneeId: isCustomer ? null : currentTeamMemberId,
               clientId: isCustomer ? userMembership : prev.clientId
           }));
           setAiMode(false);
           setAiEverOpened(false);
           setSplitRatio(0.5);
           // Clear any running animation
           if (animationRef.current) {
               clearTimeout(animationRef.current);
               animationRef.current = null;
           }
           setIsAnimatingBrief(false);
       }
   }, [initialStatus, isOpen, currentTeamMemberId, isCustomer, userMembership]);

   const enterAiMode = useCallback(() => {
       setAiEverOpened(true);
       setAiMode(true);
   }, []);

   const exitAiMode = useCallback(() => {
       setAiMode(false);
   }, []);

   // Animated brief building
   const [isAnimatingBrief, setIsAnimatingBrief] = useState(false);
   const animationRef = useRef(null);

   const handleApplySuggestion = useCallback((suggestion) => {
       if (suggestion.title) setTitle(suggestion.title);
       if (suggestion.description) {
           // Cancel any running animation
           if (animationRef.current) {
               clearTimeout(animationRef.current);
               animationRef.current = null;
           }

           const oldText = description || '';
           const newText = suggestion.description;

           // If identical, skip
           if (oldText === newText) {
               setIsAnimatingBrief(false);
               return;
           }

           // ── LCS-based line diff — only animate actually changed lines ──
           // Uses Longest Common Subsequence to find which lines are identical
           // between old and new, then only deletes/inserts the differing lines.
           // Unchanged lines stay frozen in place even if changes are scattered.
           const oldLines = oldText ? oldText.split('\n') : [];
           const newLines = newText ? newText.split('\n') : [];
           const m = oldLines.length, n = newLines.length;

           // Build LCS dynamic programming table
           const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
           for (let i = 1; i <= m; i++) {
               for (let j = 1; j <= n; j++) {
                   dp[i][j] = oldLines[i - 1] === newLines[j - 1]
                       ? dp[i - 1][j - 1] + 1
                       : Math.max(dp[i - 1][j], dp[i][j - 1]);
               }
           }

           // Backtrack to find matched line pairs
           const matches = [];
           let ii = m, jj = n;
           while (ii > 0 && jj > 0) {
               if (oldLines[ii - 1] === newLines[jj - 1]) {
                   matches.unshift({ oldIdx: ii - 1, newIdx: jj - 1 });
                   ii--; jj--;
               } else if (dp[ii - 1][jj] >= dp[ii][jj - 1]) {
                   ii--;
               } else {
                   jj--;
               }
           }

           const keptOldSet = new Set(matches.map(p => p.oldIdx));
           const keptNewSet = new Set(matches.map(p => p.newIdx));

           // Build animation keyframes — each is the full text at that step
           const keyframes = [];

           // Phase 1: delete removed lines (one frame per deletion — quick pop out)
           let working = [...oldLines];
           let offset = 0;
           for (let idx = 0; idx < m; idx++) {
               if (!keptOldSet.has(idx)) {
                   working.splice(idx - offset, 1);
                   offset++;
                   keyframes.push(working.join('\n'));
               }
           }

           const deletionCount = keyframes.length;

           // Phase 2: insert new lines character-by-character (typing effect)
           // After deletions, `working` contains only the kept lines in order.
           // Inserting at index `idx` works because all prior indices (kept + already
           // inserted) are already in place, maintaining the correct position invariant.
           for (let idx = 0; idx < n; idx++) {
               if (!keptNewSet.has(idx)) {
                   const line = newLines[idx];
                   working.splice(idx, 0, '');
                   if (line.length === 0) {
                       // Empty line — single keyframe
                       keyframes.push(working.join('\n'));
                   } else {
                       // Type out letter by letter
                       for (let c = 1; c <= line.length; c++) {
                           working[idx] = line.slice(0, c);
                           keyframes.push(working.join('\n'));
                       }
                   }
               }
           }

           if (keyframes.length === 0) {
               setDescription(newText);
               return;
           }

           // Tag each keyframe with its phase for different speeds
           const taggedFrames = keyframes.map((text, i) => ({ text, phase: i < deletionCount ? 'delete' : 'type' }));

           setIsAnimatingBrief(true);
           let frameIdx = 0;

           const runFrame = () => {
               if (frameIdx < taggedFrames.length) {
                   setDescription(taggedFrames[frameIdx].text);
                   const delay = taggedFrames[frameIdx].phase === 'delete' ? 160 : 6;
                   frameIdx++;
                   animationRef.current = setTimeout(runFrame, delay);
               } else {
                   animationRef.current = null;
                   setDescription(newText); // ensure exact final text
                   setIsAnimatingBrief(false);
               }
           };
           runFrame();
       }
   }, [description]);

   // Draggable separator logic
   const handleMouseDown = useCallback((e) => {
       if (!aiMode) return;
       e.preventDefault();
       setIsDragging(true);
   }, [aiMode]);

   useEffect(() => {
       if (!isDragging) return;

       const handleMouseMove = (e) => {
           if (!containerRef.current) return;
           const rect = containerRef.current.getBoundingClientRect();
           const x = e.clientX - rect.left;
           const ratio = x / rect.width;
           setSplitRatio(Math.min(0.75, Math.max(0.25, ratio)));
       };

       const handleMouseUp = () => setIsDragging(false);

       document.addEventListener('mousemove', handleMouseMove);
       document.addEventListener('mouseup', handleMouseUp);
       document.body.style.userSelect = 'none';
       document.body.style.cursor = 'col-resize';

       return () => {
           document.removeEventListener('mousemove', handleMouseMove);
           document.removeEventListener('mouseup', handleMouseUp);
           document.body.style.userSelect = '';
           document.body.style.cursor = '';
       };
   }, [isDragging]);

   const handleSubmit = async () => {
     if (!title || isSubmitting) return;
     setIsSubmitting(true);
     try {
       // Build AI conversation for task — include all messages (text + images)
       let aiConversation = null;
       let aiImages = null;
       if (aiEverOpened && aiMessagesRef.current.length > 1) {
           aiConversation = aiMessagesRef.current
               .filter((m, i) => {
                   if (i === 0) return false; // skip greeting
                   return m.content || (m.images && m.images.length > 0);
               })
               .map(m => ({
                   role: m.role,
                   content: m.content,
                   ...(m.feedback ? { feedback: m.feedback } : {}),
                   ...(m.images && m.images.length > 0 ? { images: m.images, imageRating: m.imageRating || 0 } : {}),
               }));

           // Collect all generated images with their ratings (for gallery view)
           const collectedImages = [];
           aiMessagesRef.current.forEach(m => {
               if (m.images && m.images.length > 0) {
                   m.images.forEach(img => {
                       collectedImages.push({
                           url: img,
                           rating: m.imageRating || 0
                       });
                   });
               }
           });
           if (collectedImages.length > 0) {
               aiImages = collectedImages;
           }
       }

       console.log('[NewTaskModal] Submit — aiEverOpened:', aiEverOpened, '| aiMessagesRef count:', aiMessagesRef.current.length, '| aiConversation:', aiConversation?.length || 0, '| aiImages:', aiImages?.length || 0);
       await onAddTask({ title, description, designUrl, isPrivate, aiConversation, aiImages, ...properties });
       clearAiChatSession();
       setTitle('');
       setDescription('');
       setDesignUrl('');
       setIsPrivate(false);
       setAiMode(false);
       setProperties({
           status: 'Backlog',
           createdById: currentTeamMemberId,
           coCreatorId: null,
           assigneeId: currentTeamMemberId,
           helperId: null,
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

   const statusOptions = isCustomer
     ? [{ value: 'Backlog', label: 'Backlog' }]
     : Object.keys(STATUS_CONFIG).map(s => ({ value: s, label: s }));

   const getClientGroup = (status) => {
       const s = (status || '').toLowerCase();
       if (s.includes('en cours') || s.includes('start') || s.includes('active') || s.includes('grow') || s.includes('boost') || s.includes('lite') || s.includes('support')) return 'Active';
       if (s.includes('pause')) return 'Paused';
       if (s.includes('cancel') || s.includes('annul')) return 'Cancelled';
       return 'Other';
   };

   const groupOrder = { 'Active': 0, 'Paused': 1, 'Cancelled': 2, 'Other': 3 };

   const clientOptions = [...clients]
       .sort((a, b) => {
           const groupA = groupOrder[getClientGroup(a.status)] ?? 3;
           const groupB = groupOrder[getClientGroup(b.status)] ?? 3;
           if (groupA !== groupB) return groupA - groupB;
           return (a.client_name || '').localeCompare(b.client_name || '');
       })
       .map(c => ({ value: c.id, label: c.client_name || "Unknown Client", group: getClientGroup(c.status) }));

   const assigneeOptions = team.map(t => ({ value: t.id, label: t.full_name || t.email }));

   const typeOptions = [
       { value: 'Design', label: 'Design' },
       { value: 'Development', label: 'Development' },
       { value: 'Marketing', label: 'Marketing' }
   ];

   // Look up client info for AI context
   const selectedClientId = isCustomer ? userMembership : properties.clientId;
   const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
   const clientInfoForAI = selectedClient?.josphine_client_infos || null;

   // ---- LAYOUT STYLES ----
   // CSS transitions handle the smooth sliding. No JS timeouts needed.
   const easeCurve = 'cubic-bezier(0.16, 1, 0.3, 1)';
   const transitionCSS = isDragging
       ? 'none'
       : `flex-grow 0.4s ${easeCurve}, flex-shrink 0.4s ${easeCurve}, flex-basis 0.4s ${easeCurve}`;

   const leftPanelStyle = {
       flexGrow: aiMode ? splitRatio : 1,
       flexShrink: aiMode ? 0 : 1,
       flexBasis: '0%',
       minWidth: '300px',
       transition: transitionCSS,
   };

   const rightPanelStyle = {
       flexGrow: aiMode ? (1 - splitRatio) : 0,
       flexShrink: 0,
       flexBasis: aiMode ? '0%' : '320px',
       minWidth: aiMode ? '300px' : '320px',
       transition: transitionCSS,
   };

   const separatorTransition = isDragging ? 'none' : `width 0.4s ${easeCurve}`;

   // ---- CONTENT CROSSFADE STYLES ----
   const propertiesStyle = {
       opacity: aiMode ? 0 : 1,
       pointerEvents: aiMode ? 'none' : 'auto',
       transition: aiMode
           ? `opacity 0.2s ease, transform 0.2s ease`
           : `opacity 0.28s ease 0.12s, transform 0.28s ease 0.12s`,
       transform: aiMode ? 'translateX(12px)' : 'translateX(0)',
   };

   const aiPanelStyle = {
       opacity: aiMode ? 1 : 0,
       pointerEvents: aiMode ? 'auto' : 'none',
       transition: aiMode
           ? `opacity 0.28s ease 0.14s, transform 0.28s ease 0.14s`
           : `opacity 0.18s ease, transform 0.18s ease`,
       transform: aiMode ? 'translateX(0)' : 'translateX(-12px)',
   };

   return (
       <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
           <div
             ref={containerRef}
             className="bg-white dark:bg-[#0f0f0f] w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex overflow-hidden animate-scale-in"
             onClick={e => e.stopPropagation()}
           >
               {/* ═══ LEFT SIDE — Task Content ═══ */}
               <div className="flex flex-col" style={leftPanelStyle}>
                   <div className="flex-1 p-8 flex flex-col">
                       <div className="mb-6">
                           <div className="text-xs text-neutral-500 mb-2 font-medium">New task</div>
                           <input
                              placeholder="Enter a title for this task..."
                              className="w-full bg-transparent text-4xl font-bold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-700 focus:outline-none"
                              autoFocus
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                           />
                       </div>

                       <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2">
                           <textarea
                              className={`w-full bg-transparent text-neutral-600 dark:text-neutral-300 text-sm resize-none focus:outline-none flex-1 min-h-[96px] placeholder-neutral-400 dark:placeholder-neutral-600 ${isAnimatingBrief ? 'caret-[#D08B00]' : ''}`}
                              placeholder="Type '/' for commands or just start typing a description"
                              value={description}
                              onChange={e => { if (!isAnimatingBrief) setDescription(e.target.value); }}
                              readOnly={isAnimatingBrief}
                           />

                           {!isCustomer && (
                             <div className="mt-6">
                                <label className="text-xs text-neutral-500 font-medium mb-2 block">Design URL (optional)</label>
                                <input
                                   type="url"
                                   className="w-full bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-600 dark:text-neutral-300 text-sm placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                                   placeholder="https://figma.com/... or any design link"
                                   value={designUrl}
                                   onChange={e => setDesignUrl(e.target.value)}
                                />
                                <p className="text-xs text-neutral-600 mt-1">Add a Figma, Loom, YouTube, or website link to create version 1</p>
                             </div>
                           )}

                       </div>
                   </div>

                   {/* Left panel footer */}
                   <div className="px-8 py-5 border-t border-neutral-200 dark:border-neutral-800/50">
                       <div className="flex items-center justify-between">
                           {!isCustomer && (
                             <div
                                 className="flex items-center gap-2 text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-600 dark:text-neutral-300 transition-colors select-none"
                                 onClick={() => setIsPrivate(!isPrivate)}
                             >
                                 {isPrivate ? <ToggleRight size={20} className="text-neutral-900 dark:text-white" /> : <ToggleLeft size={20} />}
                                 <span className="text-xs">Private</span>
                             </div>
                           )}
                           <div className="flex items-center gap-3 ml-auto">
                               {!aiMode && (
                                   <button
                                       onClick={enterAiMode}
                                       className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-white hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                                   >
                                       <Sparkles size={13} />
                                       Enhance with AI
                                   </button>
                               )}
                               <button
                                  onClick={handleSubmit}
                                  disabled={!title || isSubmitting}
                                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${title && !isSubmitting ? 'bg-white text-black hover:bg-neutral-200 dark:hover:bg-neutral-200 scale-100 opacity-100' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed scale-95 opacity-70'}`}
                               >
                                   {isSubmitting ? 'Creating...' : 'Create task'}
                               </button>
                           </div>
                       </div>
                   </div>
               </div>

               {/* ═══ SEPARATOR ═══ */}
               <div
                   className="relative flex-shrink-0 group"
                   style={{ width: aiMode ? '6px' : '1px', transition: separatorTransition }}
               >
                   <div
                       className={`absolute inset-0 transition-colors duration-200 ${
                           aiMode
                               ? `cursor-col-resize ${isDragging ? 'bg-[#D08B00]/40' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-[#D08B00]/20'}`
                               : 'bg-neutral-200 dark:bg-neutral-800'
                       }`}
                       onMouseDown={aiMode ? handleMouseDown : undefined}
                   />
                   {/* "Details" pill — always visible at 1/4 height in AI mode */}
                   {aiMode && !isDragging && (
                       <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10">
                           <button
                               onClick={exitAiMode}
                               className="flex flex-col items-center gap-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black px-1.5 py-2.5 rounded-full shadow-lg hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
                           >
                               <Undo2 size={11} />
                               <span className="text-[10px] font-semibold leading-none" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Details</span>
                           </button>
                       </div>
                   )}
               </div>

               {/* ═══ RIGHT SIDE — Properties + AI Chat (crossfade) ═══ */}
               <div className="relative overflow-hidden" style={rightPanelStyle}>

                   {/* Properties panel — fades out when AI mode is active */}
                   <div
                       className="absolute inset-0 bg-neutral-50 dark:bg-[#141414] p-6 flex flex-col overflow-hidden"
                       style={propertiesStyle}
                   >
                       <div className="flex justify-between items-center mb-6">
                           <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Properties</div>
                           <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"><X size={20} /></button>
                       </div>

                       <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                           {!isCustomer && (
                             <CustomSelect
                                 label="Customer"
                                 icon={User}
                                 value={properties.clientId}
                                 options={clientOptions}
                                 onChange={v => {
                                     console.log('[NewTaskModal] Customer selected:', v);
                                     setProperties({...properties, clientId: v});
                                 }}
                                 placeholder="Add customer"
                                 searchable
                             />
                           )}

                           <CustomSelect
                               label="Status"
                               icon={Circle}
                               value={properties.status}
                               options={statusOptions}
                               onChange={v => setProperties({...properties, status: v})}
                           />

                           {!isCustomer && (
                             <>
                               <MultiSelectUsers
                                   label="Created By"
                                   icon={User}
                                   values={[properties.createdById, properties.coCreatorId].filter(Boolean)}
                                   options={assigneeOptions}
                                   onChange={(vals) => setProperties({
                                       ...properties,
                                       createdById: vals[0] || null,
                                       coCreatorId: vals[1] || null
                                   })}
                                   placeholder="Select creator"
                                   maxSelections={2}
                                   searchable
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

                               <CustomSelect
                                   label="Helper"
                                   icon={User}
                                   value={properties.helperId}
                                   options={assigneeOptions}
                                   onChange={v => setProperties({...properties, helperId: v})}
                                   type="user"
                                   placeholder="No helper"
                               />
                             </>
                           )}

                           <div className="flex items-center justify-between group py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 px-2 rounded transition-colors">
                               <div className="flex items-center gap-2 text-neutral-500 w-32">
                                   <Calendar size={14} />
                                   <span className="text-sm">Due Date</span>
                               </div>
                               <input
                                   type="date"
                                   className="bg-transparent text-sm text-neutral-600 dark:text-neutral-300 focus:outline-none text-right w-full appearance-none [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert"
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
                   </div>

                   {/* AI Chat panel — fades in when AI mode is active */}
                   {aiEverOpened && (
                       <div
                           className="absolute inset-0 bg-neutral-50 dark:bg-[#141414] flex flex-col overflow-hidden"
                           style={aiPanelStyle}
                       >
                           <AIChatPanel
                               title={title}
                               description={description}
                               onApplySuggestion={handleApplySuggestion}
                               onClose={exitAiMode}
                               onCloseModal={onClose}
                               isActive={aiMode}
                               onMessagesChange={handleAiMessagesChange}
                               clientInfo={clientInfoForAI}
                           />
                       </div>
                   )}
               </div>
           </div>
       </div>
   );
};
