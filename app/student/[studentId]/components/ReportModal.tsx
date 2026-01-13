'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface AttendanceRecord {
  id: string;
  date: string;
  start_time: string;
  subject: string;
  level: number;
  level_name: string;
  status: string;
}

interface ReportModalProps {
  studentName: string;
  attendanceHistory: AttendanceRecord[];
  onClose: () => void;
}

export default function ReportModal({ studentName, attendanceHistory, onClose }: ReportModalProps) {
  const [selectionMode, setSelectionMode] = useState<'quarter' | 'custom'>('quarter');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const quarters = {
    Q1: { start: '01-01', end: '03-31', label: 'Q1 (Jan - Mar)' },
    Q2: { start: '04-01', end: '06-30', label: 'Q2 (Apr - Jun)' },
    Q3: { start: '07-01', end: '09-30', label: 'Q3 (Jul - Sep)' },
    Q4: { start: '10-01', end: '12-31', label: 'Q4 (Oct - Dec)' },
  };

  const getDateRange = () => {
    if (selectionMode === 'quarter') {
      const q = quarters[selectedQuarter as keyof typeof quarters];
      return {
        start: `${selectedYear}-${q.start}`,
        end: `${selectedYear}-${q.end}`,
        label: `${selectedQuarter} ${selectedYear}`,
      };
    } else {
      return {
        start: startDate,
        end: endDate,
        label: `${startDate} to ${endDate}`,
      };
    }
  };

  const getFilteredRecords = () => {
    const { start, end } = getDateRange();
    return attendanceHistory.filter(record => {
      const recordDate = record.date;
      return recordDate >= start && recordDate <= end && record.status === 'attended';
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const records = getFilteredRecords();
      const { label } = getDateRange();
      const mathCount = records.filter(r => r.subject === 'math').length;
      const englishCount = records.filter(r => r.subject === 'english').length;
      const totalMinutes = records.length * 25;
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246);
      doc.text('Success Academy International', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      doc.text('Learning Progress Report', pageWidth / 2, 35, { align: 'center' });
      
      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 42, pageWidth - margin, 42);
      
      // Student Info
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Student: ${studentName}`, margin, 55);
      doc.text(`Period: ${label}`, margin, 63);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 71);
      
      // Summary Box
      const summaryY = 82;
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, summaryY, contentWidth, 40, 3, 3, 'FD');
      
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text('Summary', margin + 10, summaryY + 12);
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Classes Attended: ${records.length}`, margin + 10, summaryY + 23);
      doc.text(`Math Classes: ${mathCount}`, margin + 10, summaryY + 32);
      doc.text(`English Classes: ${englishCount}`, margin + 80, summaryY + 32);
      doc.text(`Total Learning Time: ${totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}`, margin + 10, summaryY + 41);
      
      // Attendance Table Title
      const tableY = summaryY + 55;
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text('Attendance Record', margin, tableY);
      
      // Table settings
      const colWidths = [45, 35, 35, 55]; // Date, Time, Subject, Level
      const rowHeight = 10;
      const tableStartY = tableY + 8;
      
      // Table Header
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, tableStartY, contentWidth, rowHeight, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      let xPos = margin + 5;
      doc.text('Date', xPos, tableStartY + 7);
      xPos += colWidths[0];
      doc.text('Time', xPos, tableStartY + 7);
      xPos += colWidths[1];
      doc.text('Subject', xPos, tableStartY + 7);
      xPos += colWidths[2];
      doc.text('Level', xPos, tableStartY + 7);
      
      // Table Rows
      doc.setTextColor(60, 60, 60);
      let yPos = tableStartY + rowHeight;
      
      records.forEach((record, index) => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          
          // Redraw header on new page
          doc.setFillColor(59, 130, 246);
          doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
          doc.setTextColor(255, 255, 255);
          xPos = margin + 5;
          doc.text('Date', xPos, yPos + 7);
          xPos += colWidths[0];
          doc.text('Time', xPos, yPos + 7);
          xPos += colWidths[1];
          doc.text('Subject', xPos, yPos + 7);
          xPos += colWidths[2];
          doc.text('Level', xPos, yPos + 7);
          yPos += rowHeight;
          doc.setTextColor(60, 60, 60);
        }
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(margin, yPos, contentWidth, rowHeight, 'F');
        }
        
        // Draw row border
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, yPos + rowHeight, margin + contentWidth, yPos + rowHeight);
        
        // Row content
        doc.setFontSize(9);
        xPos = margin + 5;
        doc.text(formatDate(record.date), xPos, yPos + 7);
        xPos += colWidths[0];
        doc.text(formatTime(record.start_time), xPos, yPos + 7);
        xPos += colWidths[1];
        doc.text(record.subject === 'math' ? 'Math' : 'English', xPos, yPos + 7);
        xPos += colWidths[2];
        doc.text(`L${record.level} - ${record.level_name}`, xPos, yPos + 7);
        
        yPos += rowHeight;
      });
      
      // Table border
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, tableStartY, contentWidth, yPos - tableStartY, 'S');
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: 'center' });
        doc.text('Success Academy International', pageWidth / 2, 292, { align: 'center' });
      }
      
      // Save
      const fileName = `${studentName.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}_Report.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generateWord = async () => {
    setGenerating(true);
    try {
      const records = getFilteredRecords();
      const { label } = getDateRange();
      const mathCount = records.filter(r => r.subject === 'math').length;
      const englishCount = records.filter(r => r.subject === 'english').length;
      const totalMinutes = records.length * 25;
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Success Academy International',
                  bold: true,
                  size: 36,
                  color: '3B82F6',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Learning Progress Report',
                  bold: true,
                  size: 28,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Student Info
            new Paragraph({
              children: [
                new TextRun({ text: 'Student: ', bold: true }),
                new TextRun({ text: studentName }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Period: ', bold: true }),
                new TextRun({ text: label }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Generated: ', bold: true }),
                new TextRun({ text: new Date().toLocaleDateString() }),
              ],
              spacing: { after: 400 },
            }),
            
            // Summary
            new Paragraph({
              children: [
                new TextRun({ text: 'Summary', bold: true, size: 24 }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Total Classes Attended: ${records.length}` }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Math Classes: ${mathCount}    |    English Classes: ${englishCount}` }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Total Learning Time: ${totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}` }),
              ],
              spacing: { after: 400 },
            }),
            
            // Attendance Record Title
            new Paragraph({
              children: [
                new TextRun({ text: 'Attendance Record', bold: true, size: 24 }),
              ],
              spacing: { after: 200 },
            }),
            
            // Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                // Header Row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, color: 'FFFFFF' })] })],
                      shading: { fill: '3B82F6' },
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Time', bold: true, color: 'FFFFFF' })] })],
                      shading: { fill: '3B82F6' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Subject', bold: true, color: 'FFFFFF' })] })],
                      shading: { fill: '3B82F6' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Level', bold: true, color: 'FFFFFF' })] })],
                      shading: { fill: '3B82F6' },
                      width: { size: 35, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                // Data Rows
                ...records.map((record, index) => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatDate(record.date) })] })],
                        shading: index % 2 === 0 ? { fill: 'F8FAFC' } : undefined,
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: formatTime(record.start_time) })] })],
                        shading: index % 2 === 0 ? { fill: 'F8FAFC' } : undefined,
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: record.subject === 'math' ? 'Math' : 'English' })] })],
                        shading: index % 2 === 0 ? { fill: 'F8FAFC' } : undefined,
                      }),
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: `Level ${record.level} - ${record.level_name}` })] })],
                        shading: index % 2 === 0 ? { fill: 'F8FAFC' } : undefined,
                      }),
                    ],
                  })
                ),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}_Report.docx`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error('Word generation error:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const filteredCount = getFilteredRecords().length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">📄 Download Report</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selection Mode */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectionMode('quarter')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              selectionMode === 'quarter'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            By Quarter
          </button>
          <button
            onClick={() => setSelectionMode('custom')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              selectionMode === 'custom'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Quarter Selection */}
        {selectionMode === 'quarter' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quarter</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(quarters).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedQuarter(key)}
                    className={`py-3 rounded-xl font-medium transition-all ${
                      selectedQuarter === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom Date Range */}
        {selectionMode === 'custom' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black"
              />
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-600">
            <strong>{filteredCount}</strong> completed lessons found in this period
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex gap-3">
          <button
            onClick={generatePDF}
            disabled={generating || filteredCount === 0}
            className="flex-1 py-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {generating ? '...' : '📕 PDF'}
          </button>
          <button
            onClick={generateWord}
            disabled={generating || filteredCount === 0}
            className="flex-1 py-3 rounded-xl font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {generating ? '...' : '📘 Word'}
          </button>
        </div>
      </div>
    </div>
  );
}
