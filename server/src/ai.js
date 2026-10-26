import OpenAI from 'openai';
const categories = ['Royalty & Payments','ISBN & Metadata Issues','Printing & Quality','Distribution & Availability','Book Status & Production Updates','General Inquiry'];
const priorities = ['Critical','High','Medium','Low'];
function ruleClassify(text) {
  const s=text.toLowerCase();
  let category='General Inquiry';
  if (/royalt|payment|payout|sold copies|bank transfer|money|paid/.test(s)) category='Royalty & Payments';
  else if (/isbn|metadata|author bio|description|wrong title/.test(s)) category='ISBN & Metadata Issues';
  else if (/print|printing|quality|blurry|binding|misalign|defect|reprint/.test(s)) category='Printing & Quality';
  else if (/amazon|flipkart|unavailable|distribution|listing|stock sync|store/.test(s)) category='Distribution & Availability';
  else if (/production|typesetting|cover|proofread|manuscript|status|published|publication/.test(s)) category='Book Status & Production Updates';
  let priority='Low';
  if (/isbn error|wrong isbn|duplicate isbn|legal|fraud|urgent|critical|not received.*(month|quarter)|six months/.test(s)) priority='Critical';
  else if (/royalt|payment|quality|defect|misprint|unavailable|wrong isbn|overdue|delay/.test(s)) priority='High';
  else if (/status|production|distribution|listing|update/.test(s)) priority='Medium';
  return {category,priority};
}
const knowledge = `BookLeaf Publishing operates in India and the US. Packages: Standard Free and premium Bestseller Breakthrough. Royalties: 80/20 of net profit (MRP less printing, platform commission and shipping), calculated quarterly and paid within 45 days of quarter end; minimum payout ₹1,000 rolls forward; bank transfer to linked account; dashboard has platform breakdown. ISBNs are assigned under BookLeaf's imprint; author-owned imprint requires independently obtained ISBN. ISBN errors are high priority and escalated immediately to production with 48-hour timeline. Printing: in-house Delhi, Repro India, Epitome Books; standard print turnaround 5–7 business days. Verified defects qualify for free reprint; ask for photos. Distribution: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store; listings 7–10 business days after publication; availability stock resync takes 24–48 hours. Production stages: Manuscript Received, Editing (if opted), Cover Design, Typesetting, Proofreading, ISBN Assignment, Printing, Distribution Setup, Published & Live. Metadata changes typically reflect in 3–5 business days. Tone: empathetic, professional, specific, own BookLeaf errors, give a clear timeline and next step. Never invent account facts or dates.`;
export async function classifyAndDraft({subject,description,authorName,bookTitle,bookStatus}) {
  const fallback = ruleClassify(`${subject}\n${description}`);
  if (!process.env.OPENAI_API_KEY) return {...fallback, draft: makeFallbackDraft({subject,description,authorName,bookTitle,bookStatus,category:fallback.category}) , aiMode:'fallback'};
  try {
    const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response = await client.chat.completions.create({model:process.env.OPENAI_MODEL || 'gpt-4o-mini',temperature:0.2,max_tokens:500,
      messages:[{role:'system',content:`You are a BookLeaf Publishing support triage assistant. Use only the policy context below. Return valid JSON with category (one of ${categories.join('; ')}), priority (one of ${priorities.join('; ')}), and draft (a concise empathetic response). Do not invent dates, transactions, or facts. If investigation is needed, promise follow-up within 48 hours. Knowledge base: ${knowledge}`},{role:'user',content:JSON.stringify({authorName,bookTitle,bookStatus,subject,description})}]});
    const raw=response.choices?.[0]?.message?.content || '';
    const parsed=JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim());
    return {category:categories.includes(parsed.category)?parsed.category:fallback.category,priority:priorities.includes(parsed.priority)?parsed.priority:fallback.priority,draft:typeof parsed.draft==='string'?parsed.draft:makeFallbackDraft({subject,description,authorName,bookTitle,bookStatus,category:fallback.category}),aiMode:'openai'};
  } catch (e) {
    return {...fallback,draft:makeFallbackDraft({subject,description,authorName,bookTitle,bookStatus,category:fallback.category}),aiMode:'fallback',aiWarning:'AI provider unavailable; rule-based draft used.'};
  }
}
function makeFallbackDraft({subject,description,authorName,bookTitle,bookStatus,category}) {
  const book=bookTitle?` for “${bookTitle}”`:'';
  let body='Thank you for reaching out. We understand this is important and appreciate you bringing it to our attention. ';
  if(category==='Royalty & Payments') body+='Royalties are calculated quarterly and paid within 45 days of quarter end, provided the accumulated amount meets the ₹1,000 minimum threshold. Please check that your bank details are linked in your dashboard. We will review the royalty details and follow up within 48 hours if an investigation is required. ';
  else if(category==='ISBN & Metadata Issues') body+='We’re sorry for the concern. We will review the book metadata and escalate any ISBN discrepancy to our production team as a high-priority issue. We’ll update you within 48 hours. ';
  else if(category==='Printing & Quality') body+='We’re sorry the copy did not meet expectations. Please share clear photos of the affected pages and binding so our team can verify the issue. Once verified, we will arrange a free reprint; standard print turnaround is 5–7 business days. ';
  else if(category==='Distribution & Availability') body+='A listing that appears unavailable can be caused by a stock synchronisation issue. Our team can request a re-sync, which typically takes 24–48 hours. ';
  else if(category==='Book Status & Production Updates') body+=`The recorded status for this title is ${bookStatus||'under review'}. We’ll check the current production stage and provide a specific update within 48 hours. `;
  else body+='Our support team will review your request and get back to you within 48 hours with the next steps. ';
  return `Dear ${authorName||'Author'},\n\n${body}\n\nNext step: our team will review your query${book} (“${subject}”) and update you here.\n\nWarm regards,\nBookLeaf Author Support`;
}
