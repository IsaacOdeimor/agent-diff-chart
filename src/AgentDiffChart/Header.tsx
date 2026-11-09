import type { AgentSession, FileTrack } from './data';
import { AgentMark } from './icons';
import { formatClock, type Totals } from './model';
import type { Layout } from './scales';
import { RollingNumber, ScramblePath } from './TextMotion';

interface HeaderProps {
  session: AgentSession;
  layout: Layout;
  totals: Totals;
  /** File being edited (latest event, or the first file before any edit lands). */
  currentFile: FileTrack;
  done: boolean;
  reduced: boolean;
}

export function Header({ session, layout, totals, currentFile, done, reduced }: HeaderProps) {
  return (
    <header className="adc-header" style={{ top: layout.headerTop, left: layout.padLeft, right: layout.width - layout.plotRight }}>
      <div className="adc-avatar">
        <AgentMark />
      </div>
      <div className="adc-header-text">
        <div className="adc-title">
          <span className="adc-title-name">{session.agent}</span>
          <span className="adc-title-meta"> · {session.pr}</span>
        </div>
        <div className={`adc-status-row${layout.compact ? ' is-compact' : ''}`}>
          <div className="adc-status" aria-live="off">
            {done ? (
              <span>
                Done · {totals.edits} edits in {formatClock(session.duration)}
              </span>
            ) : (
              <>
                <span>Editing </span>
                <ScramblePath dir={currentFile.dir} name={currentFile.name} reduced={reduced} />
              </>
            )}
          </div>
          <div className="adc-stats">
            <RollingNumber className="adc-stat-add" value={totals.additions} sign="plus" />
            <RollingNumber className="adc-stat-rem" value={totals.removals} sign="minus" />
            <span className="adc-stat-files">
              across <RollingNumber value={totals.files} /> {totals.files === 1 ? 'file' : 'files'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
