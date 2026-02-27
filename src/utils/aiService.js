/**
 * AI Service — calls ai-task-assistant edge function
 * Follows the same pattern as stripeService.js
 */
import { supabase } from '../supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Send a chat message to the AI assistant
 * @param {string} title - Current task title
 * @param {string} description - Current task description
 * @param {Array<{role: string, content: string}>} messages - Chat history
 * @returns {Promise<{response: string, suggestion: {title: string, description: string} | null}>}
 */
export const chat = async (title, description, messages, clientInfo = null) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-task-assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                action: 'chat',
                title,
                description,
                messages,
                ...(clientInfo ? { clientInfo } : {})
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || errBody.message || 'Failed to get AI response');
        }

        return await response.json();
    } catch (error) {
        console.error('AI chat error:', error);
        return { error };
    }
};

/**
 * Generate a concept image via AI
 * @param {string} prompt - Image generation prompt
 * @param {string|null} referenceImageUrl - Base64 image to use as reference for edits
 * @param {object|null} context - Brief context { title, description } for richer prompts
 * @returns {Promise<{response: string, images: string[]}>}
 */
export const generateImage = async (prompt, referenceImageUrl = null, context = null) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-task-assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                action: 'generate_image',
                prompt,
                ...(referenceImageUrl ? { referenceImageUrl } : {}),
                ...(context ? { title: context.title, description: context.description } : {})
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || errBody.message || 'Failed to generate image');
        }

        return await response.json();
    } catch (error) {
        console.error('AI image generation error:', error);
        return { error };
    }
};

/**
 * Generate an image prompt from conversation context (background)
 * @param {string} title - Current task title
 * @param {string} description - Current task description
 * @param {Array<{role: string, content: string}>} messages - Chat history
 * @returns {Promise<{prompt: string}>}
 */
export const generatePrompt = async (title, description, messages) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-task-assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                action: 'generate_prompt',
                title,
                description,
                messages
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || 'Failed to generate prompt');
        }

        return await response.json();
    } catch (error) {
        console.error('AI prompt generation error:', error);
        return { error };
    }
};

export default { chat, generateImage, generatePrompt };
