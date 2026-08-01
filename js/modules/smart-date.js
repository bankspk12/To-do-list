/**
 * Smart Date Parser - Auto-detects Thai natural language date keywords
 * and converts them to actual dates. Ponytail: minimal NLP, no deps.
 */
window.SmartDateParser = (function () {
    /**
     * Parse Thai natural-language date hints from task text.
     * Returns { date: 'YYYY-MM-DD', label: 'human hint' } or null.
     */
    function parse(text) {
        if (!text) return null;
        const lower = text.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // "วันนี้"
        if (/วันนี้/.test(lower)) {
            return { date: fmt(today), label: 'วันนี้' };
        }

        // "พรุ่งนี้"
        if (/พรุ่งนี้/.test(lower)) {
            const d = addDays(today, 1);
            return { date: fmt(d), label: 'พรุ่งนี้' };
        }

        // "มะรืน" / "มะรืนนี้"
        if (/มะรืน/.test(lower)) {
            const d = addDays(today, 2);
            return { date: fmt(d), label: 'มะรืนนี้' };
        }

        // "อาทิตย์หน้า" / "สัปดาห์หน้า" — next Monday
        if (/อาทิตย์หน้า|สัปดาห์หน้า/.test(lower)) {
            const d = getNextMonday(today);
            return { date: fmt(d), label: 'จันทร์หน้า' };
        }

        // "ภายในอาทิตย์หน้า" / "ภายในสัปดาห์หน้า" — next week's Friday
        if (/ภายใน(อาทิตย์|สัปดาห์)หน้า/.test(lower)) {
            const d = getNextWeekFriday(today);
            return { date: fmt(d), label: 'ศุกร์อาทิตย์หน้า' };
        }

        // "เดือนหน้า" — 1st of next month
        if (/เดือนหน้า/.test(lower)) {
            const d = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            return { date: fmt(d), label: 'ต้นเดือนหน้า' };
        }

        // "สิ้นเดือน" / "สิ้นเดือนนี้" — last day of current month
        if (/สิ้นเดือน/.test(lower)) {
            const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { date: fmt(d), label: 'สิ้นเดือนนี้' };
        }

        // "ศุกร์นี้" / "วันศุกร์" — upcoming Friday
        if (/ศุกร์/.test(lower)) {
            const d = getNextWeekday(today, 5);
            return { date: fmt(d), label: 'ศุกร์นี้' };
        }

        // "จันทร์" — upcoming Monday
        if (/จันทร์/.test(lower) && !/อาทิตย์หน้า/.test(lower)) {
            const d = getNextWeekday(today, 1);
            return { date: fmt(d), label: 'จันทร์นี้' };
        }

        return null;
    }

    function addDays(date, n) {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function getNextMonday(date) {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun
        const daysUntilMon = day === 0 ? 1 : (8 - day);
        d.setDate(d.getDate() + daysUntilMon);
        return d;
    }

    function getNextWeekFriday(date) {
        const mon = getNextMonday(date);
        mon.setDate(mon.getDate() + 4); // Monday + 4 = Friday
        return mon;
    }

    function getNextWeekday(date, targetDay) {
        const d = new Date(date);
        const day = d.getDay();
        let diff = targetDay - day;
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        return d;
    }

    function fmt(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    return { parse };
})();
