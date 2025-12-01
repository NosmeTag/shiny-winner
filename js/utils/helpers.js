import { TIME_SLOTS } from '../config/constants.js';

export const getSpinnerHtml = (txt) => `<div class="flex items-center justify-center space-x-2"><div class="spinner w-4 h-4 border-2 border-t-transparent"></div><span>${txt}</span></div>`;

export const createTimeOptions = (type) => {
    return TIME_SLOTS.map((t, i) => {
        const [start, end] = t.split('-');
        const label = type === 'start' ? `${start} (${i + 1}º Tempo)` : `${end} (${i + 1}º Tempo)`;
        return `<option value="${t}">${label}</option>`;
    }).join('');
};
