import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChatIntent, clinicKnowledgeQuery, EMERGENCY_REPLY, isEmergencyMessage, isPureClinicInformationIntent, unavailableClinicReply } from '../src/lib/chat-routing.ts';
import { formatIstDateTime, istDayBounds } from '../src/lib/clinic-time.ts';

test('emergency preflight catches direct present-tense danger wording', () => {
  assert.equal(isEmergencyMessage('I have chest pain right now'), true);
  assert.equal(isEmergencyMessage('She has heavy bleeding and needs emergency help now'), true);
});

test('emergency preflight does not trigger on incidental or hypothetical mentions', () => {
  assert.equal(isEmergencyMessage('I am writing a story about chest pain'), false);
  assert.equal(isEmergencyMessage('Can I book an appointment for next week?'), false);
  assert.equal(isEmergencyMessage('What are the clinic hours?'), false);
});

test('emergency copy directs immediate local help and tells patients not to wait for booking', () => {
  assert.match(EMERGENCY_REPLY, /call your local emergency number now/i);
  assert.match(EMERGENCY_REPLY, /do not wait for a booking/i);
  assert.doesNotMatch(EMERGENCY_REPLY, /hospital|drive|transport/i);
});

test('mixed clinic policy and appointment requests retrieve public evidence and retain scheduling intent', () => {
  assert.deepEqual(classifyChatIntent('What are your fees, and can I book an appointment?'), {
    emergency: false, scheduling: true, needsClinicEvidence: true,
  });
});

test('short FAQ follow-up uses the preceding clinic topic without classifying a new unrelated question', () => {
  const faqIntent = classifyChatIntent('And Sundays?', 'What are your clinic hours?');
  assert.deepEqual(faqIntent, {
    emergency: false, scheduling: false, needsClinicEvidence: true,
  });
  assert.equal(isPureClinicInformationIntent(faqIntent), true);
  assert.equal(classifyChatIntent('And Sundays?').needsClinicEvidence, false);
  assert.match(clinicKnowledgeQuery('And Sundays?', 'What are your clinic hours?'), /Prior clinic question: What are your clinic hours\?\nFollow-up: And Sundays\?/);
});

test('cancellation policy and notice questions retrieve evidence without invoking appointment actions', () => {
  assert.deepEqual(classifyChatIntent('What is the cancellation policy?'), {
    emergency: false, scheduling: false, needsClinicEvidence: true,
  });
  assert.deepEqual(classifyChatIntent('How much notice should I give if I need to change my booking?'), {
    emergency: false, scheduling: false, needsClinicEvidence: true,
  });
});

test('mixed policy question and explicit cancellation request retrieve and retain scheduling intent', () => {
  const mixedIntent = classifyChatIntent('What is the cancellation policy, and can you cancel my Friday appointment?');
  assert.deepEqual(mixedIntent, {
    emergency: false, scheduling: true, needsClinicEvidence: true,
  });
  assert.equal(isPureClinicInformationIntent(mixedIntent), false);
});

test('brief scheduling follow-ups retain appointment mutation intent when prior context names an appointment', () => {
  const followup = classifyChatIntent('Book that one', 'Can you show me available slots for my appointment?');
  assert.equal(followup.scheduling, true);
  assert.equal(isPureClinicInformationIntent(followup), false);
});

test('no-evidence abstention contains no invented source markers', () => {
  assert.equal(unavailableClinicReply(false).includes('[S1]'), false);
  assert.match(unavailableClinicReply(false), /could not verify/i);
});

test('IST day query bounds include midnight and exclude the next IST midnight', () => {
  assert.deepEqual(istDayBounds('2026-11-18'), {
    start: '2026-11-17T18:30:00.000Z', endExclusive: '2026-11-18T18:30:00.000Z',
  });
  assert.throws(() => istDayBounds('2026-02-30'));
});

test('appointment date formatting is stable in IST regardless of server timezone', () => {
  assert.deepEqual(formatIstDateTime('2026-11-17T18:30:00.000Z'), { date: '2026-11-18', time: '12:00 AM' });
});
