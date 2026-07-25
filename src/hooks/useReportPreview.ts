import { useState, useCallback } from 'react';
import { exportReportPdf, ReportSection } from '../utils/pdfReport';

export function useReportPreview() {
  const [report, setReport] = useState<{ title: string; subtitle: string; sections: ReportSection[] } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const showReportPreview = useCallback((title: string, subtitle: string, sections: ReportSection[]) => {
    setReport({ title, subtitle, sections });
  }, []);

  const closeReportPreview = useCallback(() => {
    if (downloading) return;
    setReport(null);
  }, [downloading]);

  const confirmDownload = useCallback(async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await exportReportPdf(report.title, report.subtitle, report.sections);
    } finally {
      setDownloading(false);
      setReport(null);
    }
  }, [report]);

  return { report, downloading, showReportPreview, closeReportPreview, confirmDownload };
}
