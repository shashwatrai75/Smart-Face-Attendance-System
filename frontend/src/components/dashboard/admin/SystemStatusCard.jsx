import PropTypes from 'prop-types';
import { ShieldIcon, WarningIcon } from '../icons';

const Row = ({ ok, label, detail }) => (
  <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
    <span
      className={`mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${ok ? 'bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.28)]' : 'bg-orange-500'}`}
      aria-hidden
    />
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
      <p className="text-xs text-gray-500 dark:text-slate-500">{detail}</p>
    </div>
  </div>
);

Row.propTypes = {
  ok: PropTypes.bool,
  label: PropTypes.string.isRequired,
  detail: PropTypes.string.isRequired,
};

const SystemStatusCard = ({ loading, stats, loadError }) => {
  const hasData = Boolean(stats) && !loadError;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-center gap-2">
        <ShieldIcon className="h-5 w-5 text-violet-600 dark:text-violet-300" />
        <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">System status</h3>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Operational snapshot for admins.</p>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-white/10" />
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-white/10" />
            <div className="h-14 rounded-lg bg-slate-100 dark:bg-white/10" />
          </div>
        ) : loadError ? (
          <div className="flex gap-3 rounded-lg border border-rose-200/80 bg-rose-50/80 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
            <WarningIcon className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
            <div>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-200">Could not refresh stats</p>
              <p className="mt-0.5 text-xs text-rose-700/90 dark:text-rose-300/80">Check your connection and try again.</p>
            </div>
          </div>
        ) : (
          <>
            <Row ok={hasData} label="API & dashboard" detail={hasData ? 'Stats endpoint responding' : 'Waiting for data'} />
            <Row
              ok={(stats?.totalUsers ?? 0) > 0}
              label="User directory"
              detail={`${stats?.totalUsers ?? 0} total users in system`}
            />
            <Row
              ok={(stats?.totalSections ?? 0) > 0}
              label="Sections"
              detail={`${stats?.totalSections ?? 0} sections configured`}
            />
          </>
        )}
      </div>
    </div>
  );
};

SystemStatusCard.propTypes = {
  loading: PropTypes.bool,
  stats: PropTypes.object,
  loadError: PropTypes.bool,
};

export default SystemStatusCard;
