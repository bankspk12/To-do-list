/**
 * Export Module - PDF & Excel Data Exporter (Tasknest Branding)
 */
window.ExportModule = (function() {
    function exportToPDF() {
        const el = document.getElementById('reportPrintArea') || 
                   document.getElementById('taskList') || 
                   document.querySelector('.container');

        if (!window.html2pdf) return alert('PDF library not ready');

        window.html2pdf().set({
            margin: 0.5,
            filename: `Tasknest_Report_${new Date().toISOString().slice(0,10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }).from(el).save();
    }

    async function exportToExcel() {
        if (!window.XLSX) return alert('Excel library not loaded');
        
        let tasks = [];
        if (window.storageAdapter) {
            tasks = await window.storageAdapter.getTasks();
        }

        const ws = XLSX.utils.aoa_to_sheet([
            ['Tasknest - รายการสิ่งที่ต้องทำ'],
            ['#', 'รายการ', 'หมวดหมู่', 'วันครบกำหนด', 'ประเมินเวลา (ชม.)', 'ความสำคัญ', 'สถานะ'],
            ...tasks.map((t, i) => [
                i + 1, t.text, t.category || 'งาน', t.dueDate || '-', t.estHours || 0, (t.priority || 'medium').toUpperCase(), t.status === 'completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ'
            ])
        ]);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'TasknestReport');
        XLSX.writeFile(wb, `Tasknest_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    return { exportToPDF, exportToExcel };
})();
