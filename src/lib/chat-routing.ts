/** Small deterministic guards used before any generative model call. */
export const EMERGENCY_REPLY = 'Call your local emergency number now. Do not wait for a booking. CareFlow cannot assess emergencies.';

// Intentionally narrow: symptom terms are only a match when framed as happening
// now/to the speaker, or explicitly paired with emergency language.
const emergencyPatterns = [
  /\b(?:i(?:'m| am) having|i have|i feel|experiencing|sudden(?:ly)?|right now.{0,24})\s+(?:severe\s+)?(?:chest pain|difficulty breathing|trouble breathing|shortness of breath|stroke symptoms|heavy bleeding|passed out|loss of consciousness)\b/i,
  /\b(?:chest pain|difficulty breathing|trouble breathing|shortness of breath|heavy bleeding|passed out|loss of consciousness)\b.{0,60}\b(?:emergency|right now|now|urgent)\b/i,
];

export function isEmergencyMessage(text: string): boolean {
  return emergencyPatterns.some(pattern => pattern.test(text));
}

const clinicInfoPatterns = /\b(?:clinic|careflow|physician|fees?|price|cost|hours?|opening|closing|open|close|address|location|insurance|payment|parking|policy|cancell?ation|reschedul(?:e|ing)|notice|no.?show|late cancel|penalt(?:y|ies)|refund|services?|records?|documents?|contact|phone|email|telehealth|walk.?in|accept(?:s|ing)?)\b/i;
const schedulingActionPatterns = /\b(?:(?:please|can you|could you|i(?:'d like to| want to| need to| would like to)|help me|go ahead and)\s+)?(?:book|schedule|cancel|reschedule)\s+(?:(?:me|my|the|an?|that|this)\s+)?(?:(?:this|next)\s+)?(?:\w+\s+)?(?:appointment|appt|booking|slot|visit|consultation)\b|\b(?:check|find|show|see)\s+(?:me\s+)?(?:the\s+)?(?:available slots?|availability|appointment slots?)\b/i;

export type ChatIntent = { emergency: boolean; needsClinicEvidence: boolean; scheduling: boolean };

export function isPureClinicInformationIntent(intent: ChatIntent): boolean {
  return intent.needsClinicEvidence && !intent.scheduling;
}

export function isTerseClinicFaqFollowup(text: string, previousContext = ''): boolean {
  return text.trim().length <= 100 &&
    clinicInfoPatterns.test(previousContext) &&
    /^(?:(?:and\s+)?(?:what|how) about|and|on)\b/i.test(text.trim()) &&
    /\b(?:weekends?|saturdays?|sundays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|holidays?|kids?|children|insurance|parking|fees?|prices?|telehealth|walk.?in|same day)\b/i.test(text);
}

export function clinicKnowledgeQuery(text: string, previousContext = ''): string {
  if (!isTerseClinicFaqFollowup(text, previousContext)) return text;
  return `Prior clinic question: ${previousContext.slice(-250)}\nFollow-up: ${text.slice(0, 250)}`;
}

export function classifyChatIntent(text: string, previousContext = ''): ChatIntent {
  const emergency = isEmergencyMessage(text);
  const scheduling = schedulingActionPatterns.test(text) ||
    /\b(?:i need|i want|can i|could i|please)\s+(?:to\s+)?(?:book|schedule|cancel|reschedule)\b.{0,60}\b(?:appointment|appt|booking|slot|visit)\b/i.test(text) ||
    (text.trim().length <= 80 && /\b(?:appointment|appt|booking|slot|available|availability|book|schedule|reschedule)\b/i.test(previousContext) &&
      /^(?:and\s+)?(?:book|schedule|cancel|reschedule)\s+(?:it|that one|this one|the \w+ one)\b/i.test(text.trim()));
  const terseFaqFollowup = isTerseClinicFaqFollowup(text, previousContext);
  return {
    emergency,
    scheduling,
    needsClinicEvidence: !emergency && (clinicInfoPatterns.test(text) || terseFaqFollowup || (!scheduling && /\b(?:what|which|where|when|how much|do you|are you|is the clinic|does the clinic|can i)\b/i.test(text))),
  };
}

export function unavailableClinicReply(hasSchedulingIntent: boolean): string {
  return hasSchedulingIntent
    ? 'I could not verify the clinic information just now. I can still help with appointment scheduling.'
    : 'I could not verify that clinic information just now. Please contact the clinic directly for confirmation.';
}

export function emergencyDataStreamResponse(): Response {
  const body = `0:${JSON.stringify(EMERGENCY_REPLY)}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'x-vercel-ai-data-stream': 'v1', 'Cache-Control': 'no-cache' },
  });
}
