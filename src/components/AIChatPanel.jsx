import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ImageIcon, Sparkles, Check, X, Loader2, Bot, Pencil, RotateCcw, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import * as aiService from '../utils/aiService';

const STORAGE_KEY = 'dafolle_ai_chat_session';

const defaultGreeting = {
    role: 'assistant',
    content: "Hi! I can help you refine your design brief. Tell me more about what you're looking for \u2014 what's the goal, who's it for, and any style preferences you have?",
    images: null,
    suggestion: null,
};

const loadSession = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
};

const saveSession = (data) => {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
};

export const clearAiChatSession = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

const AIChatPanel = ({ title, description, onApplySuggestion, onClose, onCloseModal, isActive, onMessagesChange, clientInfo }) => {
    const saved = useRef(loadSession());

    const [messages, setMessages] = useState(
        saved.current?.messages?.length > 0 ? saved.current.messages : [defaultGreeting]
    );
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);
    const [expandedImage, setExpandedImage] = useState(null);

    // Image edit input per message
    const [imageEditTexts, setImageEditTexts] = useState({});

    // Auto-suggest image generation
    const [suggestedPrompt, setSuggestedPrompt] = useState(saved.current?.suggestedPrompt || null);
    const [showImageSuggestion, setShowImageSuggestion] = useState(saved.current?.showImageSuggestion || false);
    const [promptGenerating, setPromptGenerating] = useState(false);
    const promptGeneratedRef = useRef(saved.current?.promptGenerated || false);

    // Track whether client info has been sent (only send once with the first message)
    const clientInfoSentRef = useRef(saved.current?.clientInfoSent || false);

    // Persist chat state to sessionStorage whenever key state changes
    useEffect(() => {
        saveSession({
            messages,
            suggestedPrompt,
            showImageSuggestion,
            promptGenerated: promptGeneratedRef.current,
            clientInfoSent: clientInfoSentRef.current,
        });
    }, [messages, suggestedPrompt, showImageSuggestion]);

    const handleImageRating = (messageIndex, rating) => {
        setMessages(prev => prev.map((msg, i) =>
            i === messageIndex ? { ...msg, imageRating: rating } : msg
        ));
    };

    const handleMessageFeedback = (messageIndex, feedback) => {
        setMessages(prev => prev.map((msg, i) => {
            if (i !== messageIndex) return msg;
            // Toggle off if same feedback clicked again
            return { ...msg, feedback: msg.feedback === feedback ? null : feedback };
        }));
    };

    const handleNewChat = () => {
        clearAiChatSession();
        setMessages([defaultGreeting]);
        setInputValue('');
        setImagePrompt('');
        setShowImageInput(false);
        setImageEditTexts({});
        setSuggestedPrompt(null);
        setShowImageSuggestion(false);
        setPromptGenerating(false);
        promptGeneratedRef.current = false;
        clientInfoSentRef.current = false;
    };

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isGeneratingImage]);

    // Auto-apply suggestions to brief as they arrive (progressive building)
    const lastAppliedSuggestionRef = useRef(null);
    useEffect(() => {
        const latestSuggestion = [...messages].reverse().find(m => m.suggestion);
        if (!latestSuggestion?.suggestion) return;

        const prev = lastAppliedSuggestionRef.current;
        const next = latestSuggestion.suggestion;

        // Compare by content to avoid re-animating identical briefs
        const changed = !prev ||
            prev.title !== next.title ||
            prev.description !== next.description;

        if (changed) {
            lastAppliedSuggestionRef.current = next;
            onApplySuggestion(next);
        }
    }, [messages, onApplySuggestion]);

    // Focus input when panel becomes active
    useEffect(() => {
        if (isActive) {
            const timer = setTimeout(() => inputRef.current?.focus(), 350);
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    // Notify parent of messages changes (for saving to task)
    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(messages);
        }
    }, [messages]);

    // Check if the conversation is mature enough for image generation
    // (at least 3 user messages means the brief is reasonably filled in)
    const userMessageCount = messages.filter(m => m.role === 'user' && !m.content.startsWith('🖼')).length;
    const hasEnoughContext = userMessageCount >= 3;

    // After enough context is gathered, generate an image prompt in the background
    useEffect(() => {
        if (
            hasEnoughContext &&
            !promptGeneratedRef.current &&
            !promptGenerating &&
            !isLoading &&
            !isGeneratingImage &&
            isActive
        ) {
            promptGeneratedRef.current = true;
            setPromptGenerating(true);

            // Build clean chat history (no image messages)
            const chatHistory = messages
                .filter(m => {
                    if (m.role === 'user' && m.content.startsWith('🖼')) return false;
                    if (m.role === 'user' && m.content.startsWith('Generate concept image')) return false;
                    if (m.role === 'assistant' && m.images && m.images.length > 0 && !m.content) return false;
                    return m.content;
                })
                .map(m => ({ role: m.role, content: m.content }));

            aiService.generatePrompt(title, description, chatHistory)
                .then(result => {
                    if (result.prompt && !result.error) {
                        setSuggestedPrompt(result.prompt);
                        setShowImageSuggestion(true);
                    }
                })
                .catch(err => console.error('Prompt generation failed:', err))
                .finally(() => setPromptGenerating(false));
        }
    }, [hasEnoughContext, isLoading]);

    // Build clean chat history for the API (filter out image-related messages)
    const buildChatHistory = useCallback((msgs) => {
        return msgs
            .filter(m => {
                // Skip image generation/edit user messages
                if (m.role === 'user' && m.content.startsWith('🖼')) return false;
                if (m.role === 'user' && m.content.startsWith('Generate concept image')) return false;
                // Skip assistant messages that are image-only responses
                if (m.role === 'assistant' && m.images && m.images.length > 0) return false;
                return m.content;
            })
            .map(m => ({ role: m.role, content: m.content }));
    }, []);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = { role: 'user', content: inputValue.trim(), images: null, suggestion: null };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');

        // Reset textarea height
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }

        setIsLoading(true);

        try {
            const chatHistory = buildChatHistory([...messages, userMessage]);

            // Send client info only with the first message
            let clientInfoForCall = null;
            if (clientInfo && !clientInfoSentRef.current) {
                clientInfoForCall = clientInfo;
                clientInfoSentRef.current = true;
            }
            const result = await aiService.chat(title, description, chatHistory, clientInfoForCall);

            if (result.error) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    images: null,
                    suggestion: null,
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: result.response,
                    images: null,
                    suggestion: result.suggestion || null,
                }]);
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                images: null,
                suggestion: null,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async (promptOverride, isEdit = false, isAutoSuggested = false) => {
        const prompt = promptOverride || imagePrompt.trim();
        if (!prompt || isGeneratingImage) return;

        // For edits, find the original image to pass as multimodal context
        let referenceImageUrl = null;
        let fullPrompt = prompt;
        if (isEdit) {
            const lastImageMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.images && m.images.length > 0);
            if (lastImageMsg && lastImageMsg.images.length > 0) {
                referenceImageUrl = lastImageMsg.images[lastImageMsg.images.length - 1];
            }
            fullPrompt = `EDIT REQUEST: ${prompt}`;
        } else if (isAutoSuggested) {
            // Auto-suggested: explicitly request a moodboard collage
            fullPrompt = `MOODBOARD REQUEST: ${prompt}`;
        }

        // Display text: auto-suggested shows "Generate a Moodboard", manual shows actual prompt
        const displayContent = isEdit
            ? `🖼 Edit: ${prompt}`
            : isAutoSuggested
                ? '🖼 Generate a Moodboard'
                : `🖼 ${prompt}`;

        setMessages(prev => [...prev, {
            role: 'user',
            content: displayContent,
            images: null,
            suggestion: null,
        }]);
        setImagePrompt('');
        setShowImageInput(false);
        setShowImageSuggestion(false);
        setIsGeneratingImage(true);

        // Pass brief context so the image model knows what the project is about
        const context = (title || description) ? { title, description } : null;

        try {
            let result = await aiService.generateImage(fullPrompt, referenceImageUrl, context);

            // If edit returned no images (reference too large or model didn't produce one),
            // retry without the reference image — just use the text prompt with context
            if (!result.error && (!result.images || result.images.length === 0) && referenceImageUrl) {
                console.warn('[AI Image] Edit returned no images, retrying without reference image');
                result = await aiService.generateImage(fullPrompt, null, context);
            }

            if (result.error) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sorry, I couldn\'t generate an image right now. Please try again.',
                    images: null,
                    suggestion: null,
                }]);
            } else if (!result.images || result.images.length === 0) {
                // Model returned text but no image even after retry
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: (result.response || 'I understand your request, but I wasn\'t able to generate an image this time.') + '\n\nPlease try rephrasing your request or describing what you\'d like to see.',
                    images: null,
                    suggestion: null,
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: (result.response || 'Here\'s a concept based on our conversation:') + '\n\nIs this close to what you had in mind? You can edit the image below if you\'d like to adjust anything.',
                    images: result.images,
                    suggestion: null,
                }]);
            }
        } catch (err) {
            console.error('Image generation error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, image generation failed. Please try again.',
                images: null,
                suggestion: null,
            }]);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleSuggestedImageGen = () => {
        if (!suggestedPrompt || isGeneratingImage) return;
        handleGenerateImage(suggestedPrompt, false, true); // auto-suggested
    };

    // Enter = new line (default textarea), Cmd/Ctrl+Enter = send
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleImageKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerateImage();
        }
        if (e.key === 'Escape') {
            setShowImageInput(false);
            setImagePrompt('');
        }
    };

    // Auto-resize textarea
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-[#D08B00]" />
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">AI Assistant</span>
                    </div>
                    {messages.length > 1 && (
                        <button
                            onClick={handleNewChat}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-500 hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                        >
                            <RotateCcw size={10} />
                            New Chat
                        </button>
                    )}
                </div>
                <button onClick={onCloseModal} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${msg.role === 'user'
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl rounded-br-md'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl rounded-bl-md'
                        } px-4 py-2.5`}>
                            {/* Text content */}
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                            {/* Images */}
                            {msg.images && msg.images.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {msg.images.map((img, j) => (
                                        <div key={j} className="relative group">
                                            <img
                                                src={img}
                                                alt={`AI generated concept ${j + 1}`}
                                                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setExpandedImage(img)}
                                            />
                                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">Click to expand</span>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Star rating */}
                                    <div className="mt-2 flex items-center gap-1">
                                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mr-1.5">Rate:</span>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => handleImageRating(i, star)}
                                                className="transition-colors"
                                            >
                                                <Star
                                                    size={16}
                                                    className={star <= (msg.imageRating || 0)
                                                        ? 'text-[#D08B00] fill-[#D08B00]'
                                                        : 'text-neutral-400 dark:text-neutral-600 hover:text-[#D08B00]'
                                                    }
                                                />
                                            </button>
                                        ))}
                                        {msg.imageRating > 0 && (
                                            <span className="text-[10px] text-neutral-500 ml-1.5">{msg.imageRating}/5</span>
                                        )}
                                    </div>
                                    {/* Edit image input */}
                                    <div className="mt-2 flex items-center gap-2 bg-neutral-200/60 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                                        <Pencil size={13} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={imageEditTexts[i] || ''}
                                            onChange={(e) => setImageEditTexts(prev => ({ ...prev, [i]: e.target.value }))}
                                            placeholder="Edit image..."
                                            className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && imageEditTexts[i]?.trim()) {
                                                    const editText = imageEditTexts[i].trim();
                                                    setImageEditTexts(prev => ({ ...prev, [i]: '' }));
                                                    handleGenerateImage(editText, true);
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (imageEditTexts[i]?.trim()) {
                                                    const editText = imageEditTexts[i].trim();
                                                    setImageEditTexts(prev => ({ ...prev, [i]: '' }));
                                                    handleGenerateImage(editText, true);
                                                }
                                            }}
                                            disabled={!imageEditTexts[i]?.trim() || isGeneratingImage}
                                            className="text-[#D08B00] hover:text-[#b87a00] disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors shrink-0"
                                        >
                                            <Send size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Suggestion auto-applied indicator — only on latest message with changed content */}
                            {msg.suggestion && (() => {
                                // Only show on the most recent assistant message with a suggestion
                                const lastSuggestionIdx = messages.map((m, idx) => m.suggestion ? idx : -1).filter(x => x >= 0).pop();
                                if (i !== lastSuggestionIdx) return null;
                                // Check if this suggestion differs from the previous one
                                const prevSuggestionMsg = messages.slice(0, i).reverse().find(m => m.suggestion);
                                if (prevSuggestionMsg &&
                                    prevSuggestionMsg.suggestion.title === msg.suggestion.title &&
                                    prevSuggestionMsg.suggestion.description === msg.suggestion.description) return null;
                                return (
                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#D08B00] font-medium">
                                        <Check size={11} />
                                        Brief updated
                                    </div>
                                );
                            })()}

                            {/* Thumbs up/down feedback — on assistant messages (skip greeting) */}
                            {msg.role === 'assistant' && i > 0 && (
                                <div className="mt-2 flex items-center gap-1 -ml-0.5">
                                    <button
                                        onClick={() => handleMessageFeedback(i, 'up')}
                                        className={`p-1 rounded transition-colors ${msg.feedback === 'up'
                                            ? 'text-green-500 dark:text-green-400'
                                            : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400'
                                        }`}
                                        title="Helpful"
                                    >
                                        <ThumbsUp size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleMessageFeedback(i, 'down')}
                                        className={`p-1 rounded transition-colors ${msg.feedback === 'down'
                                            ? 'text-red-500 dark:text-red-400'
                                            : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400'
                                        }`}
                                        title="Not helpful"
                                    >
                                        <ThumbsDown size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="ai-dot-pulse flex gap-1">
                                <span className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full" />
                                <span className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full" />
                                <span className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Image generation loading */}
                {isGeneratingImage && (
                    <div className="flex justify-start">
                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <Loader2 size={14} className="animate-spin" />
                                <span>Generating image...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-neutral-50 dark:bg-transparent">

                {/* Auto-suggest image capsule */}
                {showImageSuggestion && suggestedPrompt && !isGeneratingImage && !showImageInput && (
                    <div className="flex justify-center pb-2.5 ai-capsule-slide-up">
                        <button
                            onClick={handleSuggestedImageGen}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600 transition-all text-sm text-neutral-800 dark:text-neutral-200 group"
                        >
                            <Bot size={15} className="text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors" />
                            <span>Want me to generate a moodboard?</span>
                            <X
                                size={13}
                                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-1 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setShowImageSuggestion(false); }}
                            />
                        </button>
                    </div>
                )}

                {/* Image prompt input (toggled manually) */}
                {showImageInput && (
                    <div className="mb-2 flex items-center gap-2 ai-capsule-slide-up">
                        <div className="flex-1 flex items-center gap-2 px-1">
                            <input
                                type="text"
                                className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
                                placeholder="Describe the image you want..."
                                value={imagePrompt}
                                onChange={e => setImagePrompt(e.target.value)}
                                onKeyDown={handleImageKeyDown}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={() => handleGenerateImage()}
                            disabled={!imagePrompt.trim() || isGeneratingImage}
                            className="p-1.5 rounded-lg bg-[#D08B00] hover:bg-[#b87a00] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={13} />
                        </button>
                        <button
                            onClick={() => { setShowImageInput(false); setImagePrompt(''); }}
                            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Main chat input \u2014 TEXTAREA (Enter = new line, Cmd/Ctrl+Enter = send) */}
                <div className="flex items-center gap-3 px-1">
                    {!showImageInput && (
                        <button
                            onClick={() => setShowImageInput(true)}
                            disabled={isGeneratingImage}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-40 transition-colors shrink-0"
                            title="Generate image"
                        >
                            <ImageIcon size={16} />
                        </button>
                    )}
                    <textarea
                        ref={inputRef}
                        className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none leading-normal py-1"
                        placeholder="Type your message... (Ctrl + Enter to send)"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                        style={{ resize: 'none', maxHeight: '120px', overflowY: 'auto' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                        <Send size={15} />
                    </button>
                </div>
            </div>

            {/* Image lightbox */}
            {expandedImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8 animate-fade-in cursor-pointer"
                    onClick={() => setExpandedImage(null)}
                >
                    <img
                        src={expandedImage}
                        alt="Expanded concept"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
                        onClick={() => setExpandedImage(null)}
                    >
                        <X size={24} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AIChatPanel;
