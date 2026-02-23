import Airtable from 'airtable';

// Initialize Airtable client
const airtableApiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
const airtableBaseId = import.meta.env.VITE_AIRTABLE_BASE_ID;

if (!airtableApiKey || !airtableBaseId) {
  console.warn('Airtable credentials not configured. Please add VITE_AIRTABLE_API_KEY and VITE_AIRTABLE_BASE_ID to your .env file');
}

// Configure Airtable
const airtable = new Airtable({ apiKey: airtableApiKey });
const base = airtable.base(airtableBaseId);

export { base, airtable };
export default base;
