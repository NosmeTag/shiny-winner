import { TIME_SLOTS } from '../config/constants.js';

export const formatDate = (str) => {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
};

export const getSlotsInRange = (start, end) => {
    const startIdx = TIME_SLOTS.indexOf(start);
    const endIdx = TIME_SLOTS.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return [];
    return TIME_SLOTS.slice(startIdx, endIdx + 1);
};

export const isPastDate = (dateStr, timeSlot) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    if (!timeSlot) return false; // Handle missing time

    // If same day, check time
    // timeSlot format "HH:MM" or "HH:MM-HH:MM"
    const endTime = timeSlot.includes('-') ? timeSlot.split('-')[1] : timeSlot;
    const [endH, endM] = endTime.split(':').map(Number);

    const slotDate = new Date(now);
    slotDate.setHours(endH, endM, 0, 0);

    return now > slotDate;
};

export const getCurrentTimeSlot = () => {
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentTimeVal = currentH * 60 + currentM;

    for (const slot of TIME_SLOTS) {
        const [start, end] = slot.split('-');
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);

        const startVal = startH * 60 + startM;
        const endVal = endH * 60 + endM;

        // If we are within a slot, return it
        if (currentTimeVal >= startVal && currentTimeVal < endVal) {
            return slot;
        }
        // If we are before the first slot, return the first slot
        if (currentTimeVal < startVal) {
            return slot; // Returns the first upcoming slot
        }
    }
    // If after all slots, return null or the last one? 
    // Let's return null to indicate "no more classes today"
    return null;
};
