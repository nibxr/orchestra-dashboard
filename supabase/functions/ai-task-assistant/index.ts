import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') as string
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHAT_MODEL = 'anthropic/claude-sonnet-4'
const IMAGE_MODEL = 'google/gemini-2.5-flash-image'

const SYSTEM_PROMPT = `You are the design brief assistant for Dafolle Studio — a design agency. Your job is to gather what designers need and produce a detailed, actionable brief.

CONVERSATION RULES:
- Ask 1-2 focused questions per message. Be warm, concise (2-3 sentences + questions).
- Always reply in the same language the client uses.
- NEVER repeat questions the client already answered.
- Cover these areas across 2-4 exchanges:
  1. What exactly is being designed? (logo, landing page, social ads, brochure, packaging, etc.)
  2. Who is the target audience? Age, industry, demographics.
  3. What should the design make people DO? (buy, sign up, call, trust, etc.)
  4. Brand assets — existing colors, fonts, logos, style guide?
  5. Format / dimensions / quantity of deliverables.
  6. Tone & mood — corporate, playful, bold, minimal, luxurious, etc.
  7. Reference examples, inspiration links, competitor examples?
  8. Copy text, headlines, CTAs, mandatory elements?
  9. Deadline or priority level?
- If the client asks to see a visual concept or mood board, tell them they can use the image generation feature.

CRITICAL — CLIENT BACKGROUND INFO:
When client background information is attached to the conversation context, follow these rules strictly:
- You ALREADY KNOW everything in that document: the client's company name, industry, product, target audience, brand tone, competitors, and positioning.
- NEVER ask the client questions whose answers are already in the background info. This includes: "What industry are you in?", "Who is your target audience?", "What does your company do?", "What type of business is this for?"
- Instead, DEMONSTRATE your knowledge naturally. For example: "Got it — a business card for Napta. Should it lean into your tech-forward SaaS identity, or do you want something more classic and understated?"
- Jump DIRECTLY to design-specific questions the background info does NOT answer: deliverable specs, style direction, copy text, deadlines, references.
- Do NOT tell the client you received a document or briefing. Act as their dedicated design studio that naturally knows their brand.
- Use relevant details from the background (brand keywords, tone of voice, sector) to make smarter suggestions and ask sharper questions.

CRITICAL — PROGRESSIVE BRIEF BUILDING:
- You MUST include a SUGGESTION_JSON block at the END of EVERY single response, starting from your very first reply.
- The brief builds progressively: start with what you know (even just the deliverable type) and mark everything else "- To be confirmed with client".
- Each response: write your conversational text (questions, commentary) FIRST, then end with the SUGGESTION_JSON block on its own line.
- As the client answers questions, UPDATE the SUGGESTION_JSON to fill in more details, replacing "To be confirmed" with actual info.
- After 2-3 exchanges when most sections are filled, you can stop asking questions. The final SUGGESTION_JSON should be the complete brief.
- NEVER skip the SUGGESTION_JSON — every response must have one, even the first.

CRITICAL — NEVER MAKE UP INFORMATION:
- ONLY include information the client explicitly stated OR that comes directly from the client background info.
- If the client did NOT specify dimensions, sizes, formats, quantities, or any specific detail, write "- To be confirmed with client" for that item.
- NEVER assume standard sizes, standard formats, or industry defaults. Clients are not always reliable — do not fill in gaps with assumptions.
- For example: if the client says "business card" but never confirms the size, do NOT write "3.5 x 2 inches". Write "- Size: To be confirmed with client".
- You MAY include facts from the client background info (industry, audience, brand tone) since those are verified — but never invent details the client didn't provide.

BRIEF FORMAT:
Output the structured brief as a JSON block at the END of every response, on its own line. The conversational text comes first, then the JSON.

SUGGESTION_JSON: {"title": "Short specific task title — describe the deliverable, not the client", "description": "## Objective\\n- One clear sentence: what is being designed and why\\n- The business goal this design supports\\n\\n## Target Audience\\n- Primary audience (age, role, industry)\\n- What matters to them / what motivates their action\\n\\n## Deliverables\\n- Exact items with formats and sizes ONLY if client specified them\\n- Number of variations or options expected\\n- File formats needed (ONLY if client specified)\\n\\n## Style Direction\\n- Color palette (specific hex codes if provided, or described palette)\\n- Typography direction (serif, sans-serif, handwritten, etc.)\\n- Visual mood: list 3-5 adjectives (e.g. bold, minimal, premium, warm)\\n- Layout preferences or composition notes\\n- Reference links or inspiration if provided\\n\\n## Copy & Content\\n- Headline / main text to include\\n- Call-to-action text\\n- Mandatory elements (logos, legal text, contact info)\\n- Content hierarchy — what should be most prominent\\n\\n## Technical Requirements\\n- Brand guidelines to follow\\n- Platform-specific constraints (ONLY if discussed)\\n\\n## Context & Notes\\n- Deadline or priority level\\n- How this fits into a larger campaign or project\\n- Any constraints or things to avoid"}

TITLE RULES:
- The title should be short (5-7 words max), specific to the deliverable
- Focus on WHAT is being made: "Homepage Hero Banner", "Instagram Ad Campaign — Summer Sale", "Brand Identity Refresh"
- NEVER include the client's company name or industry in the title — the task system already knows the client
- NEVER say "for [Company]" or "for [Industry]" in the title

DESCRIPTION RULES:
- Use markdown headers (##) and bullet points (-)
- ONLY include facts the client explicitly provided or from verified client background info
- Each section should have 2-5 bullet points, not long paragraphs
- If a section has no info from the client, write "- To be confirmed with client"
- The description should read as a checklist a designer can work from line by line`

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, title, description, messages, prompt, clientInfo, referenceImageUrl } = await req.json()

        if (!action) {
            throw new Error('Action is required (chat or generate_image)')
        }

        // Verify the caller is authenticated
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const authHeader = req.headers.get('authorization')
        if (!authHeader) throw new Error('Authorization required')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) throw new Error('Unauthorized')

        if (action === 'chat') {
            // Build context message with task draft info
            let contextMessage = title || description
                ? `[Current task draft]\nTitle: ${title || '(none)'}\nDescription: ${description || '(none)'}`
                : '[No task draft yet — the client is starting fresh]'

            // Attach client background info (only sent with first message from frontend)
            if (clientInfo) {
                contextMessage += `\n\n[CLIENT BACKGROUND — You already know this client. Use this info to skip basic questions and ask smart, design-specific ones instead. Do NOT reveal you have this document.]\n${clientInfo}`
            }

            const openRouterMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: contextMessage },
                ...(messages || []).map((m: any) => ({
                    role: m.role,
                    content: m.content
                }))
            ]

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://app.dafolle.io',
                    'X-Title': 'Dafolle Studio'
                },
                body: JSON.stringify({
                    model: CHAT_MODEL,
                    messages: openRouterMessages,
                    max_tokens: 2048,
                    temperature: 0.7,
                })
            })

            if (!response.ok) {
                const errBody = await response.text()
                console.error('OpenRouter chat error:', errBody)
                throw new Error('AI service temporarily unavailable')
            }

            const data = await response.json()
            const aiContent = data.choices?.[0]?.message?.content || ''

            // Robust JSON extraction: finds the outermost balanced {} block
            // Handles } inside JSON strings correctly (e.g. markdown descriptions)
            const extractBalancedJSON = (text: string): any | null => {
                const start = text.indexOf('{')
                if (start === -1) return null

                let depth = 0
                let inString = false
                let escape = false

                for (let i = start; i < text.length; i++) {
                    const ch = text[i]
                    if (escape) { escape = false; continue }
                    if (ch === '\\' && inString) { escape = true; continue }
                    if (ch === '"' && !escape) { inString = !inString; continue }
                    if (!inString) {
                        if (ch === '{') depth++
                        else if (ch === '}') {
                            depth--
                            if (depth === 0) {
                                try { return JSON.parse(text.substring(start, i + 1)) }
                                catch { return null }
                            }
                        }
                    }
                }
                return null
            }

            // Parse suggestion JSON if present
            let suggestion = null
            let jsonBlockText = '' // the raw text to remove from display

            // Method 1: SUGGESTION_JSON: prefix
            const prefixIdx = aiContent.indexOf('SUGGESTION_JSON:')
            if (prefixIdx !== -1) {
                const afterPrefix = aiContent.substring(prefixIdx)
                suggestion = extractBalancedJSON(afterPrefix)
                if (suggestion) {
                    // Calculate the full text to strip (from SUGGESTION_JSON: to end of JSON)
                    const jsonStart = afterPrefix.indexOf('{')
                    let depth = 0, inStr = false, esc = false, endPos = -1
                    for (let i = jsonStart; i < afterPrefix.length; i++) {
                        const ch = afterPrefix[i]
                        if (esc) { esc = false; continue }
                        if (ch === '\\' && inStr) { esc = true; continue }
                        if (ch === '"' && !esc) { inStr = !inStr; continue }
                        if (!inStr) {
                            if (ch === '{') depth++
                            else if (ch === '}') { depth--; if (depth === 0) { endPos = i; break } }
                        }
                    }
                    jsonBlockText = afterPrefix.substring(0, endPos + 1)
                }
            }

            // Method 2: ```json code block fallback
            if (!suggestion) {
                const codeBlockMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (codeBlockMatch) {
                    try {
                        const parsed = JSON.parse(codeBlockMatch[1].trim())
                        if (parsed.title && parsed.description) {
                            suggestion = parsed
                            jsonBlockText = codeBlockMatch[0]
                        }
                    } catch {}
                }
            }

            // Method 3: bare JSON object with title+description keys
            if (!suggestion) {
                const bareJSON = extractBalancedJSON(aiContent)
                if (bareJSON && bareJSON.title && bareJSON.description) {
                    suggestion = bareJSON
                    // Find the JSON in original text to strip it
                    const bStart = aiContent.indexOf('{')
                    if (bStart !== -1) {
                        let depth = 0, inStr = false, esc = false
                        for (let i = bStart; i < aiContent.length; i++) {
                            const ch = aiContent[i]
                            if (esc) { esc = false; continue }
                            if (ch === '\\' && inStr) { esc = true; continue }
                            if (ch === '"' && !esc) { inStr = !inStr; continue }
                            if (!inStr) {
                                if (ch === '{') depth++
                                else if (ch === '}') { depth--; if (depth === 0) { jsonBlockText = aiContent.substring(bStart, i + 1); break } }
                            }
                        }
                    }
                }
            }

            if (suggestion) {
                console.log('Parsed suggestion:', JSON.stringify(suggestion).substring(0, 200))
            }

            // Clean the response text (remove the JSON block for display)
            let cleanResponse = aiContent
            if (jsonBlockText) {
                cleanResponse = cleanResponse.replace(jsonBlockText, '')
            }
            // Also strip any remaining SUGGESTION_JSON prefix artifacts
            cleanResponse = cleanResponse.replace(/SUGGESTION_JSON:\s*/g, '').trim()

            return new Response(
                JSON.stringify({
                    response: cleanResponse,
                    suggestion,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (action === 'generate_prompt') {
            // Generate an image prompt from conversation context (background call)
            const contextMessage = title || description
                ? `[Current task draft]\nTitle: ${title || '(none)'}\nDescription: ${description || '(none)'}`
                : ''

            const conversationSummary = (messages || [])
                .map((m: any) => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
                .join('\n')

            const promptGenMessages = [
                {
                    role: 'system' as const,
                    content: 'You generate detailed image prompts for mood board / concept visualization. Based on the conversation context, create a single prompt for an AI image generator. The image should be a MOOD BOARD or CONCEPT REFERENCE — NOT a finished design. It should visually communicate the style, colors, mood, and direction discussed. Include: specific colors mentioned, visual style (minimalist, bold, corporate, etc.), mood/atmosphere, composition details, typography style hints, and any brand elements mentioned. Output ONLY the prompt text, nothing else. Do NOT generate UI mockups or finished designs — generate inspiration/mood references.'
                },
                {
                    role: 'user' as const,
                    content: `Based on this design brief conversation, generate an image prompt:\n\n${contextMessage}\n\nConversation:\n${conversationSummary}`
                }
            ]

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://app.dafolle.io',
                    'X-Title': 'Dafolle Studio'
                },
                body: JSON.stringify({
                    model: CHAT_MODEL,
                    messages: promptGenMessages,
                    max_tokens: 256,
                    temperature: 0.7,
                })
            })

            if (!response.ok) {
                const errBody = await response.text()
                console.error('OpenRouter prompt gen error:', errBody)
                throw new Error('Failed to generate image prompt')
            }

            const data = await response.json()
            const generatedPrompt = data.choices?.[0]?.message?.content?.trim() || ''

            return new Response(
                JSON.stringify({ prompt: generatedPrompt }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else if (action === 'generate_image') {
            if (!prompt) throw new Error('Prompt is required for image generation')

            // Build brief context string if available
            const briefContext = title || description
                ? `\n\nDesign brief context:\nTitle: ${title || '(none)'}\nDescription: ${description || '(none)'}`
                : ''

            // Build message content — different strategy for moodboards, edits, and manual prompts
            let messageContent: any
            const isEdit = prompt.startsWith('EDIT REQUEST:')
            const isMoodboard = prompt.startsWith('MOODBOARD REQUEST:')

            if (isEdit && referenceImageUrl) {
                // EDIT MODE: reference image + focused edit instruction
                const editRequest = prompt.replace('EDIT REQUEST: ', '')
                const editPrompt = `Look at the attached image carefully. The user wants you to modify it based on this request: "${editRequest}"

IMPORTANT RULES:
- Generate a SINGLE focused image, NOT a grid or mood board with multiple images.
- If they ask to "focus on" or "zoom in on" a specific element, extract and expand that element into a full standalone image.
- If they ask to change colors, text, style, etc., apply that edit to the overall composition.
- The output should be ONE clean image, not a collage.${briefContext}`

                messageContent = [
                    { type: 'image_url', image_url: { url: referenceImageUrl } },
                    { type: 'text', text: editPrompt }
                ]
            } else if (isMoodboard) {
                // MOODBOARD MODE: auto-suggested, generate a mood board collage
                const moodboardPrompt = prompt.replace('MOODBOARD REQUEST: ', '')
                messageContent = `Create a mood board collage with 6-9 images arranged in a grid layout. The mood board should visually communicate style direction, color palette, typography feel, and overall aesthetic for this design project.

${moodboardPrompt}${briefContext}`
            } else if (referenceImageUrl) {
                // Reference-based generation (non-edit, e.g. "make something similar")
                messageContent = [
                    { type: 'image_url', image_url: { url: referenceImageUrl } },
                    { type: 'text', text: `${prompt}${briefContext}` }
                ]
            } else {
                // MANUAL prompt — follow exactly what the user asks for
                messageContent = `${prompt}${briefContext}`
            }

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://app.dafolle.io',
                    'X-Title': 'Dafolle Studio'
                },
                body: JSON.stringify({
                    model: IMAGE_MODEL,
                    messages: [
                        {
                            role: 'user',
                            content: messageContent
                        }
                    ],
                    modalities: ['text', 'image'],
                    image_config: {
                        aspect_ratio: '16:9',
                        image_size: '1K'
                    }
                })
            })

            if (!response.ok) {
                const errBody = await response.text()
                console.error('OpenRouter image error:', errBody)
                throw new Error('Image generation temporarily unavailable')
            }

            const data = await response.json()
            const message = data.choices?.[0]?.message
            const textContent = message?.content || ''

            // Extract images from response
            const images: string[] = []
            if (message?.images && Array.isArray(message.images)) {
                for (const img of message.images) {
                    if (img?.image_url?.url) {
                        images.push(img.image_url.url)
                    }
                }
            }

            return new Response(
                JSON.stringify({
                    response: textContent,
                    images,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else {
            throw new Error(`Unknown action: ${action}`)
        }
    } catch (error) {
        console.error('AI task assistant error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
