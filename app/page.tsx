"use client";

import { useMemo, useState, Suspense, useEffect, useCallback } from "react";
import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useRouter, useSearchParams } from "next/navigation";
import CsvUploader, { CsvMapping, ParsedCsv } from "./components/ui/CsvUploader";
// Legacy TemplateManager import removed; using TemplateLibrary instead.
import TemplateLibrary from "./components/ui/TemplateLibrary";
import PreviewPane from "./components/ui/PreviewPane";
import CsvTable from "./components/ui/CsvTable";
import AttachmentsUploader, { type AttachIndex } from "./components/ui/AttachmentsUploader";
import Tabs from "./components/ui/Tabs";
import Docs from "./components/sections/Docs";

type RenderedEmail = {
  to: string;
  name?: string;
  subject?: string;
  html: string;
};

type TabId = "csv" | "template" | "preview" | "docs";
type StepConfig = {
  selector: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};

const tabSelector = (id: string) =>
  `[role="tab"][aria-controls="panel-${id}"]`;

const TAB_TUTORIALS: Record<TabId, StepConfig[]> = {
  csv: [
    {
      selector: tabSelector("csv"),
      title: "CSV Workspace",
      description: "Start here to upload your spreadsheet and configure mappings.",
      side: "bottom",
      align: "start",
    },
    {
      selector: "#tutorial-csv-uploader",
      title: "Upload CSV",
      description: "Drop your file or choose from disk. Columns auto-detect for quicker mapping.",
      side: "right",
      align: "start",
    },
    {
      selector: "#tutorial-attachments",
      title: "Match Attachments",
      description: "Optional: associate files per recipient. Diacritic-safe matching is built in.",
      side: "right",
      align: "center",
    },
    {
      selector: "#tutorial-csv-table",
      title: "Review Rows",
      description: "Spot check your data, remap columns, and edit values directly.",
      side: "top",
      align: "start",
    },
  ],
  template: [
    {
      selector: tabSelector("template"),
      title: "Template Tab",
      description: "Switch here to browse saved HTML templates, upload new ones, or edit from scratch.",
      side: "bottom",
      align: "center",
    },
    {
      selector: "#tutorial-template-library",
      title: "Template Library",
      description: "Use raw or visual modes, adjust formatting, and click \"Use this template\" once satisfied.",
      side: "right",
      align: "start",
    },
    {
      selector: "#tutorial-upload-html",
      title: "Upload or Replace HTML",
      description: "Need to tweak an existing file? Upload a fresh HTML export or edit the template inline as needed.",
      side: "right",
      align: "start",
    },
    {
      selector: "#tutorial-email-message",
      title: "Email Message Editor",
      description: "Craft the body, toggle HTML mode, and preview the final email layout inside this surface.",
      side: "left",
      align: "start",
    },
    {
      selector: "#tutorial-insert-variable",
      title: "Insert Variables",
      description: "Drop recipient data wherever you need it—click here to insert placeholders like {{ name }}.",
      side: "bottom",
      align: "end",
    },
  ],
  preview: [
    {
      selector: tabSelector("preview"),
      title: "Preview Tab",
      description: "Everything before send lives here: env checks, recipients, subjects, previews, and batches.",
      side: "bottom",
      align: "center",
    },
    {
      selector: "#tutorial-env-controls",
      title: "Sender Environment",
      description: "Select your system variant, upload/paste a .env override, or reupload credentials before sending.",
      side: "bottom",
      align: "start",
    },
    {
      selector: "#tutorial-recipient-list",
      title: "Recipient Snapshot",
      description: "Double-check who will receive the run—scroll this list to verify every mapped email.",
      side: "right",
      align: "center",
    },
    {
      selector: "#tutorial-subject-editor",
      title: "Subject Controls",
      description: "Change the subject to anything you want and inject variables like {{ name }} on the fly.",
      side: "left",
      align: "start",
    },
    {
      selector: "#tutorial-preview-frame",
      title: "Live Preview",
      description: "Flip through rows to see exactly what each recipient will receive before exporting or sending.",
      side: "left",
      align: "center",
    },
    {
      selector: "#tutorial-batch-preview",
      title: "Batch Planner",
      description: "Batch size adapts automatically—attachments force smaller batches (1 or 3) to respect limits.",
      side: "top",
      align: "start",
    },
  ],
  docs: [
    {
      selector: tabSelector("docs"),
      title: "Documentation Tab",
      description: "Need reminders? This section aggregates tips, FAQ, and troubleshooting steps.",
      side: "bottom",
      align: "center",
    },
    {
      selector: "#tutorial-docs",
      title: "Docs Stack",
      description: "Skim release notes, watch demos, or follow links to advanced workflows.",
      side: "right",
      align: "start",
    },
  ],
};

const buildSteps = (configs: StepConfig[]): DriveStep[] =>
  configs.reduce<DriveStep[]>((acc, { selector, title, description, side, align }) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return acc;
    acc.push({
      element,
      popover: {
        title,
        description,
        side,
        align,
      },
    });
    return acc;
  }, []);

function PageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [template, setTemplate] = useState<string>("<html>\n  <body>\n    <p>Hello {{ name }},</p>\n    <p>This is a sample template. Replace me!</p>\n  </body>\n</html>");
  const [subjectTemplate, setSubjectTemplate] = useState<string>("{{ subject }}");
  const [attachmentsByName, setAttachmentsByName] = useState<AttachIndex>({});
  const [hasSelectedTemplate, setHasSelectedTemplate] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);


  // Keep a derived indicator but avoid unused variable warnings.
  const totalCount = useMemo(() => (csv?.rowCount ?? 0), [csv]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('batchmail_dark');
      const enabled = saved ? saved === '1' : false;
      setDarkMode(enabled);
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (enabled) root.classList.add('dark'); else root.classList.remove('dark');
      }
    } catch {}
  }, []);

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      try { localStorage.setItem('batchmail_dark', next ? '1' : '0'); } catch {}
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (next) root.classList.add('dark'); else root.classList.remove('dark');
      }
      return next;
    });
  };

  const startTabTutorial = useCallback((tabId: TabId) => {
    if (typeof window === "undefined") return;
    const configs = TAB_TUTORIALS[tabId];
    if (!configs || configs.length === 0) return;
    const tabButton = document.querySelector<HTMLButtonElement>(tabSelector(tabId));
    if (tabButton && tabButton.getAttribute("aria-selected") !== "true") {
      tabButton.click();
    }
    requestAnimationFrame(() => {
      const steps = buildSteps(configs);
      if (!steps.length) return;
      driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.55,
        animate: true,
        steps,
      }).drive();
    });
  }, []);

  const onExportJson = async (htmlRender: (row: Record<string, string>) => string) => {
    if (!csv || !mapping) return;
    const nunjucks = await import("nunjucks");
    const payload: RenderedEmail[] = csv.rows
      .filter((r: Record<string, string>) => r[mapping.recipient])
      .map((r: Record<string, string>) => ({
        to: String(r[mapping.recipient]),
        name: r[mapping.name] ? String(r[mapping.name]) : undefined,
        subject: subjectTemplate?.trim()
          ? nunjucks.renderString(subjectTemplate, { ...r, name: r[mapping.name], recipient: r[mapping.recipient] })
          : (mapping.subject ? String(r[mapping.subject]) : undefined),
        html: htmlRender(r),
      }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batchmail-payload.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Global dark/light toggle at top-right */}
      <button
        id="tutorial-dark-toggle"
        type="button"
        onClick={toggleDark}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`fixed top-4 right-4 z-50 rounded-full border p-2 shadow-sm transition ${darkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'}`}
        title={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? (
          // Moon icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M21.752 15.002A9 9 0 0 1 9 2.248a.75.75 0 0 0-.9-.9 10.5 10.5 0 1 0 12.552 12.552.75.75 0 0 0-.9-.898Z" />
          </svg>
        ) : (
          // Sun icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
            <path d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm0 15.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75Zm9-6a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM5.25 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM18.196 5.804a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM7.924 16.076a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 0 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM5.804 5.804a.75.75 0 0 1 1.06 0l1.061 1.06A.75.75 0 0 1 6.864 7.925L5.804 6.864a.75.75 0 0 1 0-1.06Zm10.272 10.272a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.061 1.061l-1.06-1.061a.75.75 0 0 1 0-1.06Z" />
          </svg>
        )}
      </button>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">BatchMail <span className="keep-light-pill text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Beta Test</span></h1>
        <p className="text-sm text-gray-800">Upload CSV, edit/upload Jinja-style HTML template, preview, and export. {totalCount ? `(${totalCount} rows)` : ""}</p>
      </header>

      <div id="tutorial-tabs" className="rounded-xl border bg-white p-4 shadow-sm">
        <Tabs
          items={[
            {
              id: "csv",
              label: "CSV",
              content: (
                <div className="space-y-4" id="tutorial-csv-stack">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => startTabTutorial("csv")}
                      className="text-xs font-semibold rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 hover:bg-gray-100"
                    >
                      CSV Tutorial
                    </button>
                  </div>
                  <section id="tutorial-csv-uploader">
                    <CsvUploader
                      onParsed={(data: { csv: ParsedCsv; mapping: CsvMapping }) => {
                        setCsv(data.csv);
                        setMapping(data.mapping);
                        // Reset template selection on new CSV to reduce mistakes
                        setHasSelectedTemplate(false);
                      }}
                      currentMapping={mapping ?? undefined}
                    />
                  </section>
                  <section id="tutorial-attachments">
                    <AttachmentsUploader
                      csv={csv}
                      mapping={mapping}
                      value={attachmentsByName}
                      onChange={setAttachmentsByName}
                    />
                  </section>
                  <section id="tutorial-csv-table">
                    <CsvTable
                      csv={csv}
                      mapping={mapping}
                      onMappingChange={setMapping}
                      onChange={setCsv}
                    />
                  </section>
                </div>
              ),
            },
            {
              id: "template",
              label: "Template",
              content: (
                <div id="tutorial-template-library">
                  <div className="flex justify-end pb-3">
                    <button
                      type="button"
                      onClick={() => startTabTutorial("template")}
                      className="text-xs font-semibold rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 hover:bg-gray-100"
                    >
                      Template Tutorial
                    </button>
                  </div>
                  <TemplateLibrary
                    availableVars={useMemo(() => {
                      const s = new Set<string>();
                      if (csv?.headers) csv.headers.forEach(h => s.add(h));
                      if (mapping) { s.add("name"); s.add("recipient"); }
                      return Array.from(s);
                    }, [csv, mapping])}
                    initialHtml={template}
                    onUseTemplate={({ html }) => { setTemplate(html); setHasSelectedTemplate(true); }}
                  />
                </div>
              ),
            },
            {
              id: "preview",
              label: "Preview & Export",
              content: (
                <div id="tutorial-preview-pane">
                  <div className="flex justify-end pb-3">
                    <button
                      type="button"
                      onClick={() => startTabTutorial("preview")}
                      className="text-xs font-semibold rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 hover:bg-gray-100"
                    >
                      Preview Tutorial
                    </button>
                  </div>
                  <PreviewPane
                    csv={csv}
                    mapping={mapping}
                    template={template}
                    onExportJson={onExportJson}
                    subjectTemplate={subjectTemplate}
                    onSubjectChange={setSubjectTemplate}
                    attachmentsByName={attachmentsByName}
                  />
                </div>
              ),
            },
            {
              id: "docs",
              label: "Documentation",
              content: (
                <div className="space-y-4" id="tutorial-docs">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => startTabTutorial("docs")}
                      className="text-xs font-semibold rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 hover:bg-gray-100"
                    >
                      Docs Tutorial
                    </button>
                  </div>
                  <Docs />
                </div>
              ),
            },
          ]}
          initialId={(searchParams.get("tab") as string) || "csv"}
          isDisabled={(id) => {
            if (id === 'template') {
              return !csv; // block if no CSV uploaded yet
            }
            if (id === 'preview') {
              // require CSV+mapping and explicit template selection via "Use this template"
              return !csv || !mapping || !hasSelectedTemplate;
            }
            return false;
          }}
          getDisabledTitle={(id) => {
            if (id === 'template' && !csv) return 'Upload a CSV first to configure the template.';
            if (id === 'preview' && (!csv || !mapping)) return 'Upload CSV and set column mapping first.';
            if (id === 'preview' && !hasSelectedTemplate) return 'Choose a template and click "Use this template" first.';
            return undefined;
          }}
          onChange={(id) => {
            const usp = new URLSearchParams(Array.from(searchParams.entries()));
            usp.set("tab", id);
            router.replace(`/?${usp.toString()}`);
          }}
        />
      </div>
    </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PageInner />
    </Suspense>
  );
}
