import type { MessageInfo } from "@/types";

interface TerminalPanelProps {
  messages: MessageInfo[];
}

export function TerminalPanel({ messages }: TerminalPanelProps) {
  const hasError = messages.some(m => m.type === "error");
  const hasSuccess = messages.some(m => m.type === "success");
  const statusText = hasError ? "errors" : hasSuccess ? "ok" : "ready";
  const statusColor = hasError ? "var(--error)" : "var(--success)";

  return (
    <section className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-title">~/coeff/output</span>
        <span className="terminal-status" style={{ color: statusColor }}>{statusText}</span>
      </div>
      <div className="terminal-body">
        <div className="terminal-line">
          <span className="terminal-prompt">$</span>
          <span className="terminal-cmd">analyse --notes --verbose</span>
        </div>
        {messages.map((msg, i) => {
          const colonIdx = msg.text.indexOf(":");
          let content: React.ReactNode;
          if (colonIdx !== -1) {
            const prefix = msg.text.substring(0, colonIdx + 1);
            const rest = msg.text.substring(colonIdx + 1);
            content = (
              <>
                <span className={`terminal-prefix ${msg.type}`}>{prefix}</span>
                <span className="terminal-rest">{rest}</span>
              </>
            );
          } else {
            content = <span className="terminal-rest">{msg.text}</span>;
          }
          return (
            <div key={i} className={`terminal-line terminal-output ${msg.type}`}>
              <span className="terminal-text">{content}</span>
            </div>
          );
        })}
        <div className="terminal-line">
          <span className="terminal-prompt">$</span>
          <span className="terminal-cursor">_</span>
        </div>
      </div>
    </section>
  );
}
